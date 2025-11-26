import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/client"

// GET /api/companies/[id] - Get a single company with all relations
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createServerClient()
  const { id } = await params
  
  const { data: company, error } = await supabase
    .from("companies")
    .select(`
      *,
      founder:founders(*),
      owner:users(*),
      tags:company_tags(tag:tags(*)),
      comments(*, author:users(*)),
      calendar_events(*),
      email_threads(*)
    `)
    .eq("id", id)
    .single()
  
  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }
    console.error("Error fetching company:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  // Transform nested structures
  const transformed = {
    ...company,
    tags: company.tags?.map((t: any) => t.tag).filter(Boolean) || [],
    comments: company.comments?.sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ) || [],
    calendar_events: company.calendar_events?.sort((a: any, b: any) => 
      new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
    ) || [],
    email_threads: company.email_threads?.sort((a: any, b: any) => 
      new Date(b.email_date || b.created_at).getTime() - new Date(a.email_date || a.created_at).getTime()
    ) || [],
  }
  
  return NextResponse.json(transformed)
}

// PATCH /api/companies/[id] - Update a company
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createServerClient()
  const { id } = await params
  
  try {
    const body = await request.json()
    const { stage, tags, ...updateData } = body
    
    // If stage is changing, add a comment
    if (stage) {
      const { data: currentCompany } = await supabase
        .from("companies")
        .select("stage, name")
        .eq("id", id)
        .single()
      
      if (currentCompany && currentCompany.stage !== stage) {
        await supabase.from("comments").insert({
          company_id: id,
          content: `Moved to ${stage}.`,
          comment_type: "stage_change",
        })
      }
      
      updateData.stage = stage
    }
    
    // Update company
    const { data: company, error } = await supabase
      .from("companies")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()
    
    if (error) {
      console.error("Error updating company:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // Update tags if provided
    if (tags !== undefined) {
      // Remove existing tags
      await supabase.from("company_tags").delete().eq("company_id", id)
      
      // Add new tags
      if (tags.length > 0) {
        const tagLinks = tags.map((tag_id: string) => ({
          company_id: id,
          tag_id,
        }))
        await supabase.from("company_tags").insert(tagLinks)
      }
    }
    
    return NextResponse.json(company)
  } catch (error: any) {
    console.error("Error updating company:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/companies/[id] - Delete a company
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createServerClient()
  const { id } = await params
  
  const { error } = await supabase
    .from("companies")
    .delete()
    .eq("id", id)
  
  if (error) {
    console.error("Error deleting company:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json({ success: true })
}

