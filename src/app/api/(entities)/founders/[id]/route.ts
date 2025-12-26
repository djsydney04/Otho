import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET /api/founders/[id] - Get a single founder with relations
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params
  
  // Get current user to filter companies by owner
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  // SECURITY: First verify that this founder is linked to at least one company owned by the user
  const { data: userCompanies } = await supabase
    .from("companies")
    .select("founder_id")
    .eq("owner_id", user.id)
    .eq("founder_id", id)
    .limit(1)
  
  if (!userCompanies || userCompanies.length === 0) {
    return NextResponse.json({ error: "Founder not found or access denied" }, { status: 404 })
  }
  
  const { data: founder, error } = await supabase
    .from("founders")
    .select(`
      *,
      companies!companies_founder_id_fkey(*),
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
  
  // SECURITY: Filter companies to only show those owned by the current user
  // The founder might be linked to companies from other accounts - we only want user's companies
  const userCompaniesList = (founder.companies || []).filter((company: any) => 
    company.owner_id === user.id
  )
  
  // SECURITY: Filter related data by user ownership
  const filteredCalendarEvents = (founder.calendar_events || []).filter((e: any) => e.user_id === user.id)
  const filteredEmailThreads = (founder.email_threads || []).filter((e: any) => e.user_id === user.id)
  const filteredDriveDocs = (founder.drive_documents || []).filter((d: any) => d.user_id === user.id)
  
  // Sort comments and events by date
  const transformed = {
    ...founder,
    companies: userCompaniesList,
    comments: founder.comments?.sort((a: any, b: any) => 
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
  
  console.log(`[Founders API] Founder ${id} has ${userCompaniesList.length} companies owned by user ${user.id} (total: ${founder.companies?.length || 0})`)
  
  return NextResponse.json(transformed)
}

// PATCH /api/founders/[id] - Update a founder
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params
  
  // SECURITY: Verify founder access
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
  const supabase = await createClient()
  const { id } = await params
  
  // SECURITY: Verify founder access
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

