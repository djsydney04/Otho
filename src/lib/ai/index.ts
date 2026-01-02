/**
 * AI Module
 * 
 * All AI interactions in Otho go through this module.
 * Uses LangChain with OpenRouter as the provider.
 * 
 * Structure:
 * - client.ts    → LLM client setup
 * - presets.ts   → Pre-built agents (Otho, Report, Tagger, Guard)
 * - tools.ts     → AI tools (web search, db lookup)
 * - evals.ts     → Evaluation harness
 * - analysis.ts  → Company/founder analysis helpers
 * - context.ts   → Context building with citations
 */

// Client
export {
  createLLM,
  createStreamingLLM,
  llm,
  isAIConfigured,
  isLangChainConfigured, // alias
  MODEL_CONFIG,
  selectModel,
  selectTier,
  type ModelTier,
  type TaskType,
} from "./client"

// Pre-built Agents
export {
  createAgent,
  createOthoAgent,
  createReportAgent,
  createTaggerAgent,
  createGuardAgent,
  simpleCompletion,
  structuredCompletion,
  OTHO_SYSTEM_PROMPT,
  REPORT_GENERATOR_PROMPT,
  TAGGER_PROMPT,
  GUARD_PROMPT,
  type AgentConfig,
  type AgentContext,
  type AgentResponse,
  type ConversationMessage,
} from "./presets"

// Tools
export {
  webSearchTool,
  companyLookupTool,
  founderLookupTool,
  vectorSearchTool,
  analyzeCompanyTool,
  draftEmailTool,
  coreTools,
  chatTools,
  analysisTools,
  reportTools,
  type ToolName,
} from "./tools"

// Evaluation
export {
  evaluateTestCase,
  runEvalSuite,
  runABTest,
  OTHO_SANITY_TESTS,
  REPORT_TESTS,
  GUARD_TESTS,
  type TestCase,
  type EvalResult,
  type EvalSummary,
  type ABTestConfig,
  type ABTestResult,
} from "./evals"

// Analysis
export {
  generateCompanyAnalysis,
  chat,
  chatWithGemini, // legacy alias
  chatAboutCompany,
  buildCompanyPrompt,
  clearAgentCache,
  isGeminiConfigured, // legacy alias
  type CompanyContext,
  type ChatMessage,
} from "./analysis"

// Context
export {
  buildContext,
  getCitationSystemPrompt,
  persistWebDocument,
  type Source,
  type ContextPack,
  type ContextBuilderParams,
  type WebDocumentToStore,
} from "./context"

