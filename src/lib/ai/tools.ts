/**
 * AI Tools
 * 
 * Reusable tools that agents can use:
 * - Web search (Exa)
 * - Database lookups (Company, Founder)
 * - Vector search (Pinecone)
 * - Analysis & drafting
 */

import { tool } from "@langchain/core/tools"
import { z } from "zod"

// ==================== WEB SEARCH ====================

export const webSearchTool = tool(
  async ({ query, numResults = 5 }) => {
    const { exaSearch, isExaConfigured } = await import("../exa")
    
    if (!isExaConfigured()) {
      return JSON.stringify({ error: "Web search not configured", results: [] })
    }

    try {
      const results = await exaSearch({
        query,
        numResults,
        useAutoprompt: true,
        type: "neural",
        contents: {
          text: { maxCharacters: 1000 },
          highlights: { numSentences: 3 },
        },
      })

      return JSON.stringify({
        results: results.map((r) => ({
          title: r.title,
          url: r.url,
          text: r.text?.substring(0, 500) || "",
          highlights: r.highlights?.join(" ") || "",
          publishedDate: r.publishedDate,
        })),
      })
    } catch (error) {
      return JSON.stringify({ error: String(error), results: [] })
    }
  },
  {
    name: "web_search",
    description: "Search the web for information about companies, founders, markets, or any topic.",
    schema: z.object({
      query: z.string().describe("The search query"),
      numResults: z.number().optional().default(5).describe("Number of results"),
    }),
  }
)

// ==================== COMPANY LOOKUP ====================

export const companyLookupTool = tool(
  async ({ companyId, companyName }) => {
    return JSON.stringify({
      action: "company_lookup",
      params: { companyId, companyName },
      note: "This tool requires database access - ensure runtime context is provided",
    })
  },
  {
    name: "company_lookup",
    description: "Look up a company in the database by ID or name.",
    schema: z.object({
      companyId: z.string().optional().describe("The company UUID"),
      companyName: z.string().optional().describe("The company name"),
    }),
  }
)

// ==================== FOUNDER LOOKUP ====================

export const founderLookupTool = tool(
  async ({ founderId, founderName, founderEmail }) => {
    return JSON.stringify({
      action: "founder_lookup",
      params: { founderId, founderName, founderEmail },
      note: "This tool requires database access - ensure runtime context is provided",
    })
  },
  {
    name: "founder_lookup",
    description: "Look up a founder in the database by ID, name, or email.",
    schema: z.object({
      founderId: z.string().optional().describe("The founder UUID"),
      founderName: z.string().optional().describe("The founder name"),
      founderEmail: z.string().optional().describe("The founder email"),
    }),
  }
)

// ==================== VECTOR SEARCH ====================

export const vectorSearchTool = tool(
  async ({ query, namespace, topK = 5 }) => {
    const { isPineconeConfigured } = await import("../pinecone")
    
    if (!isPineconeConfigured()) {
      return JSON.stringify({ error: "Vector search not configured", results: [] })
    }

    return JSON.stringify({
      action: "vector_search",
      params: { query, namespace, topK },
      note: "Vector search requires embedding generation",
    })
  },
  {
    name: "vector_search",
    description: "Search the vector database for semantically similar content.",
    schema: z.object({
      query: z.string().describe("The search query"),
      namespace: z.string().optional().describe("Optional namespace"),
      topK: z.number().optional().default(5).describe("Number of results"),
    }),
  }
)

// ==================== ANALYSIS TOOL ====================

export const analyzeCompanyTool = tool(
  async ({ companyName, analysisType }) => {
    return JSON.stringify({
      action: "analyze_company",
      params: { companyName, analysisType },
      note: "This will trigger an AI analysis chain",
    })
  },
  {
    name: "analyze_company",
    description: "Run a structured analysis on a company.",
    schema: z.object({
      companyName: z.string().describe("The company to analyze"),
      analysisType: z.enum([
        "investment_thesis",
        "risk_assessment", 
        "market_analysis",
        "founder_evaluation",
        "competitive_landscape",
      ]).describe("Type of analysis"),
    }),
  }
)

// ==================== EMAIL DRAFT ====================

export const draftEmailTool = tool(
  async ({ recipient, subject, context, tone }) => {
    return JSON.stringify({
      action: "draft_email",
      params: { recipient, subject, context, tone },
      note: "Email draft will be generated",
    })
  },
  {
    name: "draft_email",
    description: "Draft an email for follow-up with a founder or company.",
    schema: z.object({
      recipient: z.string().describe("Who the email is for"),
      subject: z.string().describe("Email subject line"),
      context: z.string().describe("What to include in the email"),
      tone: z.enum(["professional", "friendly", "direct", "warm"]).optional().default("professional"),
    }),
  }
)

// ==================== TOOL COLLECTIONS ====================

export const coreTools = [webSearchTool]

export const analysisTools = [
  webSearchTool,
  companyLookupTool,
  founderLookupTool,
  analyzeCompanyTool,
]

export const chatTools = [
  webSearchTool,
  companyLookupTool,
  founderLookupTool,
  analyzeCompanyTool,
  draftEmailTool,
]

export const reportTools = [
  webSearchTool,
  companyLookupTool,
  founderLookupTool,
  vectorSearchTool,
  analyzeCompanyTool,
]

export type ToolName = 
  | "web_search"
  | "company_lookup"
  | "founder_lookup"
  | "vector_search"
  | "analyze_company"
  | "draft_email"

