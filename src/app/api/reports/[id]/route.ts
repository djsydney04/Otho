import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/reports/[id]
 * 
 * Get a specific report with all sections and sources
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Fetch report with all related data
    // Note: Using simpler query to avoid TypeScript deep instantiation issues
    // Cast supabase to any to bypass strict table type checking for reports table
    const { data: report, error: reportError } = await (supabase as any)
      .from("reports")
      .select("*, sections:report_sections(*), sources:report_sources(*)")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()
    
    // Fetch company separately to avoid deep type nesting
    let company = null
    if (report?.company_id) {
      const { data: companyData } = await supabase
        .from("companies")
        .select("id, name, logo_url, stage, website, description, founder_id")
        .eq("id", report.company_id)
        .single()
      
      if (companyData?.founder_id) {
        const { data: founder } = await supabase
          .from("founders")
          .select("*")
          .eq("id", companyData.founder_id)
          .single()
        company = { ...companyData, founder }
      } else {
        company = companyData
      }
    }

    if (reportError || !report) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 }
      )
    }

    // Sort sections by order_index
    if (report.sections) {
      (report.sections as any[]).sort((a: any, b: any) => a.order_index - b.order_index)
    }

    return NextResponse.json({ report: { ...report, company } })
  } catch (error: any) {
    console.error("Error fetching report:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/reports/[id]
 * 
 * Delete a report
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const { error } = await (supabase as any)
      .from("reports")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) {
      console.error("Error deleting report:", error)
      return NextResponse.json(
        { error: "Failed to delete report" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error in delete report:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

