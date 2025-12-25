import { createServerClient } from "@/lib/supabase/client"
import { getAuthenticatedUser } from "@/lib/clerk"

export async function requireGoogleAccessToken() {
  const user = await getAuthenticatedUser()
  if (!user) {
    return { error: "Not authenticated" }
  }

  const primaryEmail = user.emailAddresses?.[0]?.emailAddress
  if (!primaryEmail) {
    return { error: "Missing email" }
  }

  const supabase = createServerClient()
  const { data: dbUser } = await supabase
    .from("users")
    .select("google_access_token, google_refresh_token")
    .eq("email", primaryEmail)
    .maybeSingle()

  if (!dbUser?.google_access_token) {
    return { error: "Google account not connected" }
  }

  return {
    accessToken: dbUser.google_access_token,
    refreshToken: dbUser.google_refresh_token,
    email: primaryEmail,
  }
}
