/**
 * Evaluation Harness
 * 
 * Tools to test and evaluate agent performance:
 * - Test cases with expected outputs
 * - Quality metrics
 * - A/B testing for model comparisons
 */

import { z } from "zod"
import type { AgentResponse } from "./presets"
import { simpleCompletion } from "./presets"

// ==================== TYPES ====================

export interface TestCase {
  id: string
  name: string
  description?: string
  input: string
  context?: Record<string, any>
  expectedOutput?: string
  expectedContains?: string[]
  expectedNotContains?: string[]
  expectedStructure?: z.ZodType
  maxLatencyMs?: number
  tags?: string[]
}

export interface EvalResult {
  testId: string
  testName: string
  passed: boolean
  score: number
  metrics: {
    relevance?: number
    accuracy?: number
    citationRate?: number
    latencyMs: number
    tokenCount?: number
  }
  issues: string[]
  response: AgentResponse
}

export interface EvalSummary {
  totalTests: number
  passed: number
  failed: number
  averageScore: number
  averageLatency: number
  byTag: Record<string, { passed: number; failed: number; avgScore: number }>
}

// ==================== EVALUATOR FUNCTIONS ====================

function checkContains(content: string, expected: string[]): { passed: boolean; missing: string[] } {
  const lowerContent = content.toLowerCase()
  const missing = expected.filter(e => !lowerContent.includes(e.toLowerCase()))
  return { passed: missing.length === 0, missing }
}

function checkNotContains(content: string, forbidden: string[]): { passed: boolean; found: string[] } {
  const lowerContent = content.toLowerCase()
  const found = forbidden.filter(f => lowerContent.includes(f.toLowerCase()))
  return { passed: found.length === 0, found }
}

function countCitations(content: string): number {
  const matches = content.match(/\[S\d+\]/g)
  return matches ? matches.length : 0
}

async function llmEvaluate(
  input: string,
  response: string,
  criteria: string
): Promise<{ score: number; reasoning: string }> {
  const evalPrompt = `Evaluate the following AI response based on the given criteria.

USER INPUT: ${input}

AI RESPONSE: ${response}

CRITERIA: ${criteria}

Rate the response from 0 to 10 where:
- 0-3: Poor
- 4-6: Acceptable
- 7-8: Good
- 9-10: Excellent

Respond in JSON format:
{
  "score": <number 0-10>,
  "reasoning": "<brief explanation>"
}`

  try {
    const result = await simpleCompletion(evalPrompt, { tier: "CHEAP", temperature: 0.1 })
    const parsed = JSON.parse(result)
    return {
      score: Math.min(10, Math.max(0, parsed.score)) / 10,
      reasoning: parsed.reasoning || "",
    }
  } catch {
    return { score: 0.5, reasoning: "Evaluation failed" }
  }
}

// ==================== MAIN EVALUATOR ====================

export async function evaluateTestCase(
  testCase: TestCase,
  agentInvoke: (input: string, context?: any) => Promise<AgentResponse>
): Promise<EvalResult> {
  const issues: string[] = []
  let score = 1.0

  const response = await agentInvoke(testCase.input, testCase.context)

  if (testCase.maxLatencyMs && response.latencyMs > testCase.maxLatencyMs) {
    issues.push(`Latency ${response.latencyMs}ms exceeds max ${testCase.maxLatencyMs}ms`)
    score -= 0.1
  }

  if (testCase.expectedContains) {
    const { passed, missing } = checkContains(response.content, testCase.expectedContains)
    if (!passed) {
      issues.push(`Missing expected content: ${missing.join(", ")}`)
      score -= 0.2 * (missing.length / testCase.expectedContains.length)
    }
  }

  if (testCase.expectedNotContains) {
    const { passed, found } = checkNotContains(response.content, testCase.expectedNotContains)
    if (!passed) {
      issues.push(`Contains forbidden content: ${found.join(", ")}`)
      score -= 0.3 * (found.length / testCase.expectedNotContains.length)
    }
  }

  if (testCase.expectedStructure && response.structuredOutput) {
    try {
      testCase.expectedStructure.parse(response.structuredOutput)
    } catch (e) {
      issues.push(`Structured output doesn't match schema: ${e}`)
      score -= 0.2
    }
  }

  let relevanceScore = 0.7
  if (testCase.expectedOutput) {
    const relevanceEval = await llmEvaluate(
      testCase.input,
      response.content,
      `The response should be similar in meaning and quality to: "${testCase.expectedOutput}"`
    )
    relevanceScore = relevanceEval.score
    if (relevanceScore < 0.5) {
      issues.push(`Low relevance score: ${relevanceEval.reasoning}`)
    }
    score = (score + relevanceScore) / 2
  }

  const citationCount = countCitations(response.content)
  const citationRate = response.content.length > 500 ? citationCount / (response.content.length / 500) : 0

  return {
    testId: testCase.id,
    testName: testCase.name,
    passed: score >= 0.6 && issues.length === 0,
    score: Math.max(0, Math.min(1, score)),
    metrics: { relevance: relevanceScore, citationRate, latencyMs: response.latencyMs },
    issues,
    response,
  }
}

