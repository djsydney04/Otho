import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { canCreateContact } from "@/lib/tiers"

// GET /api/founders - List all founders
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search")
  
  // SECURITY: Only show founders that are linked to companies owned by the current user
  // First, get all companies owned by this user
  const { data: userCompanies, error: companiesError } = await supabase
    .from("companies")
    .select("founder_id")
    .eq("owner_id", user.id)
    .not("founder_id", "is", null)
  
  if (companiesError) {
    console.error("Error fetching user companies:", companiesError)
    return NextResponse.json({ error: companiesError.message }, { status: 500 })
  }
  
  // Get unique founder IDs (filter out nulls)
  const founderIds = [...new Set((userCompanies || []).map(c => c.founder_id).filter((id): id is string => Boolean(id)))]
  
  // If no companies, return empty array
  if (founderIds.length === 0) {
    return NextResponse.json([])
  }
  
  // Now fetch founders that are linked to user's companies
  let query = supabase
    .from("founders")
    .select(`
      *,
      drive_documents(*)
    `)
    .in("id", founderIds)
    .order("name")
  
  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error("Error fetching founders:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  console.log(`[Founders API] Found ${data?.length || 0} founders for user ${user.id} (from ${founderIds.length} unique founder IDs)`)
  
  return NextResponse.json(data || [])
}

// POST /api/founders - Create a new founder
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
      email, 
      linkedin, 
      twitter, 
      location, 
      role_title, 
      notes,
      bio,
      previous_companies,
      education,
      domain_expertise,
      source,
      warm_intro_path,
    } = body
    
    if (!name || !email) {
      return NextResponse.json(
        { error: "name and email are required" },
        { status: 400 }
      )
    }
    
    const { data: founder, error } = await supabase
      .from("founders")
      .insert({ 
        name, 
        email, 
        linkedin, 
        twitter, 
        location, 
        role_title, 
        notes,
        bio,
        previous_companies,
        education,
        domain_expertise,
        source,
        warm_intro_path,
      })
      .select()
      .single()
    
    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Founder with this email already exists" },
          { status: 409 }
        )
      }
      console.error("Error creating founder:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json(founder, { status: 201 })
  } catch (error: any) {
    console.error("Error creating founder:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

