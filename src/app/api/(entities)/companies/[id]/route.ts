import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET /api/companies/[id] - Get a single company with all relations
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params
  
  // Verify user has access
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: company, error } = await supabase
    .from("companies")
    .select(`
      *,
      founder:founders(*),
      owner:users(*),
      tags:company_tags(tag:tags(*)),
      comments(*, author:users(*)),
      calendar_events(*),
      email_threads(*),
      drive_documents(*),
      custom_fields:company_custom_fields(*)
    `)
    .eq("id", id)
    .single()
  
  // SECURITY: Only allow access if user owns the company
  // No legacy companies without owner_id should be accessible
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  if (company && company.owner_id !== user.id) {
    return NextResponse.json({ error: "Unauthorized - Company does not belong to your account" }, { status: 403 })
  }
  
  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }
    console.error("Error fetching company:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  // SECURITY: Filter related data by user ownership
  // Calendar events, email threads, and drive docs should only show user's data
  const filteredCalendarEvents = (company.calendar_events || []).filter((e: any) => e.user_id === user.id)
  const filteredEmailThreads = (company.email_threads || []).filter((e: any) => e.user_id === user.id)
  const filteredDriveDocs = (company.drive_documents || []).filter((d: any) => d.user_id === user.id)
  
  // Transform nested structures
  const transformed = {
    ...company,
    tags: company.tags?.map((t: any) => t.tag).filter(Boolean) || [],
    comments: company.comments?.sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ) || [],
    calendar_events: filteredCalendarEvents.sort((a: any, b: any) => 
      new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
    ),
    email_threads: filteredEmailThreads.sort((a: any, b: any) => 
      new Date(b.email_date || b.created_at).getTime() - new Date(a.email_date || a.created_at).getTime()
    ),
    drive_documents: filteredDriveDocs,
  }
  
  return NextResponse.json(transformed)
}

// PATCH /api/companies/[id] - Update a company
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params
  
  // Verify user has access to this company
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
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
          author_id: user?.id || null,
        })
      }
      
      updateData.stage = stage
    }
    
    // Verify company access before updating
    const { data: existingCompany } = await supabase
      .from("companies")
      .select("owner_id")
      .eq("id", id)
      .single()
    
    if (existingCompany?.owner_id && existingCompany.owner_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }
    
    // Update company (only if user owns it or it has no owner)
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
  const supabase = await createClient()
  const { id } = await params
  
  // Verify user has access to this company
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  // Verify company access before deleting
  const { data: existingCompany } = await supabase
    .from("companies")
    .select("owner_id")
    .eq("id", id)
    .single()
  
  if (existingCompany?.owner_id && existingCompany.owner_id !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }
  
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

