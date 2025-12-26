import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import type { Database } from "@/lib/supabase/types"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"

  if (code) {
    const cookieStore = await cookies()
    
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Ignore errors from Server Components
            }
          },
        },
      }
    )

    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && sessionData.session) {
      // Get the user to check if they need to be created in the users table
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Extract provider token for Google OAuth
        const providerToken = sessionData.session.provider_token
        const providerRefreshToken = sessionData.session.provider_refresh_token
        const isGoogleProvider = user.app_metadata?.provider === "google" || 
                                  sessionData.session.provider_refresh_token
        
        // Prepare user data - always upsert to ensure user exists
        const userData: any = {
          id: user.id,
          email: user.email!,
          name: user.user_metadata?.full_name || user.email!.split("@")[0],
          avatar_url: user.user_metadata?.avatar_url || null,
          initials: (user.user_metadata?.full_name || user.email!.split("@")[0])
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2),
          updated_at: new Date().toISOString(),
        }
        
        // If this is a Google OAuth and we have tokens, save them
        if (isGoogleProvider && (providerToken || providerRefreshToken)) {
          userData.google_access_token = providerToken || null
          userData.google_refresh_token = providerRefreshToken || null
          if (sessionData.session.expires_at) {
            userData.google_token_expires_at = new Date(sessionData.session.expires_at * 1000).toISOString()
          }
        }
        
        // Check if user exists to determine if we need to set onboarding status
        const { data: existingUser } = await supabase
          .from("users")
          .select("id, onboarding_status")
          .eq("id", user.id)
          .single()
        
        // Set onboarding status for new users only
        if (!existingUser) {
          userData.onboarding_status = "incomplete"
          userData.onboarding_step = 0
        }
        
        // Upsert user record (create or update)
        await supabase
          .from("users")
          .upsert(userData, {
            onConflict: "id",
            ignoreDuplicates: false,
          })
        
        // Create integration records for Google services if this is Google OAuth
        if (isGoogleProvider && (providerToken || providerRefreshToken)) {
          const googleServices = ["google_calendar", "gmail", "google_drive"]
          for (const service of googleServices) {
            await supabase
              .from("integrations")
              .upsert({
                user_id: user.id,
                provider: service,
                access_token: providerToken || null,
                refresh_token: providerRefreshToken || null,
                token_expires_at: sessionData.session.expires_at 
                  ? new Date(sessionData.session.expires_at * 1000).toISOString()
                  : null,
                enabled: true,
                synced_at: new Date().toISOString(),
              }, {
                onConflict: "user_id,provider"
              })
          }
        }
      }

      const forwardedHost = request.headers.get("x-forwarded-host")
      const isLocalEnv = process.env.NODE_ENV === "development"
      
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // Return to sign-in with error if something went wrong
  return NextResponse.redirect(`${origin}/sign-in?error=auth_callback_error`)
}
