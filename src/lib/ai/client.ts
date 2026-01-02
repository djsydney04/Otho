/**
 * LLM Client with OpenRouter
 * 
 * Provides a standardized interface for creating LLM instances
 * with tiered model selection.
 */

import { ChatOpenAI } from "@langchain/openai"
import type { BaseChatModel } from "@langchain/core/language_models/chat_models"

// Model tiers - configurable via environment variables
export const MODEL_CONFIG = {
  // Cheap + fast "chores" - tagging, classification, dedupe
  CHEAP: process.env.MODEL_CHEAP || "openai/gpt-oss-20b",
  // Mid-tier "worker brain" - analysis drafts, summaries, reports  
  WORKER: process.env.MODEL_WORKER || "openai/gpt-oss-120b",
  // Premium "Otho judgment" - user-facing decisions, strategy
  PREMIUM: process.env.MODEL_PREMIUM || "anthropic/claude-sonnet-4",
  // Fallback if primary fails
  FALLBACK: process.env.MODEL_FALLBACK || "meta-llama/llama-3.2-3b-instruct:free",
} as const

export type ModelTier = keyof typeof MODEL_CONFIG

// Task types for automatic model selection
export type TaskType =
  // CHEAP tier
  | "tagging"
  | "classification"
  | "dedupe"
  | "entity_extraction"
  | "stage_suggestion"
  | "relevance_check"
  | "guard_validation"
  // WORKER tier
  | "summary"
  | "analysis_draft"
  | "email_summary"
  | "comparison"
  | "structured_output"
  | "ranking"
  | "report_generation"
  // PREMIUM tier
  | "chat"
  | "strategy"
  | "diligence"
  | "user_facing"
  | "reasoning"

// Map tasks to tiers
const TASK_TO_TIER: Record<TaskType, ModelTier> = {
  tagging: "CHEAP",
  classification: "CHEAP",
  dedupe: "CHEAP",
  entity_extraction: "CHEAP",
  stage_suggestion: "CHEAP",
  relevance_check: "CHEAP",
  guard_validation: "CHEAP",
  summary: "WORKER",
  analysis_draft: "WORKER",
  email_summary: "WORKER",
  comparison: "WORKER",
  structured_output: "WORKER",
  ranking: "WORKER",
  report_generation: "WORKER",
  chat: "PREMIUM",
  strategy: "PREMIUM",
  diligence: "PREMIUM",
  user_facing: "PREMIUM",
  reasoning: "PREMIUM",
}

export function selectTier(task: TaskType): ModelTier {
  return TASK_TO_TIER[task] || "WORKER"
}

export function selectModel(task: TaskType): string {
  return MODEL_CONFIG[selectTier(task)]
}

interface LLMOptions {
  model?: string
  tier?: ModelTier
  task?: TaskType
  temperature?: number
  maxTokens?: number
  streaming?: boolean
}

/**
 * Create a LangChain ChatOpenAI instance configured for OpenRouter
 */
export function createLLM(options: LLMOptions = {}): BaseChatModel {
  const apiKey = process.env.OPEN_ROUTER_API
  
  if (!apiKey) {
    throw new Error("OPEN_ROUTER_API is not configured")
  }

  // Determine model from options
  let model = options.model
  if (!model && options.task) {
    model = selectModel(options.task)
  } else if (!model && options.tier) {
    model = MODEL_CONFIG[options.tier]
  } else if (!model) {
    model = MODEL_CONFIG.WORKER
  }

  return new ChatOpenAI({
    model,
    temperature: options.temperature ?? 0.7,
    maxTokens: options.maxTokens ?? 2048,
    streaming: options.streaming ?? false,
    apiKey,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "Otho",
      },
    },
  })
}

/**
 * Create a streaming-enabled LLM
 */
export function createStreamingLLM(options: Omit<LLMOptions, "streaming"> = {}): BaseChatModel {
  return createLLM({ ...options, streaming: true })
}

/**
 * Convenience LLM factory
 */
export const llm = {
  cheap: (options?: Partial<LLMOptions>) => createLLM({ tier: "CHEAP", ...options }),
  worker: (options?: Partial<LLMOptions>) => createLLM({ tier: "WORKER", ...options }),
  premium: (options?: Partial<LLMOptions>) => createLLM({ tier: "PREMIUM", ...options }),
  forTask: (task: TaskType, options?: Partial<LLMOptions>) => createLLM({ task, ...options }),
}

/**
 * Check if OpenRouter is configured
 */
export function isAIConfigured(): boolean {
  return !!process.env.OPEN_ROUTER_API
}

// Legacy alias
export const isLangChainConfigured = isAIConfigured

