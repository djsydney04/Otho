import { GoogleGenerativeAI, type Content } from "@google/generative-ai"

// Initialize the Gemini client - using GEMINI_API_KEY (note: env var spelling)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

// Get the model name from env or default to gemini-2.0-flash
const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash-exp"

export interface CompanyContext {
  id?: string
  name: string
  description?: string | null
  website?: string | null
  stage?: string
  founderName?: string | null
  founderEmail?: string | null
  founderLinkedIn?: string | null
  founderTwitter?: string | null
  founderBio?: string | null
  founderPreviousCompanies?: string | null
  founderEducation?: string | null
  tags?: string[]
  comments?: Array<{ content: string; type: string; createdAt: string }>
  calendarEvents?: Array<{ title: string; startTime: string; description?: string | null }>
  emailThreads?: Array<{ subject: string; snippet?: string | null; date: string }>
}

export interface ChatMessage {
  role: "user" | "model"
  content: string
}

/**
 * Generate an AI analysis for a company based on available data
 */
export async function generateCompanyAnalysis(company: CompanyContext): Promise<string> {
  const model = genAI.getGenerativeModel({ model: modelName })

  const systemPrompt = `You are an expert angel investor and startup analyst. Your job is to provide insightful, actionable analysis of early-stage companies to help investors make informed decisions.

When analyzing a company, consider:
- Business model and market opportunity
- Founder background and team strength
- Competitive landscape and differentiation
- Stage of development and traction indicators
- Key risks and potential concerns
- Investment thesis and next steps

Provide your analysis in a clear, structured format with sections. Be specific and actionable. If information is limited, acknowledge that and focus on what can be assessed.`

  const companyInfo = buildCompanyPrompt(company)

  const prompt = `${systemPrompt}

Please analyze the following company and provide an investment-focused overview:

${companyInfo}

Provide a comprehensive but concise analysis (aim for 300-500 words). Structure it with clear sections like:
- **Overview**: What the company does and the opportunity
- **Founder Assessment**: Background and relevant experience
- **Key Strengths**: What makes this interesting
- **Concerns/Risks**: What to watch out for
- **Recommended Next Steps**: What to learn more about or actions to take`

  try {
    const result = await model.generateContent(prompt)
    const response = result.response
    return response.text()
  } catch (error: any) {
    console.error("Error generating company analysis:", error)
    throw new Error(`Failed to generate analysis: ${error.message}`)
  }
}

/**
 * Chat with AI - general purpose for Otho
 */
export async function chatWithGemini(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: modelName })

  // Build chat history for Gemini format
  const history: Content[] = []

  // Add system context as first user message
  if (messages.length > 0) {
    // Process messages for Gemini format
    for (let i = 0; i < messages.length - 1; i++) {
      const msg = messages[i]
      history.push({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      })
    }
  }

  try {
    const chat = model.startChat({
      history,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    })

    // Get the last message to send
    const lastMessage = messages[messages.length - 1]
    const promptWithSystem = messages.length === 1 
      ? `${systemPrompt}\n\nUser: ${lastMessage.content}`
      : lastMessage.content

    const result = await chat.sendMessage(promptWithSystem)
    const response = result.response
    return response.text()
  } catch (error: any) {
    console.error("Error in Gemini chat:", error)
    throw new Error(`Chat failed: ${error.message}`)
  }
}

/**
 * Chat about a specific company
 */
export async function chatAboutCompany(
  company: CompanyContext,
  messages: ChatMessage[],
  newMessage: string
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: modelName })

  const systemPrompt = `You are Otho, an expert angel investor assistant helping to evaluate and discuss early-stage companies. You have access to information about the company being discussed and should provide insightful, actionable responses.

Be helpful, concise, and specific. When asked questions, draw on the company context provided. If you don't have enough information to answer something, say so and suggest what information would be helpful.

You can help with:
- Analyzing the company and founder
- Suggesting due diligence questions
- Identifying risks and opportunities
- Comparing to market trends
- Drafting follow-up emails or meeting agendas
- Brainstorming investment thesis points`

  const companyInfo = buildCompanyPrompt(company)

  // Build chat history for Gemini format
  const history: Content[] = [
    {
      role: "user",
      parts: [{ text: `${systemPrompt}\n\nCompany Context:\n${companyInfo}\n\n---\nI'm ready to discuss this company. What would you like to know?` }],
    },
    {
      role: "model",
      parts: [{ text: `I've reviewed the information about ${company.name}. I'm ready to help you analyze this company, answer questions, or assist with any due diligence tasks. What would you like to explore?` }],
    },
  ]

  // Add previous messages
  for (const msg of messages) {
    history.push({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    })
  }

  try {
    const chat = model.startChat({ history })
    const result = await chat.sendMessage(newMessage)
    const response = result.response
    return response.text()
  } catch (error: any) {
    console.error("Error in chat:", error)
    throw new Error(`Chat failed: ${error.message}`)
  }
}

/**
 * Build a prompt string from company context
 */
function buildCompanyPrompt(company: CompanyContext): string {
  const parts: string[] = []

  parts.push(`**Company Name:** ${company.name}`)

  if (company.description) {
    parts.push(`**Description:** ${company.description}`)
  }

  if (company.website) {
    parts.push(`**Website:** ${company.website}`)
  }

  if (company.stage) {
    parts.push(`**Pipeline Stage:** ${company.stage}`)
  }

  if (company.tags && company.tags.length > 0) {
    parts.push(`**Tags:** ${company.tags.join(", ")}`)
  }

  // Founder information
  const founderParts: string[] = []
  if (company.founderName) founderParts.push(`Name: ${company.founderName}`)
  if (company.founderEmail) founderParts.push(`Email: ${company.founderEmail}`)
  if (company.founderLinkedIn) founderParts.push(`LinkedIn: ${company.founderLinkedIn}`)
  if (company.founderTwitter) founderParts.push(`Twitter: ${company.founderTwitter}`)
  if (company.founderBio) founderParts.push(`Bio: ${company.founderBio}`)
  if (company.founderPreviousCompanies) founderParts.push(`Previous Companies: ${company.founderPreviousCompanies}`)
  if (company.founderEducation) founderParts.push(`Education: ${company.founderEducation}`)

  if (founderParts.length > 0) {
    parts.push(`\n**Founder Information:**\n${founderParts.join("\n")}`)
  }

  // Recent interactions
  if (company.calendarEvents && company.calendarEvents.length > 0) {
    const eventSummaries = company.calendarEvents
      .slice(0, 5)
      .map((e) => `- ${e.title} (${new Date(e.startTime).toLocaleDateString()})`)
      .join("\n")
    parts.push(`\n**Recent Meetings:**\n${eventSummaries}`)
  }

  if (company.emailThreads && company.emailThreads.length > 0) {
    const emailSummaries = company.emailThreads
      .slice(0, 5)
      .map((e) => `- ${e.subject} (${new Date(e.date).toLocaleDateString()})`)
      .join("\n")
    parts.push(`\n**Recent Emails:**\n${emailSummaries}`)
  }

  if (company.comments && company.comments.length > 0) {
    const commentSummaries = company.comments
      .slice(0, 5)
      .map((c) => `- [${c.type}] ${c.content.substring(0, 100)}${c.content.length > 100 ? "..." : ""}`)
      .join("\n")
    parts.push(`\n**Recent Notes:**\n${commentSummaries}`)
  }

  return parts.join("\n")
}

/**
 * Check if Gemini API is configured
 */
export function isGeminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY
}

