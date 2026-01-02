/**
 * Pre-built Agent Configurations
 * 
 * Ready-to-use agents for common tasks:
 * - Otho: Main chat assistant
 * - Report: Investment memo generator
 * - Tagger: Classification agent
 * - Guard: Fact-checking validator
 */

import { HumanMessage, AIMessage, SystemMessage, BaseMessage } from "@langchain/core/messages"
import { z } from "zod"
import type { StructuredTool } from "@langchain/core/tools"
import type { BaseChatModel } from "@langchain/core/language_models/chat_models"

import { createLLM, MODEL_CONFIG, type TaskType, type ModelTier } from "./client"
import { coreTools, chatTools, analysisTools, reportTools } from "./tools"

// ==================== TYPES ====================

export interface AgentConfig {
  name: string
  description: string
  systemPrompt: string
  tier?: ModelTier
  task?: TaskType
  model?: string
  temperature?: number
  maxTokens?: number
  tools?: StructuredTool[]
  outputSchema?: z.ZodType
  memory?: boolean
  verbose?: boolean
}

export interface AgentContext {
  userId?: string
  companyId?: string
  founderId?: string
  threadId?: string
  metadata?: Record<string, any>
}

export interface AgentResponse {
  content: string
  structuredOutput?: any
  toolCalls?: Array<{ tool: string; input: any; output: any }>
  usage?: { inputTokens: number; outputTokens: number }
  model: string
  latencyMs: number
}

export interface ConversationMessage {
  role: "user" | "assistant" | "system"
  content: string
  timestamp?: string
}

// ==================== MEMORY STORE ====================

const conversationStore = new Map<string, BaseMessage[]>()

function getConversationHistory(threadId: string): BaseMessage[] {
  return conversationStore.get(threadId) || []
}

function saveConversationHistory(threadId: string, messages: BaseMessage[]): void {
  conversationStore.set(threadId, messages)
}

function clearConversationHistory(threadId: string): void {
  conversationStore.delete(threadId)
}

// ==================== AGENT FACTORY ====================

/**
 * Create an agent with memory and optional structured output
 */
export async function createAgent(config: AgentConfig): Promise<{
  invoke: (input: string, context?: AgentContext) => Promise<AgentResponse>
  stream: (input: string, context?: AgentContext) => AsyncGenerator<string, void, unknown>
  clearMemory: (threadId: string) => void
}> {
  const model = createLLM({
    tier: config.tier,
    task: config.task,
    model: config.model,
    temperature: config.temperature ?? 0.7,
    maxTokens: config.maxTokens ?? 2048,
  }) as BaseChatModel

  const tools = config.tools || coreTools

  // Build tool descriptions for the system prompt
  const toolDescriptions = tools.map(t => `- ${t.name}: ${t.description}`).join("\n")
  const systemWithTools = tools.length > 0 
    ? `${config.systemPrompt}\n\nAvailable tools:\n${toolDescriptions}\n\nTo use a tool, include a JSON block like: {"tool": "tool_name", "input": {...}}`
    : config.systemPrompt

  async function invoke(input: string, context?: AgentContext): Promise<AgentResponse> {
    const startTime = Date.now()
    const threadId = context?.threadId || "default"

    const chatHistory = config.memory ? getConversationHistory(threadId) : []

    try {
      const messages: BaseMessage[] = [
        new SystemMessage(systemWithTools),
        ...chatHistory,
        new HumanMessage(input),
      ]

      const result = await model.invoke(messages)
      const content = typeof result.content === "string" ? result.content : ""

      if (config.memory && threadId) {
        const newHistory = [...chatHistory, new HumanMessage(input), new AIMessage(content)]
        saveConversationHistory(threadId, newHistory)
      }

      let structuredOutput = undefined
      if (config.outputSchema) {
        try {
          const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const jsonStr = jsonMatch[1] || jsonMatch[0]
            const parsed = JSON.parse(jsonStr)
            structuredOutput = config.outputSchema.parse(parsed)
          }
        } catch (e) {
          console.warn("Failed to parse structured output:", e)
        }
      }

      return {
        content,
        structuredOutput,
        model: config.model || MODEL_CONFIG[config.tier || "WORKER"],
        latencyMs: Date.now() - startTime,
      }
    } catch (error) {
      console.error(`Agent ${config.name} error:`, error)
      throw error
    }
  }

  async function* stream(input: string, context?: AgentContext): AsyncGenerator<string, void, unknown> {
    const threadId = context?.threadId || "default"
    const chatHistory = config.memory ? getConversationHistory(threadId) : []

    const streamingLLM = createLLM({
      tier: config.tier,
      task: config.task,
      model: config.model,
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 2048,
      streaming: true,
    }) as BaseChatModel

    const messages: BaseMessage[] = [
      new SystemMessage(systemWithTools),
      ...chatHistory,
      new HumanMessage(input),
    ]

    const streamResult = await streamingLLM.stream(messages)
    let fullContent = ""

    for await (const chunk of streamResult) {
      const chunkContent = chunk.content
      if (typeof chunkContent === "string") {
        fullContent += chunkContent
        yield chunkContent
      }
    }

    if (config.memory && threadId) {
      const newHistory = [...chatHistory, new HumanMessage(input), new AIMessage(fullContent)]
      saveConversationHistory(threadId, newHistory)
    }
  }

  return { invoke, stream, clearMemory: clearConversationHistory }
}

// ==================== SYSTEM PROMPTS ====================

