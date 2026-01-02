/**
 * Company & Founder Analysis
 * 
 * High-level functions for analyzing companies and founders.
 * Uses the pre-built agents for actual AI work.
 */

import { simpleCompletion, createOthoAgent } from "./presets"
import { isAIConfigured, MODEL_CONFIG } from "./client"

// ==================== TYPES ====================

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

// ==================== AGENT CACHE ====================

let othoAgentInstance: Awaited<ReturnType<typeof createOthoAgent>> | null = null

async function getOthoAgent() {
  if (!othoAgentInstance) {
    othoAgentInstance = await createOthoAgent()
  }
  return othoAgentInstance
}

export function clearAgentCache(): void {
  othoAgentInstance = null
}

// ==================== ANALYSIS FUNCTIONS ====================

/**
 * Generate an AI analysis for a company
 */
export async function generateCompanyAnalysis(company: CompanyContext): Promise<string> {
  const companyInfo = buildCompanyPrompt(company)

  const prompt = `Please analyze the following company and provide an investment-focused overview:

${companyInfo}

Provide a comprehensive but concise analysis (aim for 300-500 words). Structure it with clear sections like:
- **Overview**: What the company does and the opportunity
- **Founder Assessment**: Background and relevant experience
- **Key Strengths**: What makes this interesting
- **Concerns/Risks**: What to watch out for
- **Recommended Next Steps**: What to learn more about or actions to take`

  const systemPrompt = `You are an expert angel investor and startup analyst. Your job is to provide insightful, actionable analysis of early-stage companies to help investors make informed decisions.

When analyzing a company, consider:
- Business model and market opportunity
- Founder background and team strength
- Competitive landscape and differentiation
- Stage of development and traction indicators
- Key risks and potential concerns
- Investment thesis and next steps

Provide your analysis in a clear, structured format with sections. Be specific and actionable. If information is limited, acknowledge that and focus on what can be assessed.`

  return simpleCompletion(prompt, {
    systemPrompt,
    task: "analysis_draft",
    temperature: 0.7,
  })
}

/**
 * Simple chat completion
 */
export async function chat(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string
): Promise<string> {
  const lastMessage = messages[messages.length - 1]
  if (!lastMessage) {
    return "I'm ready to help. What would you like to know?"
  }

  return simpleCompletion(lastMessage.content, {
    systemPrompt,
    task: "chat",
    temperature: 0.7,
  })
}

/**
 * Chat about a specific company using the Otho agent
 */
export async function chatAboutCompany(
  company: CompanyContext,
  messages: ChatMessage[],
  newMessage: string,
  threadId?: string
): Promise<string> {
  const agent = await getOthoAgent()
  
  const companyInfo = buildCompanyPrompt(company)
  const contextMessage = `I'm discussing ${company.name}. Here's the context:\n\n${companyInfo}\n\nUser question: ${newMessage}`

  const response = await agent.invoke(contextMessage, {
    threadId: threadId || `company-${company.id || company.name}`,
  })

  return response.content
}

// ==================== PROMPT BUILDER ====================

export function buildCompanyPrompt(company: CompanyContext): string {
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

// ==================== LEGACY ALIASES ====================

// For backwards compatibility
export const chatWithGemini = chat
export const isGeminiConfigured = isAIConfigured

// Re-export from client
export { isAIConfigured, MODEL_CONFIG }

