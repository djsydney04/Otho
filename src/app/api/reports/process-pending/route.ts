import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const maxDuration = 300

/**
 * POST /api/reports/process-pending
 * 
 * Process pending reports that were auto-created by the database trigger
 * This endpoint can be called by:
 * - A cron job (e.g., Vercel Cron, GitHub Actions)
 * - Manually from admin panel
 * - On-demand when user visits reports page
 * 
 * Optional auth header for cron jobs:
 * Authorization: Bearer <CRON_SECRET>
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Verify cron secret for automated calls
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    
    let supabase
    let userId: string | null = null

    if (authHeader && cronSecret && authHeader === `Bearer ${cronSecret}`) {
      // Cron job - use service role to process all pending reports
      supabase = await createClient()
      // Process reports for all users
    } else {
      // Manual call - verify user authentication
      supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      
      userId = user.id
    }

    // Get pending reports (filtered by user if not cron)
    // Note: Using 'as any' because reports table may not be in generated types yet
    let query = (supabase as any)
      .from("reports")
      .select(`
        id,
        company_id,
        user_id,
        type,
        company:companies(id, name)
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(5) // Process 5 at a time to avoid timeout

    if (userId) {
      query = query.eq("user_id", userId)
    }

    const { data: pendingReports, error } = await query

    if (error) {
      console.error("Error fetching pending reports:", error)
      return NextResponse.json(
        { error: "Failed to fetch pending reports" },
        { status: 500 }
      )
    }

    if (!pendingReports || pendingReports.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No pending reports to process",
        processed: 0,
      })
    }

    // Process each pending report
    const results = []
    for (const report of pendingReports) {
      try {
        // Call the generate endpoint internally
        const generateResponse = await fetch(
          `${request.nextUrl.origin}/api/reports/generate`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              // Pass through auth if available
              ...(authHeader ? { Authorization: authHeader } : {}),
            },
            body: JSON.stringify({
              company_id: report.company_id,
              type: report.type,
              report_id: report.id, // Pass existing report ID to update instead of create
            }),
          }
        )

        const generateData = await generateResponse.json()

        results.push({
          report_id: report.id,
          company_id: report.company_id,
          company_name: report.company?.name,
          success: generateData.success || false,
          error: generateData.error,
        })
      } catch (error: any) {
        console.error(`Error processing report ${report.id}:`, error)
        results.push({
          report_id: report.id,
          company_id: report.company_id,
          company_name: report.company?.name,
          success: false,
          error: error.message,
        })

        // Mark as failed
        await (supabase as any)
          .from("reports")
          .update({
            status: "failed",
            error_message: error.message,
            updated_at: new Date().toISOString(),
          })
          .eq("id", report.id)
      }
    }

    const successCount = results.filter((r) => r.success).length
    const failureCount = results.filter((r) => !r.success).length

    return NextResponse.json({
      success: true,
      processed: results.length,
      succeeded: successCount,
      failed: failureCount,
      results,
    })
  } catch (error: any) {
    console.error("Error in process-pending:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/reports/process-pending
 * 
 * Check how many pending reports exist
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { count, error } = await (supabase as any)
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .eq("user_id", user.id)

    if (error) {
      console.error("Error counting pending reports:", error)
      return NextResponse.json(
        { error: "Failed to count pending reports" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      pending_count: count || 0,
    })
  } catch (error: any) {
    console.error("Error in GET process-pending:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

