import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/sign-in", "/sign-up", "/auth/callback"]

// Routes that are accessible during onboarding
const ONBOARDING_ROUTES = ["/onboarding"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Create response to modify
  let response = NextResponse.next({
    request,
  })

  // Create Supabase client with cookie handling
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired
  const { data: { user } } = await supabase.auth.getUser()

  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    // Redirect to home if already authenticated
    if (user && (pathname === "/sign-in" || pathname === "/sign-up")) {
      return NextResponse.redirect(new URL("/", request.url))
    }
    return response
  }

  // Allow static files and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") ||
    pathname.startsWith("/favicon")
  ) {
    return response
  }

  // Not authenticated - redirect to sign-in
  if (!user) {
    const signInUrl = new URL("/sign-in", request.url)
    signInUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(signInUrl)
  }

  // Allow onboarding route for authenticated users
  if (ONBOARDING_ROUTES.some((route) => pathname.startsWith(route))) {
    return response
  }

  // Check onboarding status for authenticated users
  // Note: Full onboarding check is done client-side to avoid additional DB calls in middleware

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
