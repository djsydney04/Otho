/**
 * AI Test API
 * 
 * Endpoints for testing the AI module:
 * - GET: Health check
 * - POST: Run completions or evals
 */

import { NextRequest, NextResponse } from "next/server"
import {
  simpleCompletion,
  createOthoAgent,
  isAIConfigured,
  MODEL_CONFIG,
  runEvalSuite,
  OTHO_SANITY_TESTS,
} from "@/lib/ai"

export async function GET() {
  return NextResponse.json({
    status: "AI module is running",
    configured: isAIConfigured(),
    models: MODEL_CONFIG,
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, prompt, tier, runEvals } = body

    if (!isAIConfigured()) {
      return NextResponse.json(
        { error: "OPEN_ROUTER_API not configured" },
        { status: 400 }
      )
    }

    // Run evals
    if (runEvals) {
      const agent = await createOthoAgent()
      const { results, summary } = await runEvalSuite(OTHO_SANITY_TESTS, agent.invoke)
      return NextResponse.json({ success: true, results, summary })
    }

    // Test agent
    if (action === "agent" && prompt) {
      const agent = await createOthoAgent()
      const response = await agent.invoke(prompt, { threadId: body.threadId })
      return NextResponse.json({ success: true, response })
    }

    // Simple completion
    if (action === "complete" && prompt) {
      const result = await simpleCompletion(prompt, {
        tier: tier || "WORKER",
        temperature: 0.7,
      })
      return NextResponse.json({ success: true, response: result })
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'complete', 'agent', or set runEvals: true" },
      { status: 400 }
    )
  } catch (error: any) {
    console.error("AI test error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
