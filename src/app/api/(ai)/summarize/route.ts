import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash-exp"

interface Article {
  title: string
  text?: string
  highlights?: string[]
  url: string
}

export async function POST(request: NextRequest) {
  try {
    const { articles }: { articles: Article[] } = await request.json()

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 400 })
    }

    if (!articles || articles.length === 0) {
      return NextResponse.json({ error: "No articles provided" }, { status: 400 })
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL })

    // For single article summary
    if (articles.length === 1) {
      const article = articles[0]
      const content = article.highlights?.join(" ") || article.text || article.title

      const result = await model.generateContent({
        contents: [{
          role: "user",
          parts: [{
            text: `Summarize this news article in 1-2 concise sentences for a venture capital investor. Focus on the key takeaway and why it matters for investors.

Title: ${article.title}
Content: ${content}

Provide only the summary, no preamble.`
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 150,
        },
      })

      return NextResponse.json({
        summary: result.response.text().trim()
      })
    }

    // For daily brief (multiple articles)
    const articleSummaries = articles.slice(0, 8).map((a, i) => 
      `- ${a.title}`
    ).join("\n")

    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [{
          text: `You are an expert Venture Capital Analyst. Produce a concise, structured intelligence briefing from these headlines.

RULES:
- Limit to 2-3 key themes
- Under each theme, include at most 2 bullet signals
- Keep total length readable (no walls of text)
- Bold theme titles only

Headlines:
${articleSummaries}

Return a brief, readable outline.`
        }]
      }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 260,
      },
    })

    return NextResponse.json({
      briefSummary: result.response.text().trim()
    })

  } catch (error: any) {
    console.error("Summary API error:", error)
    return NextResponse.json({ 
      error: error?.message || "Failed to generate summary" 
    }, { status: 500 })
  }
}

