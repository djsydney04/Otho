import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase/client"

// GET /api/news/interests - Get user's interests and available categories
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const supabase = createServerClient()

    // Get all categories
    const { data: categories } = await supabase
      .from("news_categories")
      .select("*")
      .order("sort_order")

    // If logged in, get user's interests
    let userInterests: Record<string, boolean> = {}
    
    if (session?.user?.email) {
      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("email", session.user.email)
        .single()

      if (user) {
        const { data: interests } = await supabase
          .from("user_interests")
          .select("category, enabled")
          .eq("user_id", user.id)

        userInterests = (interests || []).reduce((acc, i) => {
          acc[i.category] = i.enabled ?? true
          return acc
        }, {} as Record<string, boolean>)
      }
    }

    // Return categories with user's enabled state
    const categoriesWithState = (categories || []).map(cat => ({
      ...cat,
      enabled: userInterests[cat.slug] ?? true, // Default to enabled
    }))

    return NextResponse.json({
      categories: categoriesWithState,
    })
  } catch (error) {
    console.error("Error fetching interests:", error)
    return NextResponse.json({ error: "Failed to fetch interests" }, { status: 500 })
  }
}

// POST /api/news/interests - Update user's interests
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { interests } = await request.json()
    // interests: { "venture": true, "tech": false, ... }

    const supabase = createServerClient()

    // Get or create user
    let { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single()

    if (!user) {
      const { data: newUser } = await supabase
        .from("users")
        .insert({
          email: session.user.email,
          name: session.user.name || session.user.email,
        })
        .select("id")
        .single()
      user = newUser
    }

    if (!user) {
      return NextResponse.json({ error: "Failed to get user" }, { status: 500 })
    }

    // Upsert interests
    for (const [category, enabled] of Object.entries(interests)) {
      await supabase
        .from("user_interests")
        .upsert({
          user_id: user.id,
          category,
          enabled: Boolean(enabled),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id,category",
        })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating interests:", error)
    return NextResponse.json({ error: "Failed to update interests" }, { status: 500 })
  }
}

