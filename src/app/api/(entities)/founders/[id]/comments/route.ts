import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET /api/founders/[id]/comments - Get comments for a founder
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params
  
  // SECURITY: Verify founder access (must be linked to user's companies)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  const { data: userCompanies } = await supabase
    .from("companies")
    .select("founder_id")
    .eq("owner_id", user.id)
    .eq("founder_id", id)
    .limit(1)
  
  if (!userCompanies || userCompanies.length === 0) {
    return NextResponse.json({ error: "Founder not found" }, { status: 404 })
  }
  
  const { data, error } = await supabase
    .from("founder_comments")
    .select(`*, author:users(*)`)
    .eq("founder_id", id)
    .order("created_at", { ascending: false })
  
  if (error) {
    console.error("Error fetching founder comments:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json(data || [])
}

// POST /api/founders/[id]/comments - Add a comment to a founder
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params
  
  // SECURITY: Verify founder access and get user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  // Verify founder is linked to user's companies
  const { data: userCompanies } = await supabase
    .from("companies")
    .select("founder_id")
    .eq("owner_id", user.id)
    .eq("founder_id", id)
    .limit(1)
  
  if (!userCompanies || userCompanies.length === 0) {
    return NextResponse.json({ error: "Founder not found" }, { status: 404 })
  }
  
  try {
    const body = await request.json()
    const { content, comment_type = "note" } = body
    
    if (!content) {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 }
      )
    }
    
    const { data: comment, error } = await supabase
      .from("founder_comments")
      .insert({
        founder_id: id,
        content,
        comment_type,
        author_id: user.id,
      })
      .select(`*, author:users(*)`)
      .single()
    
    if (error) {
      console.error("Error creating founder comment:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json(comment, { status: 201 })
  } catch (error: any) {
    console.error("Error creating founder comment:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

