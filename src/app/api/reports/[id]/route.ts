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
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .select(`
        *,
        company:companies(id, name, logo_url, stage, website, description, founder:founders(*)),
        sections:report_sections(*),
        sources:report_sources(*)
      `)
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (reportError || !report) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 }
      )
    }

    // Sort sections by order_index
    if (report.sections) {
      report.sections.sort((a: any, b: any) => a.order_index - b.order_index)
    }

    return NextResponse.json({ report })
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

    const { error } = await supabase
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

