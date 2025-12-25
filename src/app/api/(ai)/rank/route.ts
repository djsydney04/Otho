import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash-exp"

interface Article {
  id: string
  title: string
  description?: string
  source?: string
  category?: string
  url?: string
}

interface RankedArticle extends Article {
  relevanceScore: number
  reason?: string
}

// POST /api/rank - Rank articles based on user preferences using LLM
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { articles, userPreferences, categories } = body

    if (!articles || !Array.isArray(articles) || articles.length === 0) {
      return NextResponse.json({ error: "Articles array is required" }, { status: 400 })
    }

    // If no API key, return articles with basic scoring
    if (!GEMINI_API_KEY) {
      const basicRanked = articles.map((article: Article, index: number) => ({
        ...article,
        relevanceScore: 1 - (index * 0.05), // Simple declining score
        reason: "Default ranking (no LLM configured)"
      }))
      return NextResponse.json({ articles: basicRanked, model: "none" })
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL })

    // Build prompt for ranking
    const prompt = `You are an AI assistant helping an investor rank news articles based on their preferences and interests.

USER PREFERENCES:
${JSON.stringify(userPreferences || { interests: ["venture capital", "technology", "startups"] }, null, 2)}

CATEGORIES THEY FOLLOW:
${JSON.stringify(categories || ["venture", "tech", "ai"], null, 2)}

ARTICLES TO RANK:
${articles.slice(0, 20).map((a: Article, i: number) => `
${i + 1}. Title: ${a.title}
   Description: ${a.description || "N/A"}
   Source: ${a.source || "Unknown"}
   Category: ${a.category || "General"}
`).join("\n")}

TASK:
Analyze each article and score its relevance to the user (0.0 to 1.0).
Consider:
- How well it matches their interests
- Timeliness and importance
- Source credibility
- Actionable insights for investors

Return a JSON array with this structure (no markdown, just raw JSON):
[
  {
    "index": 0,
    "relevanceScore": 0.95,
    "reason": "Brief explanation why this is relevant"
  }
]

Only return the JSON array, nothing else.`

    const result = await model.generateContent(prompt)
    const responseText = result.response.text()

    // Parse the response
    try {
      // Clean up response - remove markdown code blocks if present
      let jsonText = responseText.trim()
      if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/```(?:json)?\s*/g, "").replace(/```\s*$/g, "")
      }

      const rankings = JSON.parse(jsonText)

      // Merge rankings with original articles
      const rankedArticles: RankedArticle[] = articles.map((article: Article, index: number) => {
        const ranking = rankings.find((r: { index: number }) => r.index === index)
        return {
          ...article,
          relevanceScore: ranking?.relevanceScore ?? 0.5,
          reason: ranking?.reason ?? "No specific ranking"
        }
      })

      // Sort by relevance score
      rankedArticles.sort((a, b) => b.relevanceScore - a.relevanceScore)

      return NextResponse.json({
        articles: rankedArticles,
        model: GEMINI_MODEL,
        totalRanked: rankedArticles.length
      })
    } catch (parseError) {
      console.error("Failed to parse ranking response:", parseError)
      
      // Return articles with default scoring
      const defaultRanked = articles.map((article: Article, index: number) => ({
        ...article,
        relevanceScore: 1 - (index * 0.03),
        reason: "Default ranking (parsing failed)"
      }))

      return NextResponse.json({
        articles: defaultRanked,
        model: "fallback",
        error: "Could not parse LLM response"
      })
    }
  } catch (error) {
    console.error("Ranking error:", error)
    return NextResponse.json({ error: "Ranking failed" }, { status: 500 })
  }
}
