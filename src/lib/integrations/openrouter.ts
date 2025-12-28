/**
 * OpenRouter AI Client
 * 
 * Tiered model system:
 * - CHEAP: gpt-oss-20b - tagging, classification, dedupe, entity extraction
 * - WORKER: gpt-oss-120b - analysis drafts, summaries, structured outputs
 * - PREMIUM: claude-sonnet-4.5 - user-facing decisions, strategy, reasoning
 */

const OPENROUTER_API_KEY = process.env.OPEN_ROUTER_API

// Model tiers
export const MODELS = {
  // Cheap + fast "chores" - tagging, classification, dedupe, entity extraction
  CHEAP: "openai/gpt-oss-20b",
  // Mid-tier "worker brain" - analysis drafts, summaries, structured outputs
  WORKER: "openai/gpt-oss-120b",
  // Premium "Otho judgment" - user-facing decisions, strategy, reasoning
  PREMIUM: "anthropic/claude-sonnet-4.5",
} as const

export type ModelTier = keyof typeof MODELS

// Simple routing rules
export function selectModel(task: TaskType): string {
  switch (task) {
    // Cheap tasks
    case "tagging":
    case "classification":
    case "dedupe":
    case "entity_extraction":
    case "stage_suggestion":
    case "relevance_check":
    case "guard_validation":
      return MODELS.CHEAP
    
    // Worker tasks
    case "summary":
    case "analysis_draft":
    case "email_summary":
    case "comparison":
    case "structured_output":
    case "ranking":
      return MODELS.WORKER
    
    // Premium tasks
    case "chat":
    case "strategy":
    case "diligence":
    case "user_facing":
    case "reasoning":
      return MODELS.PREMIUM
    
    default:
      return MODELS.WORKER
  }
}

export type TaskType =
  | "tagging"
  | "classification"
  | "dedupe"
  | "entity_extraction"
  | "stage_suggestion"
  | "relevance_check"
  | "guard_validation"
  | "summary"
  | "analysis_draft"
  | "email_summary"
  | "comparison"
  | "structured_output"
  | "ranking"
  | "chat"
  | "strategy"
  | "diligence"
  | "user_facing"
  | "reasoning"

export interface Message {
  role: "user" | "assistant" | "system"
  content: string
  reasoning_details?: any // For preserving reasoning in multi-turn
}

export interface ChatCompletionOptions {
  model?: string
  messages: Message[]
  temperature?: number
  maxTokens?: number
  reasoning?: { enabled: boolean }
  responseFormat?: { type: "json_object" | "text" }
}

export interface ChatCompletionResponse {
  content: string
  reasoning_details?: any
  model: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * Check if OpenRouter is configured
 */
export function isOpenRouterConfigured(): boolean {
  return !!OPENROUTER_API_KEY
}

/**
 * Main chat completion function
 */
export async function chatCompletion(
  options: ChatCompletionOptions
): Promise<ChatCompletionResponse> {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OPEN_ROUTER_API is not configured")
  }

  const {
    model = MODELS.WORKER,
    messages,
    temperature = 0.7,
    maxTokens = 1024,
    reasoning,
    responseFormat,
  } = options

  const body: any = {
    model,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
      ...(m.reasoning_details && { reasoning_details: m.reasoning_details }),
    })),
    temperature,
    max_tokens: maxTokens,
  }

  if (reasoning?.enabled) {
    body.reasoning = { enabled: true }
  }

  if (responseFormat) {
    body.response_format = responseFormat
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "AngelLead",
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`)
  }

  const result = await response.json()
  const choice = result.choices?.[0]

  if (!choice) {
    throw new Error("No response from OpenRouter")
  }

  return {
    content: choice.message?.content || "",
    reasoning_details: choice.message?.reasoning_details,
    model: result.model || model,
    usage: result.usage,
  }
}

/**
 * Quick helper for simple completions with task-based model selection
 */
export async function complete(
  task: TaskType,
  prompt: string,
  options?: Partial<ChatCompletionOptions>
): Promise<string> {
  const result = await chatCompletion({
    model: selectModel(task),
    messages: [{ role: "user", content: prompt }],
    ...options,
  })
  return result.content
}

/**
 * Chat with system prompt and conversation history
 */
export async function chat(
  systemPrompt: string,
  messages: Message[],
  options?: {
    model?: string
    task?: TaskType
    temperature?: number
    maxTokens?: number
    reasoning?: boolean
  }
): Promise<ChatCompletionResponse> {
  const model = options?.model || (options?.task ? selectModel(options.task) : MODELS.PREMIUM)
  
  const allMessages: Message[] = [
    { role: "system", content: systemPrompt },
    ...messages,
  ]

  return chatCompletion({
    model,
    messages: allMessages,
    temperature: options?.temperature,
    maxTokens: options?.maxTokens,
    reasoning: options?.reasoning ? { enabled: true } : undefined,
  })
}

/**
 * Generate JSON output with schema guidance
 */
export async function generateJSON<T>(
  task: TaskType,
  prompt: string,
  options?: {
    temperature?: number
  }
): Promise<T> {
  const result = await chatCompletion({
    model: selectModel(task),
    messages: [{ role: "user", content: prompt }],
    temperature: options?.temperature ?? 0.3,
    responseFormat: { type: "json_object" },
  })

  try {
    // Clean up response - remove markdown code blocks if present
    let jsonText = result.content.trim()
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```(?:json)?\s*/g, "").replace(/```\s*$/g, "")
    }
    return JSON.parse(jsonText)
  } catch {
    throw new Error(`Failed to parse JSON response: ${result.content}`)
  }
}

/**
 * Guard validation - cheap model to verify claims against sources
 */
export async function guardValidation(
  contextPack: string,
  draftAnswer: string
): Promise<{ valid: boolean; issues: string[]; correctedAnswer?: string }> {
  const prompt = `You are a fact-checking guard. Verify that every factual claim in the draft answer is supported by the provided sources.

CONTEXT (Sources):
${contextPack}

DRAFT ANSWER:
${draftAnswer}

TASK:
1. Check each factual sentence has a citation [S#]
2. Verify cited source text supports the claim
3. Return JSON with:
   - valid: true if all claims supported, false otherwise
   - issues: array of unsupported claims
   - correctedAnswer: (only if invalid) rewritten answer with unsupported claims removed

Return ONLY valid JSON.`

  return generateJSON("guard_validation", prompt, { temperature: 0.1 })
}


