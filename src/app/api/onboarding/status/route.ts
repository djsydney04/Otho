import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      )
    }
    
    const { data: userData, error } = await supabase
      .from("users")
      .select("onboarding_status, onboarding_step")
      .eq("id", user.id)
      .single()
    
    if (error) {
      // User doesn't exist yet - needs onboarding
      if (error.code === "PGRST116") {
        return NextResponse.json({
          status: "incomplete",
          step: 0,
        })
      }
      throw error
    }
    
    return NextResponse.json({
      status: userData.onboarding_status || "incomplete",
      step: userData.onboarding_step || 0,
    })
  } catch (error: any) {
    console.error("Error checking onboarding status:", error)
    return NextResponse.json(
      { error: error.message || "Failed to check status" },
      { status: 500 }
    )
  }
}
