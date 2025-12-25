import { createServerClient } from "@/lib/supabase/client"

export async function getWorkspaceForUser(clerkUserId: string) {
  const supabase = createServerClient()

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("default_workspace_id")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle()

  if (profileError) {
    console.error("Failed to load profile:", profileError)
    return null
  }

  if (!profile?.default_workspace_id) {
    return null
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, name, plan, fund_enabled")
    .eq("id", profile.default_workspace_id)
    .maybeSingle()

  if (workspaceError) {
    console.error("Failed to load workspace:", workspaceError)
    return null
  }

  return workspace
}
