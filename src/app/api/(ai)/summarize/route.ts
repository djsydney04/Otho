import { NextRequest, NextResponse } from "next/server"
import {
  complete,
  isOpenRouterConfigured,
  MODELS,
  chatCompletion,
} from "@/lib/integrations/openrouter"

interface Article {
  title: string
  text?: string
  highlights?: string[]
  url: string
}

export async function POST(request: NextRequest) {
  try {
    const { articles }: { articles: Article[] } = await request.json()

    if (!isOpenRouterConfigured()) {
      return NextResponse.json({ error: "OPEN_ROUTER_API not configured" }, { status: 400 })
    }

    if (!articles || articles.length === 0) {
      return NextResponse.json({ error: "No articles provided" }, { status: 400 })
    }

    // For single article summary - use CHEAP tier
    if (articles.length === 1) {
      const article = articles[0]
      const content = article.highlights?.join(" ") || article.text || article.title

      const summary = await complete(
        "summary",
        `Summarize this news article in 1-2 concise sentences for a venture capital investor. Focus on the key takeaway and why it matters for investors.

Title: ${article.title}
Content: ${content}

Provide only the summary, no preamble.`
      )

      return NextResponse.json({
        summary: summary.trim(),
        model: MODELS.WORKER,
      })
    }

    // For daily brief (multiple articles) - use WORKER tier
    const articleSummaries = articles.slice(0, 8).map((a) => 
      `- ${a.title}`
    ).join("\n")

    const result = await chatCompletion({
      model: MODELS.WORKER,
      messages: [{
        role: "user",
        content: `You are an expert Venture Capital Analyst. Produce a concise, structured intelligence briefing from these headlines.

RULES:
- Limit to 2-3 key themes
- Under each theme, include at most 2 bullet signals
- Keep total length readable (no walls of text)
- Bold theme titles only

Headlines:
${articleSummaries}

Return a brief, readable outline.`
      }],
      temperature: 0.4,
      maxTokens: 260,
    })

    return NextResponse.json({
      briefSummary: result.content.trim(),
      model: result.model,
    })

  } catch (error: any) {
    console.error("Summary API error:", error)
    return NextResponse.json({ 
      error: error?.message || "Failed to generate summary" 
    }, { status: 500 })
  }
}
