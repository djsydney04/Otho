import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * POST /api/companies/custom-fields
 * 
 * Create or update custom fields for a company
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { company_id, fields } = body

    if (!company_id || !Array.isArray(fields)) {
      return NextResponse.json(
        { error: "company_id and fields array are required" },
        { status: 400 }
      )
    }

    // Verify company ownership
    const { data: company } = await supabase
      .from("companies")
      .select("id, owner_id")
      .eq("id", company_id)
      .single()

    if (!company || (company.owner_id && company.owner_id !== user.id)) {
      return NextResponse.json({ error: "Company not found or access denied" }, { status: 404 })
    }

    // Insert custom fields (RLS will enforce ownership via company_id)
    const { error } = await supabase
      .from("company_custom_fields")
      .insert(fields)

    if (error) {
      console.error("Error creating custom fields:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error in custom fields API:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

