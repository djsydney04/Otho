import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/reports
 * 
 * List all reports for the authenticated user
 * Query params:
 * - company_id: Filter by company
 * - type: Filter by report type
 * - status: Filter by status
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get("company_id")
    const type = searchParams.get("type")
    const status = searchParams.get("status")

    // Note: Using 'as any' because reports table may not be in generated types yet
    let query = (supabase as any)
      .from("reports")
      .select(`
        *,
        company:companies(id, name, logo_url, stage),
        sources:report_sources(count)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (companyId) {
      query = query.eq("company_id", companyId)
    }
    if (type) {
      query = query.eq("type", type)
    }
    if (status) {
      query = query.eq("status", status)
    }

    const { data: reports, error } = await query

    if (error) {
      console.error("Error fetching reports:", error)
      return NextResponse.json(
        { error: "Failed to fetch reports" },
        { status: 500 }
      )
    }

    return NextResponse.json({ reports })
  } catch (error: any) {
    console.error("Error in reports API:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

