import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { getPersonalizedPrompt } from "@/lib/personalization"
import { exaSearch } from "@/lib/exa"

// Use GEMINI_API_KEY (user's env var naming)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash-exp"

interface IncomingMessage {
  role: "user" | "assistant"
  content: string
}

export async function POST(request: Request) {
  try {
    const { 
      messages = [], 
      pageContext,
      companyId,
      founderId,
    }: { 
      messages: IncomingMessage[]
      pageContext?: string
      companyId?: string
      founderId?: string
    } = await request.json()

    if (!GEMINI_API_KEY) {
      return NextResponse.json({
        reply: "Please add GEMINI_API_KEY to your .env.local file to enable Otho. You can get an API key from https://aistudio.google.com/app/apikey",
      })
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL })

    // Get authenticated Supabase client
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    // Fetch user's onboarding data if authenticated
    let personalizedContext = ""
    if (user) {
      const { data: userData } = await supabase
        .from("users")
        .select(`
          role,
          user_location,
          primary_goals,
          stage_focus,
          sector_focus,
          decision_factors,
          ai_help_focus,
          ai_tone
        `)
        .eq("id", user.id)
        .single()
      
      if (userData) {
        personalizedContext = getPersonalizedPrompt({
          role: userData.role as any,
          user_location: userData.user_location,
          primary_goals: userData.primary_goals as any,
          stage_focus: userData.stage_focus as any,
          sector_focus: userData.sector_focus as any,
          decision_factors: userData.decision_factors as any,
          ai_help_focus: userData.ai_help_focus as any,
          ai_tone: userData.ai_tone as any,
        })
      }
    }
    
    // Fetch specific company or founder if provided
    let focusedContext: any = null
    let webSearchResults = null
    let websiteContent: string | null = null
    
    if (companyId) {
      const { data: company } = await supabase
        .from("companies")
        .select(`
          id,
          name,
          stage,
          description,
          website,
          last_touch,
          is_priority,
          needs_followup,
          ai_analysis,
          founder:founders(name, email, linkedin, twitter, bio, previous_companies, education)
        `)
        .eq("id", companyId)
        .single()
      
      if (company) {
        focusedContext = company
        
        // Fetch website content if available
        let websiteContent = null
        if (company.website) {
          try {
            // Try to fetch website content using Exa's findSimilar for the homepage
            const urlSearchResults = await exaSearch({
              query: `site:${company.website.replace(/^https?:\/\//, '')}`,
              numResults: 3,
              useAutoprompt: false,
              type: "neural",
              contents: {
                text: { maxCharacters: 1000 },
                highlights: { numSentences: 3 },
              }
            })
            if (urlSearchResults && urlSearchResults.length > 0) {
              websiteContent = urlSearchResults[0].text || urlSearchResults[0].highlights?.join(' ')
            }
          } catch (e) {
            console.error("Website fetch error:", e)
          }
        }
        
        // Search web for company insights
        try {
          const searchQuery = `${company.name} startup ${company.description ? company.description.slice(0, 100) : ""} competitive advantage market`
          webSearchResults = await exaSearch({
            query: searchQuery,
            numResults: 5,
            useAutoprompt: true,
            type: "neural",
            contents: {
              text: { maxCharacters: 500 },
              highlights: { numSentences: 2 },
            }
          })
        } catch (e) {
          console.error("Web search error:", e)
        }
      }
    } else if (founderId) {
      const { data: founder } = await supabase
        .from("founders")
        .select(`
          id,
          name,
          email,
          linkedin,
          twitter,
          bio,
          previous_companies,
          education,
          companies:companies(id, name, stage, description, website)
        `)
        .eq("id", founderId)
        .single()
      
      if (founder) {
        focusedContext = founder
        
        // Search web for founder insights
        try {
          const searchQuery = `${founder.name} ${founder.previous_companies ? founder.previous_companies[0] : ""} entrepreneur founder background`
          webSearchResults = await exaSearch({
            query: searchQuery,
            numResults: 5,
            useAutoprompt: true,
            type: "neural",
            contents: {
              text: { maxCharacters: 500 },
              highlights: { numSentences: 2 },
            }
          })
        } catch (e) {
          console.error("Web search error:", e)
        }
      }
    }
    
    // Fetch general portfolio context
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

${personalizedContext ? `USER CONTEXT:\n${personalizedContext}\n\n` : ""}

You can answer ANY question - both about the user's portfolio AND general questions about investing, markets, technology, startups, or any other topic.

FORMATTING RULES:
- Use **bold** for emphasis and key terms
- Use bullet points (- item) for lists (DO NOT use asterisks * for bullets)
- Use numbered lists (1. item) for sequences
- Use headers sparingly: ## Section Name
- Keep responses scannable with short paragraphs
- DO NOT use markdown tables (they don't render well)
- DO NOT use asterisks (*) for bullet points - always use dashes (-) or bullets (•)

WHEN ANSWERING PORTFOLIO QUESTIONS:
Reference the portfolio data below. Structure company analysis as:
- **Overview**: What they do
- **Market**: Size and trends
- **Strengths**: Key advantages and competitive edge
- **Risks**: Concerns to watch out for
- **Competitive Landscape**: How they compare to competitors
- **Verdict**: Your take

WHEN DISCUSSING A FOCUSED COMPANY/FOUNDER:
- Use the web research provided to give real-time insights
- Analyze competitive positioning, market dynamics, and potential risks
- Provide actionable intelligence about what to watch for
- Suggest areas for due diligence based on recent news/articles
- Be specific and cite sources when possible

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

COMPANY REFERENCES:
When discussing specific companies, you can reference them using this format:
\`\`\`json
{"type": "company_reference", "companyId": "UUID", "companyName": "Name", "reason": "Why you're mentioning this company"}
\`\`\`

Only reference companies when:
- User asks about a specific company by name
- User asks for comparisons between companies
- User wants to see details about a company mentioned in context
- NEVER reference all companies at once - only 1-3 relevant companies

AUTO-COMMENT ON NEWS DISCOVERY:
When you discover new information about a company or founder (from web search, website content, or analysis), automatically add a comment:
\`\`\`json
{"tool": "add_comment", "companyId": "UUID", "founderId": "UUID", "content": "Brief summary of what you discovered", "commentType": "update", "reason": "why this is important"}
\`\`\`

Add comments when you find:
- New funding announcements
- Product launches or updates
- News articles mentioning the company
- Competitive threats or opportunities
- Market changes affecting the company
- Founder news (new role, awards, etc.)
- Industry trends impacting them

Keep comments concise (1-2 sentences) and factual.

ACCOUNT ACTIONS:
When the user asks you to make changes to accounts (companies or founders), use these tools:

To update a company: \`\`\`json
{"tool": "update_company", "companyId": "UUID", "companyName": "Name", "field": "stage|is_priority|needs_followup|description", "value": "new value", "reason": "why this change"}
\`\`\`

To update a founder: \`\`\`json
{"tool": "update_founder", "founderId": "UUID", "founderName": "Name", "field": "name|email|notes|bio", "value": "new value", "reason": "why this change"}
\`\`\`

To create: \`\`\`json
{"tool": "create_record", "type": "company|founder", "data": {"name": "Name", "description": "..."}, "reason": "why creating this"}
\`\`\`

IMPORTANT:
- Always explain what you're doing and why before executing actions
- For updates, confirm the change in your response
- Only make changes when explicitly asked

${focusedContext ? `
FOCUSED ENTITY (you are chatting about this):
${companyId ? `COMPANY: ${JSON.stringify(focusedContext, null, 2)}` : `FOUNDER: ${JSON.stringify(focusedContext, null, 2)}`}

${focusedContext.website ? `
WEBSITE CONTENT (from ${focusedContext.website}):
${websiteContent || "Unable to fetch website content, but website is available at: " + focusedContext.website}
` : ''}

${webSearchResults && webSearchResults.length > 0 ? `
RECENT WEB RESEARCH (use this for competitive analysis, market insights, risks):
${webSearchResults.map((r: any) => `- ${r.title}: ${r.text?.slice(0, 300)}... (Source: ${r.url})`).join('\n')}
` : ''}
` : ''}

USER'S PORTFOLIO (for reference - do not list all companies unless specifically asked):
${JSON.stringify(context || [])}

When referencing companies:
- Only mention companies when directly relevant to the conversation
- Use company_reference format when a specific company should be shown
- Explain why you're referencing each company
- Limit to 1-3 companies maximum per response

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

    // Parse out tool calls and company references
    let reply = rawReply
    let proposedAction = null
    let companyReferences: Array<{companyId: string; companyName: string; reason: string}> = []
    
    // Find all JSON blocks
    const jsonMatches = rawReply.matchAll(/```json\n([\s\S]*?)\n```/g)
    for (const match of jsonMatches) {
      try {
        const parsed = JSON.parse(match[1])
        
        // Handle company references
        if (parsed.type === "company_reference") {
          // If only companyName provided, look up ID from portfolio
          let companyId = parsed.companyId
          let companyName = parsed.companyName || "Unknown"
          if (!companyId && parsed.companyName && context) {
            const found = context.find((c: any) => 
              c.name.toLowerCase() === parsed.companyName.toLowerCase()
            )
            if (found) {
              companyId = found.id
              companyName = found.name
            }
          }
          
          if (companyId) {
            companyReferences.push({
              companyId,
              companyName,
              reason: parsed.reason || "Mentioned in conversation"
            })
            reply = reply.replace(match[0], "").trim()
          }
        }
        
        // Handle add_comment action (auto-comment on news discovery)
        if (parsed.tool === "add_comment") {
          // Look up company/founder ID by name if needed
          if (!parsed.companyId && parsed.companyName && context) {
            const found = context.find((c: any) => 
              c.name.toLowerCase() === parsed.companyName.toLowerCase()
            )
            if (found) parsed.companyId = found.id
          }
          
          // Execute comment addition (if user has granted permission)
          if ((parsed.companyId || parsed.founderId) && user) {
            try {
              // Get user's active grants
              const { data: grants } = await (supabase as any)
                .from("ai_grants")
                .select("id")
                .eq("user_id", user.id)
                .eq("is_active", true)
                .eq("can_add_comments", true)
                .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
                .is("revoked_at", null)
                .limit(1)
              
              if (grants && grants.length > 0) {
                const grantId = grants[0].id
                
                const commentResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ai/actions/add-comment`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    grantId,
                    companyId: parsed.companyId,
                    founderId: parsed.founderId,
                    content: parsed.content,
                    commentType: parsed.commentType || "update",
                    skipLastTouchUpdate: true // AI comments don't update last_touch
                  })
                })
                
                if (commentResponse.ok) {
                  reply += `\n\n💬 Added note about ${parsed.companyName || 'this company'}.`
                }
              } else {
                // No grant, suggest to user
                reply += `\n\n💡 Tip: I found new information, but I need permission to add comments. Grant permission in Settings to enable auto-commenting.`
              }
            } catch (e) {
              console.error("Failed to add comment:", e)
            }
          }
          
          reply = reply.replace(match[0], "").trim()
        }
        
        // Handle account actions
        if (parsed.tool === "update_company" || parsed.tool === "update_founder" || parsed.tool === "create_record") {
          // Look up company ID by name if needed
          if (parsed.tool === "update_company" && !parsed.companyId && parsed.companyName && context) {
            const found = context.find((c: any) => 
              c.name.toLowerCase() === parsed.companyName.toLowerCase()
            )
            if (found) parsed.companyId = found.id
          }
          
          proposedAction = parsed
          // Strip the JSON block
          reply = reply.replace(match[0], "").trim()
          
          // Execute the action if it's an update
          if (parsed.tool === "update_company" && parsed.companyId && user) {
            try {
              // Check if user has grant with permission to update this field
              const { data: grants } = await (supabase as any)
                .from("ai_grants")
                .select("id, can_update_fields, denied_fields")
                .eq("user_id", user.id)
                .eq("is_active", true)
                .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
                .is("revoked_at", null)
              
              const validGrant = grants?.find((g: any) => {
                // Check if field is in denied list
                if (g.denied_fields?.includes(parsed.field)) return false
                // Check if field is in allowed list (or if no restrictions)
                return !g.can_update_fields || g.can_update_fields.length === 0 || g.can_update_fields.includes(parsed.field)
              })
              
              if (validGrant) {
                const updateData: any = { [parsed.field]: parsed.value }
                await supabase
                  .from("companies")
                  .update(updateData)
                  .eq("id", parsed.companyId)
                
                // Log action
                await (supabase as any)
                  .from("ai_action_log")
                  .insert({
                    grant_id: validGrant.id,
                    user_id: user.id,
                    action_type: 'update_company',
                    entity_type: 'company',
                    entity_id: parsed.companyId,
                    changes: { field: parsed.field, old_value: null, new_value: parsed.value } as any,
                    description: `Updated ${parsed.companyName}: ${parsed.field} → ${parsed.value}`,
                    source: 'chat'
                  })
                
                reply += `\n\n✅ Updated ${parsed.companyName}: ${parsed.field} → ${parsed.value}`
              } else {
                reply += `\n\n⚠️ I need permission to update ${parsed.field}. Grant permission in Settings.`
              }
            } catch (e) {
              console.error("Failed to update company:", e)
              reply += `\n\n⚠️ Failed to update ${parsed.companyName}. Please try again.`
            }
          } else if (parsed.tool === "update_founder" && parsed.founderId && user) {
            try {
              // Similar permission check for founder updates
              const { data: grants } = await (supabase as any)
                .from("ai_grants")
                .select("id, can_update_fields, denied_fields")
                .eq("user_id", user.id)
                .eq("is_active", true)
                .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
                .is("revoked_at", null)
              
              const validGrant = grants?.find((g: any) => {
                if (g.denied_fields?.includes(parsed.field)) return false
                return !g.can_update_fields || g.can_update_fields.length === 0 || g.can_update_fields.includes(parsed.field)
              })
              
              if (validGrant) {
                const updateData: any = { [parsed.field]: parsed.value }
                await supabase
                  .from("founders")
                  .update(updateData)
                  .eq("id", parsed.founderId)
                
                reply += `\n\n✅ Updated ${parsed.founderName}: ${parsed.field} → ${parsed.value}`
              } else {
                reply += `\n\n⚠️ I need permission to update ${parsed.field}. Grant permission in Settings.`
              }
            } catch (e) {
              console.error("Failed to update founder:", e)
              reply += `\n\n⚠️ Failed to update ${parsed.founderName}. Please try again.`
            }
          }
        }
      } catch (e) {
        console.error("Failed to parse Otho tool call", e)
      }
    }
    
    // Replace asterisks with bullet points
    reply = reply.replace(/^\s*\*\s+/gm, '- ')

    // If discussing a company and reply contains substantial insights, save to ai_analysis
    if (companyId && focusedContext && reply.length > 200) {
      // Extract key insights from the reply
      const insightsMatch = reply.match(/##?\s*(Competitive|Market|Risks|Strengths|Analysis|Insights)[\s\S]*?(?=\n##?|$)/i)
      if (insightsMatch || reply.includes("competitive") || reply.includes("risk") || reply.includes("strength")) {
        // Save insights asynchronously (don't block response)
        supabase
          .from("companies")
          .update({
            ai_analysis: reply,
            ai_analysis_updated_at: new Date().toISOString(),
          })
          .eq("id", companyId)
          .then(({ error }) => {
            if (error) {
              console.error(`[AI Insights] Failed to save:`, error)
            } else {
              console.log(`[AI Insights] Saved insights for company ${companyId}`)
            }
          })
      }
    }

    return NextResponse.json({ 
      reply, 
      proposedAction, 
      insightsSaved: !!companyId,
      companyReferences: companyReferences.length > 0 ? companyReferences : undefined
    })
  } catch (error: any) {
    console.error("Gemini route error:", error)
    return NextResponse.json({ error: error?.message || "Unable to process chat." }, { status: 500 })
  }
}
