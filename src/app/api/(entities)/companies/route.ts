/**
 * Companies API Route
 * 
 * Handles CRUD operations for companies in the deal pipeline.
 * 
 * Endpoints:
 * - GET  /api/companies - List all companies for the current user
 * - POST /api/companies - Create a new company
 * 
 * Security:
 * - Row Level Security (RLS) automatically filters by owner_id
 * - See migration 006_add_rls_policies.sql for RLS policies
 * - Tier limits enforced (Hobby: 25 contacts, Pro: unlimited)
 * 
 * Features:
 * - Auto-creates founders if provided (then links by UUID)
 * - Generates AI analysis in background (non-blocking)
 * - Adds creation comment to timeline
 * - Supports filtering by stage, tag, and search query
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateCompanyAnalysis, isAIConfigured, type CompanyContext } from "@/lib/ai"
import type { CompanyInsert } from "@/lib/supabase/types"
import { canCreateContact } from "@/lib/tiers"

/**
 * Generate AI Analysis in Background
 * 
 * This function runs asynchronously after company creation to generate
 * an AI-powered analysis of the company. It's non-blocking so the user
 * doesn't have to wait for it.
 * 
 * The analysis includes:
 * - Market opportunity assessment
 * - Team evaluation
 * - Product/technology review
 * - Competitive landscape
 * - Investment thesis
 * 
 * @param companyId - UUID of the company
 * @param context - Company data for analysis
 */
