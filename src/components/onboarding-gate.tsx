"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"

interface OnboardingGateProps {
  children: React.ReactNode
}

// Routes that don't require onboarding check
const PUBLIC_ROUTES = ["/onboarding", "/sign-in", "/sign-up", "/auth"]

export function OnboardingGate({ children }: OnboardingGateProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      // Skip check for public routes
      if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
        setChecking(false)
        return
      }

      try {
        const supabase = createBrowserSupabaseClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        // If there's an auth error or no user, redirect to sign-in
        if (authError || !user) {
          router.push("/sign-in")
          return
        }

        // Check onboarding status
        const { data: userData, error: dbError } = await supabase
          .from("users")
          .select("onboarding_status")
          .eq("id", user.id)
          .single()

        // If user doesn't exist in database, create them as a fallback
        if (dbError && dbError.code === "PGRST116") {
          // User not found - create them
          const { error: insertError } = await supabase
            .from("users")
            .insert({
              id: user.id,
              email: user.email!,
              name: user.user_metadata?.full_name || user.email!.split("@")[0],
              avatar_url: user.user_metadata?.avatar_url,
              initials: (user.user_metadata?.full_name || user.email!.split("@")[0])
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2),
              onboarding_status: "incomplete",
              onboarding_step: 0,
            })
          
          if (!insertError) {
            // Successfully created, redirect to onboarding
            router.push("/onboarding")
            return
          } else {
            console.error("Error creating user record:", insertError)
          }
        }

        // If user exists but onboarding is incomplete, redirect to onboarding
        if (userData?.onboarding_status !== "complete") {
          // Only redirect if we're not already on onboarding
          if (pathname !== "/onboarding") {
            router.push("/onboarding")
            return
          }
        } else if (userData?.onboarding_status === "complete" && pathname === "/onboarding") {
          // If completed but on onboarding page, redirect to home
          router.push("/")
          return
        }
      } catch (error) {
        console.error("Error checking auth:", error)
        // On any error, redirect to sign-in
        router.push("/sign-in")
        return
      } finally {
        setChecking(false)
      }
    }

    checkAuth()
  }, [pathname, router])

  // Show loading while checking for authenticated non-public routes
  if (checking && !PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}
