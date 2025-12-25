import { NextRequest, NextResponse } from "next/server"

// GET /api/searches - Get user's saved searches
export async function GET() {
  try {
    // For now, return from localStorage-based approach
    // In production, you'd save these to a user_searches table
    return NextResponse.json({
      searches: [],
      suggested: [
        { id: "s1", query: "AI funding rounds 2024", category: "ai" },
        { id: "s2", query: "Defense tech startups", category: "defense" },
        { id: "s3", query: "Climate tech IPO", category: "climate" },
        { id: "s4", query: "Fintech regulation", category: "fintech" },
        { id: "s5", query: "Seed stage valuations", category: "venture" },
      ],
    })
  } catch (error) {
    console.error("Error fetching searches:", error)
    return NextResponse.json({ error: "Failed to fetch searches" }, { status: 500 })
  }
}

// POST /api/searches - Save a new search
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, category } = body

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 })
    }

    // For now, just return success
    // In production, save to database
    return NextResponse.json({
      success: true,
      search: {
        id: `search-${Date.now()}`,
        query,
        category: category || "general",
        createdAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("Error saving search:", error)
    return NextResponse.json({ error: "Failed to save search" }, { status: 500 })
  }
}