async function generateAnalysisInBackground(companyId: string, context: CompanyContext) {
  try {
    if (!isAIConfigured()) {
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

/**
 * GET /api/companies
 * 
 * List all companies for the authenticated user.
 * RLS automatically filters to only show user's own companies.
 * 
 * Query Parameters:
 * - stage: Filter by pipeline stage (Inbound, Qualified, etc.)
 * - tag_id: Filter by tag UUID
 * - search: Search in company name and description
 * 
 * Returns:
 * - Array of companies with relations (founder, tags, comments)
 * - Ordered by created_at DESC (newest first)
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  
  try {
    const { searchParams } = new URL(request.url)
    const stage = searchParams.get("stage")
    const tagId = searchParams.get("tag_id")
    const search = searchParams.get("search")
    
    // RLS automatically filters by owner_id = auth.uid()
    // No need to manually check user or add .eq("owner_id", user.id)
    const { data: companies, error } = await supabase
      .from("companies")
      .select(`
        *,
        founder:founders(*),
        tags:company_tags(tag:tags(*)),
        comments:comments(*)
      `)
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
    
    let filteredCompanies = companies || []

    // Apply client-side filters (could be moved to SQL for better performance)
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

    return NextResponse.json(filteredCompanies)
  } catch (error: any) {
    console.error("Error in GET /api/companies:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/companies
 * 
 * Create a new company in the deal pipeline.
 * RLS automatically sets owner_id to the authenticated user.
 * 
 * Request Body:
 * - name: Company name (required)
 * - description: What the company does
 * - website: Company website URL
 * - stage: Pipeline stage (default: "Inbound")
 * - founder_id: Link to existing founder by UUID (optional)
 * - founder: Founder data object to create new founder (optional)
 *   - name: Founder name (required if founder provided)
 *   - email: Founder email (required if founder provided)
 *   - role_title, linkedin, twitter, etc.
 * - tags: Array of tag UUIDs
 * - owner: Owner name (optional)
 * - is_priority: Boolean (optional)
 * - needs_diligence: Boolean (optional)
 * - needs_followup: Boolean (optional)
 * 
 * Flow:
 * 1. Check tier limits (Hobby: 25 contacts max)
 * 2. If founder data provided, create founder first, then link by UUID
 * 3. Create company with founder_id (only UUID, no founder data stored)
 * 4. Link tags if provided
 * 5. Add creation comment to timeline
 * 6. Generate AI analysis in background (non-blocking)
 * 
 * Returns:
 * - 201: Created company object with founder relation
 * - 403: Tier limit reached
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  try {
    // Get current user for tier check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // ==================== TIER ENFORCEMENT ====================
    // Check contact limits before creating
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
      founder: founderData, // New: Accept founder object to create
      tags = [],
      owner,
      is_priority,
      needs_diligence,
      needs_followup,
    } = body
    
    // ==================== FOUNDER HANDLING ====================
    // Strategy: Always create founders first (if needed), then link by UUID
    // Companies table only stores founder_id (UUID reference), never founder data
    
    let founder_id: string | null = providedFounderId || null
    
    // If founder data provided, create or find founder first
    if (!founder_id && founderData) {
      const { name: founderName, email: founderEmail, ...founderFields } = founderData
      
      if (!founderEmail) {
        return NextResponse.json(
          { error: "Founder email is required when creating a founder" },
          { status: 400 }
        )
      }
      
      if (!founderName) {
        return NextResponse.json(
          { error: "Founder name is required when creating a founder" },
          { status: 400 }
        )
      }
      
      // Check if founder already exists by email
      const { data: existingFounder } = await supabase
        .from("founders")
        .select("id")
        .eq("email", founderEmail)
        .single()
      
      if (existingFounder) {
        // Founder exists, use their ID
        founder_id = existingFounder.id
        console.log(`[Companies API] Found existing founder ${founder_id} for email ${founderEmail}`)
      } else {
        // Founder doesn't exist, create new one
        // Check tier limit again (founder counts as a contact)
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

        // Create the new founder with all provided fields
        const { data: newFounder, error: founderError } = await supabase
          .from("founders")
          .insert({ 
            name: founderName,
            email: founderEmail,
            role_title: founderFields.role_title || undefined,
            linkedin: founderFields.linkedin || undefined,
            twitter: founderFields.twitter || undefined,
            location: founderFields.location || undefined,
            bio: founderFields.bio || undefined,
            previous_companies: founderFields.previous_companies || undefined,
            education: founderFields.education || undefined,
            domain_expertise: founderFields.domain_expertise || undefined,
            source: founderFields.source || undefined,
            warm_intro_path: founderFields.warm_intro_path || undefined,
            notes: founderFields.notes || undefined,
          })
          .select("id")
          .single()
        
        if (founderError) {
          console.error("Error creating founder:", founderError)
          return NextResponse.json(
            { error: `Failed to create founder: ${founderError.message}` },
            { status: 500 }
          )
        }
        
        founder_id = newFounder.id
        console.log(`[Companies API] Created new founder ${founder_id} for email ${founderEmail}`)
      }
    }
    
    // ==================== CREATE COMPANY ====================
    // RLS automatically sets owner_id to auth.uid()
    // Only store founder_id (UUID), never store founder data in companies table
    const companyData: CompanyInsert = {
      name,
      description: description || undefined,
      website: website || undefined,
      stage,
      founder_id, // Only UUID reference, no founder data
      owner_id: user.id, // Still pass for type safety, RLS will enforce
      owner: owner || undefined,
      is_priority: is_priority || undefined,
      needs_diligence: needs_diligence || undefined,
      needs_followup: needs_followup || undefined,
    }
    
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert(companyData)
      .select(`
        *,
        founder:founders(*)
      `)
      .single()
    
    if (companyError) {
      console.error("Error creating company:", companyError)
      return NextResponse.json({ error: companyError.message }, { status: 500 })
    }
    
    // ==================== ADD RELATIONS ====================
    // Add tags if provided (RLS checks ownership via company_id)
    if (tags.length > 0 && company) {
      const tagLinks = tags.map((tag_id: string) => ({
        company_id: company.id,
        tag_id,
      }))
      
      await supabase.from("company_tags").insert(tagLinks)
    }
    
    // Add creation comment (RLS checks ownership via company_id)
    await supabase.from("comments").insert({
      company_id: company.id,
      content: `Added ${name} to pipeline.`,
      comment_type: "note",
    })
    
    // Generate AI analysis in background (non-blocking)
    if (company && isAIConfigured()) {
      const context: CompanyContext = {
        name: company.name,
        description: company.description || "",
        website: company.website || undefined,
        stage: company.stage,
        founderName: company.founder?.name || undefined,
        founderEmail: company.founder?.email || undefined,
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
