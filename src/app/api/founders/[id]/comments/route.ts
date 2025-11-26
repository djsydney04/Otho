import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/client"

// GET /api/founders/[id]/comments - Get comments for a founder
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createServerClient()
  const { id } = await params
  
  const { data, error } = await supabase
    .from("founder_comments")
    .select(`*, author:users(*)`)
    .eq("founder_id", id)
    .order("created_at", { ascending: false })
  
  if (error) {
    console.error("Error fetching founder comments:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json(data)
}

// POST /api/founders/[id]/comments - Add a comment to a founder
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createServerClient()
  const { id } = await params
  
  try {
    const body = await request.json()
    const { content, comment_type = "note", author_id } = body
    
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
        author_id,
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

