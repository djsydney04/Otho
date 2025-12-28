import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET /api/comments - List comments (optionally filtered by company)
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  
  // SECURITY: Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  const { searchParams } = new URL(request.url)
  const companyId = searchParams.get("company_id")
  
  // If company_id provided, verify ownership
  if (companyId) {
    const { data: company } = await supabase
      .from("companies")
      .select("owner_id")
      .eq("id", companyId)
      .single()
    
    if (!company || company.owner_id !== user.id) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }
    
    // Company-specific query
    const { data, error } = await supabase
      .from("comments")
      .select(`
        *,
        author:users(*)
      `)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
    
    if (error) {
      console.error("Error fetching comments:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json(data || [])
  } else {
    // No company filter - only show comments on user's companies
    // Get all user's company IDs
    const { data: userCompanies } = await supabase
      .from("companies")
      .select("id")
      .eq("owner_id", user.id)
    
    if (!userCompanies || userCompanies.length === 0) {
      return NextResponse.json([])
    }
    
    const companyIds = userCompanies.map(c => c.id)
    
    const { data, error } = await supabase
      .from("comments")
      .select(`
        *,
        author:users(*)
      `)
      .in("company_id", companyIds)
      .order("created_at", { ascending: false })
    
    if (error) {
      console.error("Error fetching comments:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json(data || [])
  }
}

// POST /api/comments - Add a comment
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  try {
    // SECURITY: Get current user from Supabase Auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const body = await request.json()
    const { company_id, content, comment_type = "note" } = body
    
    if (!company_id || !content) {
      return NextResponse.json(
        { error: "company_id and content are required" },
        { status: 400 }
      )
    }
    
    // SECURITY: Verify company ownership before allowing comment
    const { data: company } = await supabase
      .from("companies")
      .select("owner_id")
      .eq("id", company_id)
      .single()
    
    if (!company || company.owner_id !== user.id) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }
    
    const { data: comment, error } = await supabase
      .from("comments")
      .insert({
        company_id,
        content,
        comment_type,
        author_id: user.id,
      })
      .select(`
        *,
        author:users(*)
      `)
      .single()
    
    if (error) {
      console.error("Error creating comment:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // Update company last_touch (only for user comments, not AI comments)
    await supabase
      .from("companies")
      .update({ last_touch: new Date().toISOString() })
      .eq("id", company_id)
    
    return NextResponse.json(comment, { status: 201 })
  } catch (error: any) {
    console.error("Error creating comment:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

