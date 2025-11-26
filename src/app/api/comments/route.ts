import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/client"

// GET /api/comments - List comments (optionally filtered by company)
export async function GET(request: NextRequest) {
  const supabase = createServerClient()
  
  const { searchParams } = new URL(request.url)
  const companyId = searchParams.get("company_id")
  
  let query = supabase
    .from("comments")
    .select(`
      *,
      author:users(*)
    `)
    .order("created_at", { ascending: false })
  
  if (companyId) {
    query = query.eq("company_id", companyId)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error("Error fetching comments:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json(data)
}

// POST /api/comments - Add a comment
export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  
  try {
    const body = await request.json()
    const { company_id, content, comment_type = "note", author_id } = body
    
    if (!company_id || !content) {
      return NextResponse.json(
        { error: "company_id and content are required" },
        { status: 400 }
      )
    }
    
    const { data: comment, error } = await supabase
      .from("comments")
      .insert({
        company_id,
        content,
        comment_type,
        author_id,
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
    
    // Update company last_touch
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

