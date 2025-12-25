import { NextRequest, NextResponse } from "next/server"
import { 
  exaSearch, 
  exaFindSimilar, 
  isExaConfigured, 
  WEBSET_CONFIGS, 
  ALL_PREMIUM_SOURCES,
  getSourcesForCategory,
} from "@/lib/exa"

// GET /api/exa - Search or get webset results
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")
    const websetId = searchParams.get("webset")
    const limit = parseInt(searchParams.get("limit") || "15")
    const days = parseInt(searchParams.get("days") || "7")

    if (!isExaConfigured()) {
      return NextResponse.json({
        error: "EXA_API_KEY not configured",
        configured: false,
        websets: WEBSET_CONFIGS.map(w => ({
          id: w.id,
          name: w.name,
          description: w.description,
          query: w.query,
          criteria: w.criteria,
          icon: w.icon,
          color: w.color,
        })),
      })
    }

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // If webset specified, use its query and domains
    if (websetId) {
      const webset = WEBSET_CONFIGS.find(w => w.id === websetId)
      if (!webset) {
        return NextResponse.json({ error: "Webset not found" }, { status: 404 })
      }

      const results = await exaSearch({
        query: webset.query,
        numResults: limit,
        includeDomains: webset.includeDomains,
        startPublishedDate: startDate.toISOString().split("T")[0],
        endPublishedDate: endDate.toISOString().split("T")[0],
        useAutoprompt: true,
        type: "neural",
        category: "news",
        contents: {
          text: { maxCharacters: 600 },
          highlights: { numSentences: 2 },
        }
      })

      return NextResponse.json({
        webset: {
          id: webset.id,
          name: webset.name,
          description: webset.description,
          query: webset.query,
          criteria: webset.criteria,
          icon: webset.icon,
          color: webset.color,
        },
        results,
        query: webset.query,
        count: results.length,
      })
    }

    // Custom search query
    if (query) {
      const results = await exaSearch({
        query,
        numResults: limit,
        includeDomains: ALL_PREMIUM_SOURCES,
        startPublishedDate: startDate.toISOString().split("T")[0],
        useAutoprompt: true,
        type: "neural",
        contents: {
          text: { maxCharacters: 600 },
          highlights: { numSentences: 2 },
        }
      })

      return NextResponse.json({
        results,
        query,
        count: results.length,
      })
    }

    // Return available websets (sorted by priority)
    const sortedWebsets = [...WEBSET_CONFIGS].sort((a, b) => a.priority - b.priority)
    
    return NextResponse.json({
      websets: sortedWebsets.map(w => ({
        id: w.id,
        name: w.name,
        description: w.description,
        query: w.query,
        criteria: w.criteria,
        icon: w.icon,
        color: w.color,
      })),
      configured: true,
    })
  } catch (error) {
    console.error("Exa API error:", error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to fetch from Exa" 
    }, { status: 500 })
  }
}

// POST /api/exa - Advanced search with options
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      query, 
      websetId, 
      numResults = 15, 
      days = 7,
      includeDomains,
      excludeDomains,
      type = "neural",
      category,
      findSimilarUrl,
      useAllSources = false,
    } = body

    if (!isExaConfigured()) {
      return NextResponse.json({
        error: "EXA_API_KEY not configured",
        configured: false,
      }, { status: 400 })
    }

    // Find similar to URL
    if (findSimilarUrl) {
      const results = await exaFindSimilar(findSimilarUrl, numResults)
      return NextResponse.json({
        results,
        type: "similar",
        sourceUrl: findSimilarUrl,
        count: results.length,
      })
    }

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get query from webset or use provided
    let searchQuery = query
    let webset = null
    let domains = includeDomains

    if (websetId) {
      webset = WEBSET_CONFIGS.find(w => w.id === websetId)
      if (webset) {
        searchQuery = webset.query
        domains = domains || webset.includeDomains
      }
    }

    if (!searchQuery) {
      return NextResponse.json({ error: "Query or websetId required" }, { status: 400 })
    }

    // If no domains specified and not using all sources, default to premium
    if (!domains && !useAllSources) {
      domains = category ? getSourcesForCategory(category) : ALL_PREMIUM_SOURCES
    }

    const results = await exaSearch({
      query: searchQuery,
      numResults,
      startPublishedDate: startDate.toISOString().split("T")[0],
      endPublishedDate: endDate.toISOString().split("T")[0],
      includeDomains: useAllSources ? undefined : domains,
      excludeDomains: excludeDomains || undefined,
      useAutoprompt: true,
      type,
      category: category || "news",
      contents: {
        text: { maxCharacters: 600 },
        highlights: { numSentences: 2 },
      }
    })

    return NextResponse.json({
      webset: webset ? {
        id: webset.id,
        name: webset.name,
        description: webset.description,
        query: webset.query,
        criteria: webset.criteria,
        icon: webset.icon,
        color: webset.color,
      } : null,
      results,
      query: searchQuery,
      count: results.length,
    })
  } catch (error) {
    console.error("Exa API error:", error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to fetch from Exa" 
    }, { status: 500 })
  }
}
