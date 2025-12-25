import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { createServerClient } from "@/lib/supabase/client"

// Use GEMINI_API_KEY (user's env var naming)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash-exp"

interface IncomingMessage {
  role: "user" | "assistant"
  content: string
}

export async function POST(request: Request) {
  try {
    const { messages = [], pageContext }: { messages: IncomingMessage[]; pageContext?: string } =
      await request.json()

    if (!GEMINI_API_KEY) {
      return NextResponse.json({
        reply: "Please add GEMINI_API_KEY to your .env.local file to enable Otho. You can get an API key from https://aistudio.google.com/app/apikey",
      })
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL })

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
          ai_analysis,
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
      ai_analysis: company.ai_analysis,
      founder: company.founder,
    }))

    const systemPrompt = `You are Otho, an expert Venture Capital Analyst and knowledgeable AI assistant powered by Google Gemini.

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

    // Build conversation for Gemini
    const chatHistory = messages.slice(0, -1).map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }))

    // Get the last user message
    const lastMessage = messages[messages.length - 1]
    const userPrompt = messages.length === 1
      ? `${systemPrompt}\n\nUser: ${lastMessage?.content || ""}`
      : lastMessage?.content || ""

    let rawReply: string

    if (chatHistory.length > 0) {
      // Use chat mode for multi-turn conversations
      const chat = model.startChat({
        history: chatHistory as any,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      })
      const result = await chat.sendMessage(userPrompt)
      rawReply = result.response.text()
    } else {
      // Single turn - include system prompt
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      })
      rawReply = result.response.text()
    }

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
  } catch (error: any) {
    console.error("Gemini route error:", error)
    return NextResponse.json({ error: error?.message || "Unable to process chat." }, { status: 500 })
  }
}
