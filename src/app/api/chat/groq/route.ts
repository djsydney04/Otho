import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/client"

const GROQ_API_KEY = process.env.GROQ_API_KEY
// compound-beta enables built-in web search and tools
const GROQ_MODEL = process.env.GROQ_MODEL || "compound"

interface IncomingMessage {
  role: "user" | "assistant"
  content: string
}

export async function POST(request: Request) {
  try {
    const { messages = [], pageContext }: { messages: IncomingMessage[]; pageContext?: string } =
      await request.json()

    if (!GROQ_API_KEY) {
      return NextResponse.json({
        reply: "Add a GROQ_API_KEY to enable Otho, your AI copilot.",
      })
    }

    const supabase = createServerClient()
    const { data: companies } = await supabase
      .from("companies")
      .select(
        `
          id,
          name,
          stage,
          description,
          website,
          last_touch,
          is_priority,
          needs_followup,
          founder:founders(name, email, linkedin, twitter)
        `,
      )
      .limit(20)

    const context = companies?.map((company) => ({
      id: company.id,
      name: company.name,
      stage: company.stage,
      description: company.description,
      website: company.website,
      last_touch: company.last_touch,
      is_priority: company.is_priority,
      needs_followup: company.needs_followup,
      founder: company.founder,
    }))

    const systemPrompt = `You are Otho, an expert Venture Capital Analyst and knowledgeable AI assistant.

You can answer ANY question - both about the user's portfolio AND general questions about investing, markets, technology, startups, or any other topic.

FORMATTING RULES:
- Use **bold** for emphasis and key terms
- Use bullet points (- item) for lists  
- Use numbered lists (1. item) for sequences
- Use headers sparingly: ## Section Name
- Keep responses scannable with short paragraphs
- DO NOT use markdown tables (they don't render well)

WHEN ANSWERING PORTFOLIO QUESTIONS:
Reference the portfolio data below. Structure company analysis as:
- **Overview**: What they do
- **Market**: Size and trends
- **Strengths**: Key advantages
- **Risks**: Concerns to watch
- **Verdict**: Your take

WHEN ANSWERING GENERAL QUESTIONS:
Answer directly using your knowledge. Topics you're great at:
- Investment themes and market trends
- Startup advice and best practices
- Technology and industry analysis
- VC/angel investing strategies
- Due diligence frameworks
- Anything else the user asks

IMPORTANT:
- Never make up URLs, article links, or news sources
- If uncertain, say so and suggest what to search for
- Be conversational and helpful
- Give substantive, actionable insights

TOOLS (only when user explicitly asks to modify data):
To update: \`\`\`json
{"tool": "propose_update", "companyId": "UUID", "companyName": "Name", "field": "stage", "value": "Qualified"}
\`\`\`

To create: \`\`\`json
{"tool": "create_record", "type": "company", "data": {"name": "Name", "description": "..."}}
\`\`\`

USER'S PORTFOLIO:
${JSON.stringify(context || [])}

CURRENT SCREEN:
${pageContext || "Dashboard"}`

    const groqMessages = [
      {
        role: "system",
        content: systemPrompt,
      },
      ...messages.slice(-6),
    ]

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: groqMessages,
        temperature: 0.3, // Slightly higher for creative analysis
        max_tokens: 1024,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error("Groq API error:", data)
      return NextResponse.json({ error: data?.error?.message || "Failed to reach Otho." }, { status: 500 })
    }

    const rawReply = data?.choices?.[0]?.message?.content || "I'm still thinking."
    
    // Parse out tool calls
    let reply = rawReply
    let proposedAction = null
    
    const jsonMatch = rawReply.match(/```json\n([\s\S]*?)\n```/)
    if (jsonMatch) {
      try {
        const action = JSON.parse(jsonMatch[1])
        if (action.tool === "propose_update" || action.tool === "create_record") {
          proposedAction = action
          // Strip the JSON block
          reply = rawReply.replace(jsonMatch[0], "").trim()
        }
      } catch (e) {
        console.error("Failed to parse Otho tool call", e)
      }
    }

    return NextResponse.json({ reply, proposedAction })
  } catch (error) {
    console.error("Groq route error:", error)
    return NextResponse.json({ error: "Unable to process chat." }, { status: 500 })
  }
}
