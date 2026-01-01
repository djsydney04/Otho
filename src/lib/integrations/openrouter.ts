/**
 * OpenRouter AI Client
 * 
 * Tiered model system:
 * - CHEAP: gpt-oss-20b - tagging, classification, dedupe, entity extraction
 * - WORKER: gpt-oss-20b - analysis drafts, summaries, structured outputs
 * - PREMIUM: gpt-oss-20b - user-facing decisions, strategy, reasoning
 */

const OPENROUTER_API_KEY = process.env.OPEN_ROUTER_API

// Model tiers - Using OpenAI's free gpt-oss-20b model
export const MODELS = {
  // Cheap + fast "chores" - tagging, classification, dedupe, entity extraction
  CHEAP: "openai/gpt-oss-20b",
  // Mid-tier "worker brain" - analysis drafts, summaries, structured outputs  
  WORKER: "openai/gpt-oss-20b",
  // Premium "Otho judgment" - user-facing decisions, strategy, reasoning
  PREMIUM: "openai/gpt-oss-20b",
} as const

// Fallback models if primary fails
export const FALLBACK_MODELS = {
  CHEAP: "meta-llama/llama-3.2-3b-instruct:free",
  WORKER: "mistralai/mistral-7b-instruct:free",
  PREMIUM: "nousresearch/hermes-3-llama-3.1-405b:free",
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
 * Supports two call signatures:
 * 1. chatCompletion(options: ChatCompletionOptions)
 * 2. chatCompletion(model: string, messages: Message[], options?: {...})
 */
export async function chatCompletion(
  optionsOrModel: ChatCompletionOptions | string,
  messagesArg?: Message[],
  optionsArg?: { temperature?: number; max_tokens?: number; maxTokens?: number; reasoning?: { enabled: boolean } }
): Promise<ChatCompletionResponse> {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OPEN_ROUTER_API is not configured")
  }

  // Handle overloaded signatures
  let options: ChatCompletionOptions
  if (typeof optionsOrModel === "string") {
    // Called with (model, messages, options?)
    options = {
      model: optionsOrModel,
      messages: messagesArg || [],
      temperature: optionsArg?.temperature,
      maxTokens: optionsArg?.max_tokens || optionsArg?.maxTokens,
      reasoning: optionsArg?.reasoning,
    }
  } else {
    // Called with (options)
    options = optionsOrModel
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

  // Try primary model first, then fallbacks
  const modelsToTry = [model]
  
  // Add fallback models if using a primary model
  if (model === MODELS.CHEAP && FALLBACK_MODELS.CHEAP !== model) {
    modelsToTry.push(FALLBACK_MODELS.CHEAP)
  } else if (model === MODELS.WORKER && FALLBACK_MODELS.WORKER !== model) {
    modelsToTry.push(FALLBACK_MODELS.WORKER)
  } else if (model === MODELS.PREMIUM && FALLBACK_MODELS.PREMIUM !== model) {
    modelsToTry.push(FALLBACK_MODELS.PREMIUM)
  }

  let lastError: Error | null = null

  for (const currentModel of modelsToTry) {
    try {
      body.model = currentModel
      
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
          "X-Title": "Otho",
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `OpenRouter API error: ${response.status}`
        
        try {
          const errorData = JSON.parse(errorText)
          if (errorData.error?.message) {
            if (response.status === 402) {
              throw new Error("OpenRouter credits exhausted. Please add credits at https://openrouter.ai/settings/credits")
            } else if (response.status === 503 || errorData.error.message.includes("overloaded")) {
              // Model overloaded, try fallback
              console.warn(`[OpenRouter] Model ${currentModel} overloaded, trying fallback...`)
              lastError = new Error(`Model ${currentModel} overloaded`)
              continue
            } else {
              errorMessage = errorData.error.message
            }
          }
          console.error("[OpenRouter Error]", JSON.stringify(errorData, null, 2))
        } catch (e) {
          if (e instanceof Error && e.message.includes("credits exhausted")) {
            throw e
          }
          errorMessage = errorText || errorMessage
        }
        
        lastError = new Error(errorMessage)
        continue // Try next model
      }

      const result = await response.json()
      const choice = result.choices?.[0]

      if (!choice) {
        lastError = new Error("No response from OpenRouter")
        continue
      }

      return {
        content: choice.message?.content || "",
        reasoning_details: choice.message?.reasoning_details,
        model: result.model || currentModel,
        usage: result.usage,
      }
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e))
      console.warn(`[OpenRouter] Model ${currentModel} failed:`, lastError.message)
      // Continue to next model
    }
  }

  // All models failed
  throw lastError || new Error("All OpenRouter models failed")
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


