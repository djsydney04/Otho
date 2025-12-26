import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateCompanyAnalysis, isGeminiConfigured, type CompanyContext } from "@/lib/integrations/gemini"
import type { CompanyInsert } from "@/lib/supabase/types"
import { canCreateContact } from "@/lib/tiers"

// Helper function to generate AI analysis in background (non-blocking)
async function generateAnalysisInBackground(companyId: string, context: CompanyContext) {
  try {
    if (!isGeminiConfigured()) {
      console.log("[AI Analysis] Gemini not configured, skipping")
      return
    }

    const analysis = await generateCompanyAnalysis(context)
    
    const supabase = await createClient()
    await supabase
      .from("companies")
      .update({
        ai_analysis: analysis,
        ai_analysis_updated_at: new Date().toISOString(),
      })
      .eq("id", companyId)
    
    console.log(`[AI Analysis] Generated and saved analysis for company ${companyId}`)
  } catch (error) {
    console.error("[AI Analysis] Error generating analysis:", error)
  }
}

// GET /api/companies - List all companies
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  
  try {
    const { searchParams } = new URL(request.url)
    const stage = searchParams.get("stage")
    const tagId = searchParams.get("tag_id")
    const search = searchParams.get("search")
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // SECURITY: Only show companies owned by the current user
    // This is a CRM - each account should only see their own data
    const { data: companies, error } = await supabase
      .from("companies")
      .select(`
        *,
        founder:founders(*),
        tags:company_tags(tag:tags(*)),
        comments:comments(*)
      `)
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
    
    if (error) {
      console.error("Error fetching companies:", error)
      return NextResponse.json(
        { 
          error: "Failed to fetch companies", 
          details: error.message 
        }, 
        { status: 500 }
      )
    }
    
    console.log(`[Companies API] Found ${companies?.length || 0} companies for user ${user.id}`)
    
    // If we got some companies, log a sample
    if (companies && companies.length > 0) {
      console.log(`[Companies API] Sample company IDs: ${companies.slice(0, 3).map((c: any) => c.id).join(', ')}`)
      console.log(`[Companies API] Sample owner_ids: ${companies.slice(0, 3).map((c: any) => c.owner_id || 'null').join(', ')}`)
    }
    
    let filteredCompanies = companies || []

    // Apply filters
    if (stage) {
      filteredCompanies = filteredCompanies.filter((c: any) => c.stage === stage)
    }
    
    if (search) {
      const searchLower = search.toLowerCase()
      filteredCompanies = filteredCompanies.filter((c: any) =>
        c.name?.toLowerCase().includes(searchLower) ||
        c.description?.toLowerCase().includes(searchLower)
      )
    }
    
    if (tagId) {
      filteredCompanies = filteredCompanies.filter((company: any) =>
        company.tags?.some((tagLink: any) => tagLink.tag?.id === tagId)
      )
    }

    console.log(`[Companies API] Returning ${filteredCompanies.length} companies after filtering (stage: ${stage || 'all'}, search: ${search || 'none'}, tagId: ${tagId || 'none'})`)
    return NextResponse.json(filteredCompanies)
  } catch (error: any) {
    console.error("Error in GET /api/companies:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/companies - Create a new company
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Tier enforcement: Check contact limits
    const tierCheck = await canCreateContact(user.id, supabase)
    if (!tierCheck.allowed) {
      return NextResponse.json(
        { 
          error: tierCheck.reason || "Contact limit reached",
          requiresUpgrade: true,
          tier: "hobby"
        },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    const { 
      name, 
      description, 
      website, 
      stage = "Inbound",
      founder_id: providedFounderId,
      founder_name,
      founder_email,
      tags = []
    } = body
    
    // Use provided founder_id or create/find founder
    let founder_id: string | null = providedFounderId || null
    
    // If no founder_id but we have email, try to find or create
    if (!founder_id && founder_email) {
      // Check if founder exists
      const { data: existingFounder } = await supabase
        .from("founders")
        .select("id")
        .eq("email", founder_email)
        .single()
      
      if (existingFounder) {
        founder_id = existingFounder.id
      } else if (founder_name) {
        // Check tier again for founder creation (counts toward contact limit)
        const founderTierCheck = await canCreateContact(user.id, supabase)
        if (!founderTierCheck.allowed) {
          return NextResponse.json(
            { 
              error: founderTierCheck.reason || "Contact limit reached",
              requiresUpgrade: true,
              tier: "hobby"
            },
            { status: 403 }
          )
        }

        // Create new founder
        const { data: newFounder, error: founderError } = await supabase
          .from("founders")
          .insert({ name: founder_name, email: founder_email })
          .select("id")
          .single()
        
        if (founderError) {
          console.error("Error creating founder:", founderError)
        } else {
          founder_id = newFounder.id
        }
      }
    }
    
    // Create the company with owner automatically assigned
    const companyData: CompanyInsert = {
      name,
      description,
      website,
      stage,
      founder_id,
      founder_name,
      founder_email,
      owner_id: user.id,
    }
    
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert(companyData)
      .select()
      .single()
    
    if (companyError) {
      console.error("Error creating company:", companyError)
      return NextResponse.json({ error: companyError.message }, { status: 500 })
    }
    
    // Add tags if provided
    if (tags.length > 0 && company) {
      const tagLinks = tags.map((tag_id: string) => ({
        company_id: company.id,
        tag_id,
      }))
      
      await supabase.from("company_tags").insert(tagLinks)
    }
    
    // Add creation comment
    await supabase.from("comments").insert({
      company_id: company.id,
      content: `Added ${name} to pipeline.`,
      comment_type: "note",
    })
    
    // Generate AI analysis in background (non-blocking)
    if (company && isGeminiConfigured()) {
      const context: CompanyContext = {
        name: company.name,
        description: company.description || "",
        website: company.website || undefined,
        stage: company.stage,
        founderName: company.founder_name || undefined,
        founderEmail: company.founder_email || undefined,
        tags: [],
        comments: [],
        calendarEvents: [],
        emailThreads: [],
      }
      
      // Don't await - run in background
      generateAnalysisInBackground(company.id, context).catch(console.error)
    }
    
    return NextResponse.json(company, { status: 201 })
  } catch (error: any) {
    console.error("Error creating company:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
