import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET /api/tags - List all tags (filtered by tags used in user's companies)
export async function GET() {
  const supabase = await createClient()
  
  // SECURITY: Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  // Get tags that are actually used by user's companies
  // This ensures users only see tags relevant to their data
  const { data: userCompanies } = await supabase
    .from("companies")
    .select("id")
    .eq("owner_id", user.id)
  
  if (!userCompanies || userCompanies.length === 0) {
    return NextResponse.json([])
  }
  
  const companyIds = userCompanies.map(c => c.id)
  
  // Get tag IDs used by user's companies
  const { data: companyTags } = await supabase
    .from("company_tags")
    .select("tag_id")
    .in("company_id", companyIds)
  
  if (!companyTags || companyTags.length === 0) {
    return NextResponse.json([])
  }
  
  const tagIds = [...new Set(companyTags.map(ct => ct.tag_id))]
  
  // Fetch the actual tags
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .in("id", tagIds)
    .order("label")
  
  if (error) {
    console.error("Error fetching tags:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json(data || [])
}

// POST /api/tags - Create a new tag
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  // SECURITY: Verify user is authenticated (tags can be created by any user, but we track who created them)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  try {
    const body = await request.json()
    const { label } = body
    
    if (!label) {
      return NextResponse.json({ error: "label is required" }, { status: 400 })
    }
    
    const { data: tag, error } = await supabase
      .from("tags")
      .insert({ label })
      .select()
      .single()
    
    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Tag already exists" }, { status: 409 })
      }
      console.error("Error creating tag:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json(tag, { status: 201 })
  } catch (error: any) {
    console.error("Error creating tag:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

