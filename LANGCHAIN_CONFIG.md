# AI Module Configuration

All AI interactions in Otho go through the `@/lib/ai` module, which uses LangChain with OpenRouter.

## Quick Start

1. Set your OpenRouter API key in `.env.local`:
```bash
OPEN_ROUTER_API=your-openrouter-api-key
```

2. (Optional) Configure model tiers:
```bash
MODEL_CHEAP=openai/gpt-oss-20b
MODEL_WORKER=openai/gpt-oss-120b
MODEL_PREMIUM=anthropic/claude-sonnet-4
MODEL_FALLBACK=meta-llama/llama-3.2-3b-instruct:free
```

3. Test:
```bash
curl http://localhost:3000/api/langchain/test
```

## File Structure

```
src/lib/ai/
├── index.ts      # Main exports
├── client.ts     # LLM client setup
├── presets.ts    # Pre-built agents (Otho, Report, Tagger, Guard)
├── tools.ts      # AI tools (web search, db lookup)
├── evals.ts      # Evaluation harness
├── analysis.ts   # Company/founder analysis
└── context.ts    # Context building with citations
```

## Model Tiers

| Tier | Default | Use Cases |
|------|---------|-----------|
| CHEAP | `openai/gpt-oss-20b` | Tagging, classification |
| WORKER | `openai/gpt-oss-120b` | Summaries, analysis, reports |
| PREMIUM | `anthropic/claude-sonnet-4` | User-facing chat, strategy |
| FALLBACK | `meta-llama/llama-3.2-3b-instruct:free` | Fallback when primary fails |

## Usage Examples

### Simple Completion
```typescript
import { simpleCompletion } from "@/lib/ai"

const result = await simpleCompletion("Summarize this company", {
  task: "summary",
  temperature: 0.7,
})
```

### Structured Output
```typescript
import { structuredCompletion } from "@/lib/ai"
import { z } from "zod"

const schema = z.object({
  category: z.string(),
  confidence: z.number(),
})

const result = await structuredCompletion(
  "Classify this: AI developer tools company",
  schema,
  { task: "classification" }
)
```

### Pre-built Agents
```typescript
import { createOthoAgent, createReportAgent, createTaggerAgent } from "@/lib/ai"

// Chat agent with memory
const otho = await createOthoAgent()
const response = await otho.invoke("What should I look for in a startup?", {
  threadId: "conversation-123",
})

// Report generator
const reportAgent = await createReportAgent()
const memo = await reportAgent.invoke("Generate investment memo for TechCo")

// Tagger
const tagger = await createTaggerAgent()
const tags = await tagger.invoke("Classify: B2B SaaS for accounting")
```

### Company Analysis
```typescript
import { generateCompanyAnalysis, buildContext } from "@/lib/ai"

// Generate analysis
const analysis = await generateCompanyAnalysis({
  name: "TechCo",
  description: "AI-powered developer tools",
  website: "https://techco.ai",
  founderName: "Jane Smith",
})

// Build context with citations
const context = await buildContext({
  userId: "user-123",
  message: "Tell me about TechCo",
  companyName: "TechCo",
  includeWebSearch: true,
})
```

### Run Evaluations
```typescript
import { runEvalSuite, OTHO_SANITY_TESTS, createOthoAgent } from "@/lib/ai"

const agent = await createOthoAgent()
const { results, summary } = await runEvalSuite(OTHO_SANITY_TESTS, agent.invoke)

console.log(`Passed: ${summary.passed}/${summary.totalTests}`)
```

## API Endpoints

### Health Check
```bash
GET /api/langchain/test
```

### Test Completion
```bash
POST /api/langchain/test
{
  "action": "complete",
  "prompt": "Hello!",
  "tier": "WORKER"
}
```

### Test Agent
```bash
POST /api/langchain/test
{
  "action": "agent",
  "prompt": "What should I look for?",
  "threadId": "test-123"
}
```

### Run Evals
```bash
POST /api/langchain/test
{
  "runEvals": true
}
```

## Task Types

| Task | Tier | Description |
|------|------|-------------|
| `tagging` | CHEAP | Adding tags |
| `classification` | CHEAP | Categorizing |
| `entity_extraction` | CHEAP | Extracting entities |
| `summary` | WORKER | Generating summaries |
| `analysis_draft` | WORKER | Draft analysis |
| `ranking` | WORKER | Ranking items |
| `report_generation` | WORKER | Creating reports |
| `chat` | PREMIUM | User conversations |
| `strategy` | PREMIUM | Strategic advice |
| `reasoning` | PREMIUM | Complex reasoning |

## LangSmith Tracing (Optional)

```bash
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your-langsmith-api-key
LANGCHAIN_PROJECT=otho-dev
```