export async function runEvalSuite(
  testCases: TestCase[],
  agentInvoke: (input: string, context?: any) => Promise<AgentResponse>
): Promise<{ results: EvalResult[]; summary: EvalSummary }> {
  const results: EvalResult[] = []

  for (const testCase of testCases) {
    console.log(`Running test: ${testCase.name}...`)
    const result = await evaluateTestCase(testCase, agentInvoke)
    results.push(result)
    console.log(`  ${result.passed ? "✓" : "✗"} Score: ${(result.score * 100).toFixed(1)}%`)
  }

  const passed = results.filter(r => r.passed).length
  const failed = results.length - passed
  const averageScore = results.reduce((sum, r) => sum + r.score, 0) / results.length
  const averageLatency = results.reduce((sum, r) => sum + r.metrics.latencyMs, 0) / results.length

  const byTag: Record<string, { passed: number; failed: number; avgScore: number }> = {}
  for (const testCase of testCases) {
    for (const tag of testCase.tags || ["untagged"]) {
      if (!byTag[tag]) byTag[tag] = { passed: 0, failed: 0, avgScore: 0 }
      const result = results.find(r => r.testId === testCase.id)!
      if (result.passed) byTag[tag].passed++
      else byTag[tag].failed++
      byTag[tag].avgScore = (byTag[tag].avgScore * (byTag[tag].passed + byTag[tag].failed - 1) + result.score) / (byTag[tag].passed + byTag[tag].failed)
    }
  }

  return {
    results,
    summary: { totalTests: testCases.length, passed, failed, averageScore, averageLatency, byTag },
  }
}

// ==================== PRE-BUILT TEST SUITES ====================

export const OTHO_SANITY_TESTS: TestCase[] = [
  {
    id: "otho-greeting",
    name: "Basic greeting response",
    input: "Hello, what can you help me with?",
    expectedContains: ["help", "company", "invest"],
    maxLatencyMs: 5000,
    tags: ["basic", "chat"],
  },
  {
    id: "otho-company-question",
    name: "Company analysis question",
    input: "What should I look for when evaluating an early-stage fintech startup?",
    expectedContains: ["market", "team", "product"],
    expectedNotContains: ["I don't know", "I cannot help"],
    maxLatencyMs: 10000,
    tags: ["analysis", "chat"],
  },
]

export const REPORT_TESTS: TestCase[] = [
  {
    id: "report-structure",
    name: "Report has proper structure",
    input: "Generate a brief investment memo for a hypothetical AI startup called TechCo that builds developer tools.",
    expectedContains: ["TechCo", "investment", "risk"],
    maxLatencyMs: 30000,
    tags: ["report", "structure"],
  },
]

export const GUARD_TESTS: TestCase[] = [
  {
    id: "guard-valid",
    name: "Valid content passes",
    input: `Validate this content: "The company was founded in 2020 [S1] and raised $5M [S2]."
    
Sources:
[S1] Company profile states founding year 2020
[S2] Press release announces $5M seed round`,
    expectedContains: ["valid"],
    maxLatencyMs: 5000,
    tags: ["guard", "validation"],
  },
]

// ==================== A/B TESTING ====================

export interface ABTestConfig {
  name: string
  testCases: TestCase[]
  variants: { name: string; model: string; temperature?: number }[]
}

export interface ABTestResult {
  testName: string
  variants: { name: string; summary: EvalSummary; results: EvalResult[] }[]
  winner: string
  analysis: string
}

export async function runABTest(
  config: ABTestConfig,
  createAgentFn: (model: string, temperature?: number) => Promise<{
    invoke: (input: string, context?: any) => Promise<AgentResponse>
  }>
): Promise<ABTestResult> {
  const variantResults: ABTestResult["variants"] = []

  for (const variant of config.variants) {
    console.log(`\nTesting variant: ${variant.name}`)
    const agent = await createAgentFn(variant.model, variant.temperature)
    const { results, summary } = await runEvalSuite(config.testCases, agent.invoke)
    variantResults.push({ name: variant.name, summary, results })
  }

  const winner = variantResults.reduce((best, current) => 
    current.summary.averageScore > best.summary.averageScore ? current : best
  )

  const analysis = variantResults.map(v => 
    `${v.name}: ${(v.summary.averageScore * 100).toFixed(1)}% score, ${v.summary.averageLatency.toFixed(0)}ms avg latency`
  ).join("\n")

  return { testName: config.name, variants: variantResults, winner: winner.name, analysis }
}

