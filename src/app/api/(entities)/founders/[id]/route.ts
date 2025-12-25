import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/client"

// GET /api/founders/[id] - Get a single founder with relations
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createServerClient()
  const { id } = await params
  
  const { data: founder, error } = await supabase
    .from("founders")
    .select(`
      *,
      companies(*),
      comments:founder_comments(*, author:users(*)),
      calendar_events(*),
      email_threads(*),
      drive_documents(*),
      custom_fields:founder_custom_fields(*)
    `)
    .eq("id", id)
    .single()
  
  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Founder not found" }, { status: 404 })
    }
    console.error("Error fetching founder:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  // Sort comments and events by date
  const transformed = {
    ...founder,
    comments: founder.comments?.sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ) || [],
    calendar_events: founder.calendar_events?.sort((a: any, b: any) => 
      new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
    ) || [],
    email_threads: founder.email_threads?.sort((a: any, b: any) => 
      new Date(b.email_date || b.created_at).getTime() - new Date(a.email_date || a.created_at).getTime()
    ) || [],
  }
  
  return NextResponse.json(transformed)
}

// PATCH /api/founders/[id] - Update a founder
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createServerClient()
  const { id } = await params
  
  try {
    const body = await request.json()
    
    const { data: founder, error } = await supabase
      .from("founders")
      .update(body)
      .eq("id", id)
      .select()
      .single()
    
    if (error) {
      console.error("Error updating founder:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json(founder)
  } catch (error: any) {
    console.error("Error updating founder:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/founders/[id] - Delete a founder
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createServerClient()
  const { id } = await params
  
  const { error } = await supabase
    .from("founders")
    .delete()
    .eq("id", id)
  
  if (error) {
    console.error("Error deleting founder:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json({ success: true })
}

