import { createServerClient } from "@/lib/supabase/client"

export async function getOnboardingStatus(clerkUserId: string) {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from("onboarding")
    .select("status, selected_plan, workspace_id")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle()

  if (error) {
    console.error("Failed to load onboarding status:", error)
    return null
  }

  return data
}