export const OTHO_SYSTEM_PROMPT = `You are Otho, an expert AI assistant for angel investors. You help evaluate startups, analyze founders, track deal flow, and make informed investment decisions.

Your capabilities:
- Search the web for company and founder information
- Look up companies and founders in the deal pipeline
- Analyze investment opportunities
- Draft follow-up emails and meeting notes
- Provide strategic advice on portfolio management

Guidelines:
- Be concise but thorough
- Always cite sources when making factual claims
- If you're unsure, say so and suggest how to find out
- Focus on actionable insights
- Use the tools available to gather information before answering

When analyzing companies:
- Consider market size and timing
- Evaluate founder-market fit
- Identify competitive advantages
- Highlight key risks
- Suggest next steps for due diligence`

export const REPORT_GENERATOR_PROMPT = `You are an expert investment analyst tasked with creating comprehensive reports. You generate detailed, well-structured investment memos and deal reports.

Your reports should include:
- Executive summary
- Company overview
- Market analysis
- Competitive landscape
- Team assessment
- Financial overview (if available)
- Risk analysis
- Investment recommendation

Guidelines:
- Use web search to gather current information
- Cite all sources with [S#] notation
- Be thorough but avoid speculation
- If information is unavailable, note it explicitly
- Structure content with clear headers and sections`

export const TAGGER_PROMPT = `You are a classification expert. Your job is to analyze companies and founders and assign appropriate tags, categories, and labels.

Output your classifications in JSON format with:
- primaryCategory: main business category
- subCategories: list of relevant subcategories
- stage: company stage (pre-seed, seed, series-a, etc.)
- tags: list of relevant tags
- confidence: your confidence level (high, medium, low)

Be precise and consistent in your classifications.`

export const GUARD_PROMPT = `You are a fact-checking guard. Your job is to verify that AI-generated content is accurate and properly sourced.

For each claim in the content:
1. Check if it has a citation [S#]
2. Verify the cited source supports the claim
3. Flag any unsupported or incorrect claims

Output your validation in JSON format with:
- valid: boolean
- issues: list of problems found
- correctedContent: (if invalid) the corrected version

Be strict but fair. If a claim is reasonable inference, note it but don't flag as invalid.`

// ==================== PRE-BUILT AGENTS ====================

export async function createOthoAgent(options?: Partial<AgentConfig>) {
  return createAgent({
    name: "Otho",
    description: "Main AI assistant for angel investors",
    systemPrompt: OTHO_SYSTEM_PROMPT,
    tier: "PREMIUM",
    tools: chatTools,
    memory: true,
    ...options,
  })
}

export async function createReportAgent(options?: Partial<AgentConfig>) {
  return createAgent({
    name: "ReportGenerator",
    description: "Creates investment memos and deal reports",
    systemPrompt: REPORT_GENERATOR_PROMPT,
    tier: "WORKER",
    tools: reportTools,
    memory: false,
    temperature: 0.4,
    maxTokens: 4096,
    ...options,
  })
}

export async function createTaggerAgent(options?: Partial<AgentConfig>) {
  return createAgent({
    name: "Tagger",
    description: "Classifies and tags companies and founders",
    systemPrompt: TAGGER_PROMPT,
    tier: "CHEAP",
    tools: [],
    memory: false,
    temperature: 0.2,
    ...options,
  })
}

export async function createGuardAgent(options?: Partial<AgentConfig>) {
  return createAgent({
    name: "Guard",
    description: "Validates AI outputs against sources",
    systemPrompt: GUARD_PROMPT,
    tier: "CHEAP",
    tools: [],
    memory: false,
    temperature: 0.1,
    ...options,
  })
}

// ==================== SIMPLE COMPLETION HELPERS ====================

/**
 * Run a simple prompt through an LLM
 */
export async function simpleCompletion(
  prompt: string,
  options?: {
    systemPrompt?: string
    tier?: ModelTier
    task?: TaskType
    temperature?: number
  }
): Promise<string> {
  const model = createLLM({
    tier: options?.tier,
    task: options?.task,
    temperature: options?.temperature,
  }) as BaseChatModel

  const messages: BaseMessage[] = []
  if (options?.systemPrompt) {
    messages.push(new SystemMessage(options.systemPrompt))
  }
  messages.push(new HumanMessage(prompt))

  const response = await model.invoke(messages)
  return typeof response.content === "string" ? response.content : ""
}

/**
 * Run a structured output chain
 */
export async function structuredCompletion<T>(
  prompt: string,
  schema: z.ZodType<T>,
  options?: {
    systemPrompt?: string
    tier?: ModelTier
    task?: TaskType
    temperature?: number
  }
): Promise<T> {
  const model = createLLM({
    tier: options?.tier,
    task: options?.task || "structured_output",
    temperature: options?.temperature ?? 0.3,
  }) as BaseChatModel

  const schemaDescription = JSON.stringify(
    schema instanceof z.ZodObject 
      ? Object.fromEntries(
          Object.entries(schema.shape).map(([key, value]) => [
            key, 
            (value as any)._def?.description || typeof (value as any)._def?.typeName
          ])
        )
      : { value: "any" },
    null,
    2
  )

  const formatInstructions = `Respond with a JSON object matching this schema:\n${schemaDescription}\n\nRespond ONLY with valid JSON, no other text.`
  const fullPrompt = `${options?.systemPrompt || ""}\n\n${prompt}\n\n${formatInstructions}`

  const response = await model.invoke([new HumanMessage(fullPrompt)])
  const content = typeof response.content === "string" ? response.content : ""
  
  const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/)
  
  if (!jsonMatch) {
    throw new Error(`Failed to extract JSON from response: ${content}`)
  }
  
  const jsonStr = jsonMatch[1] || jsonMatch[0]
  const parsed = JSON.parse(jsonStr)
  
  return schema.parse(parsed)
}

