import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/client"
import type { CompanyInsert } from "@/lib/supabase/types"

// GET /api/companies - List all companies with relations
export async function GET(request: NextRequest) {
  const supabase = createServerClient()
  
  const { searchParams } = new URL(request.url)
  const stage = searchParams.get("stage")
  const search = searchParams.get("search")
  
  let query = supabase
    .from("companies")
    .select(`
      *,
      founder:founders(*),
      owner:users(*),
      tags:company_tags(tag:tags(*))
    `)
    .order("created_at", { ascending: false })
  
  if (stage && stage !== "all") {
    query = query.eq("stage", stage as "Inbound" | "Qualified" | "Diligence" | "Committed" | "Passed")
  }
  
  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error("Error fetching companies:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  // Transform the nested tags structure
  const companies = data?.map(company => ({
    ...company,
    tags: company.tags?.map((t: any) => t.tag).filter(Boolean) || []
  }))
  
  return NextResponse.json(companies)
}

// POST /api/companies - Create a new company
export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  
  try {
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
    
    // Create the company
    const companyData: CompanyInsert = {
      name,
      description,
      website,
      stage,
      founder_id,
      founder_name,
      founder_email,
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
    
    return NextResponse.json(company, { status: 201 })
  } catch (error: any) {
    console.error("Error creating company:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

