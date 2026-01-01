import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/integrations/check?provider=google_calendar
 * 
 * Check if a specific integration is connected
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const provider = searchParams.get("provider")

    if (!provider) {
      return NextResponse.json(
        { error: "provider parameter is required" },
        { status: 400 }
      )
    }

    // Check if integration exists and is enabled
    const { data: integration, error } = await supabase
      .from("integrations")
      .select("*")
      .eq("user_id", user.id)
      .eq("provider", provider)
      .eq("enabled", true)
      .single()

    if (error || !integration) {
      return NextResponse.json({
        connected: false,
        provider,
      })
    }

    // Check if tokens are still valid (not expired)
    const isExpired = integration.token_expires_at
      ? new Date(integration.token_expires_at) < new Date()
      : false

    return NextResponse.json({
      connected: !isExpired,
      provider,
      synced_at: integration.synced_at,
      expires_at: integration.token_expires_at,
    })
  } catch (error: any) {
    console.error("Error checking integration:", error)
    return NextResponse.json(
      { error: error.message || "Failed to check integration" },
      { status: 500 }
    )
  }
}

