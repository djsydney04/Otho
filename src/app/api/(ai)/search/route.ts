import { NextRequest, NextResponse } from "next/server"

const GROQ_API_KEY = process.env.GROQ_API_KEY
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

interface SearchResult {
  id: string
  title: string
  url: string
  snippet: string
  source: string
  publishedAt?: string
  imageUrl?: string
  relevanceScore?: number
}

interface GroqMessage {
  role: "system" | "user" | "assistant"
  content: string
}

// POST /api/search - Intelligent search using Groq Compound Beta Mini
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, userPreferences, context } = body

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 })
    }

    if (!GROQ_API_KEY) {
      return NextResponse.json({ 
        error: "GROQ_API_KEY not configured",
        results: [],
        summary: "Search requires GROQ_API_KEY to be set in environment variables."
      }, { status: 200 })
    }

    // Build the search prompt with user context
    const systemPrompt = `You are an intelligent search assistant for investors. Your job is to search the web and return relevant, high-quality results.

User preferences and interests:
${userPreferences ? JSON.stringify(userPreferences) : "General technology and venture capital"}

Context:
${context || "Looking for relevant news and information"}

Instructions:
1. Search the web for the most relevant and recent information
2. Focus on credible sources (news outlets, company blogs, research)
3. Prioritize results that match user preferences
4. Return results in a structured JSON format

Return your response as a JSON object with this structure:
{
  "summary": "Brief 1-2 sentence summary of what you found",
  "results": [
    {
      "title": "Article title",
      "url": "https://...",
      "snippet": "Brief description of the content",
      "source": "Source name",
      "relevanceScore": 0.95
    }
  ],
  "relatedTopics": ["topic1", "topic2"]
}`

    const messages: GroqMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Search for: ${query}` }
    ]

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL,
        messages,
        temperature: 0.3,
        max_tokens: 4096,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("Groq API error:", error)
      
      // Fallback to regular model if compound-beta-mini fails
      const fallbackResponse = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: "You are a helpful search assistant. Based on the query, suggest what types of results would be relevant. Return JSON with a summary and suggested search terms." },
            { role: "user", content: query }
          ],
          temperature: 0.3,
          max_tokens: 1024,
        }),
      })

      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json()
        return NextResponse.json({
          summary: "Search performed with fallback model",
          results: [],
          suggestion: fallbackData.choices?.[0]?.message?.content,
          model: "fallback"
        })
      }

      return NextResponse.json({ error: "Search failed" }, { status: 500 })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    // Try to parse JSON from response
    try {
      // Extract JSON from markdown code blocks if present
      let jsonContent = content
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        jsonContent = jsonMatch[1]
      }
      
      const parsed = JSON.parse(jsonContent)
      return NextResponse.json({
        ...parsed,
        model: "compound-beta-mini",
        query
      })
    } catch {
      // If not valid JSON, return raw content
      return NextResponse.json({
        summary: content,
        results: [],
        model: "compound-beta-mini",
        query
      })
    }
  } catch (error) {
    console.error("Search error:", error)
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }
}

// GET /api/search - Quick search without preferences
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")

  if (!query) {
    return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 })
  }

  // Convert to POST request
  const response = await POST(new NextRequest(request.url, {
    method: "POST",
    body: JSON.stringify({ query }),
    headers: { "Content-Type": "application/json" }
  }))

  return response
}
