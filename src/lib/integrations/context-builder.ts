/**
 * Context Builder
 * 
 * Orchestrates retrieval from:
 * - Internal sources (Pinecone)
 * - External sources (Web via Exa)
 * 
 * Returns formatted context pack with citations [S1], [S2], etc.
 */

import { getPineconeIndex, isPineconeConfigured, getSearchHitFields } from "@/lib/pinecone"
import { exaSearch, isExaConfigured, type ExaSearchResult } from "@/lib/exa"

// =============================================================================
// Types
// =============================================================================

export interface Source {
  id: string
  type: "INTERNAL" | "WEB"
  sourceType: string // comment, gmail, calendar, drive, company_profile, ai_analysis, web_page, news
  title: string
  content: string
  url?: string
  date?: string
  companyId?: string
  founderId?: string
  metadata?: Record<string, any>
}

export interface ContextPack {
  internalSources: Source[]
  externalSources: Source[]
  contextPackText: string
  sourceMap: Map<string, Source> // S1 -> Source
  sourceCitations: string // "S1: [INTERNAL] Note from 2024-01-15..."
}

export interface ContextBuilderParams {
  userId: string
  message: string
  companyId?: string
  companyName?: string
  founderId?: string
  founderName?: string
  includeWebSearch?: boolean
}

// =============================================================================
// Main Context Builder
// =============================================================================

export async function buildContext(params: ContextBuilderParams): Promise<ContextPack> {
  const {
    userId,
    message,
    companyId,
    companyName,
    founderId,
    founderName,
    includeWebSearch = true,
  } = params

  const internalSources: Source[] = []
  const externalSources: Source[] = []

  // Step 1: Pinecone retrieval (internal)
  if (isPineconeConfigured()) {
    try {
      const pineconeResults = await searchPinecone({
        userId,
        query: message,
        companyId,
        founderId,
        topK: 15,
      })
      internalSources.push(...pineconeResults)
    } catch (e) {
      console.error("[ContextBuilder] Pinecone search failed:", e)
    }
  }

  // Step 2: Decide if we need web search
  const needsWebSearch = includeWebSearch && shouldDoWebSearch(message, internalSources.length)

  // Step 3: Web search (external)
  if (needsWebSearch && isExaConfigured() && (companyName || founderName)) {
    try {
      const webResults = await searchWeb({
        companyName,
        founderName,
        query: message,
      })
      externalSources.push(...webResults)
    } catch (e) {
      console.error("[ContextBuilder] Web search failed:", e)
    }
  }

  // Step 4: Build source map and formatted text
  const { sourceMap, sourceCitations, contextPackText } = formatContextPack(
    internalSources,
    externalSources
  )

  return {
    internalSources,
    externalSources,
    contextPackText,
    sourceMap,
    sourceCitations,
  }
}

// =============================================================================
// Pinecone Search
// =============================================================================

interface PineconeSearchParams {
  userId: string
  query: string
  companyId?: string
  founderId?: string
  topK?: number
}

async function searchPinecone(params: PineconeSearchParams): Promise<Source[]> {
  const { userId, query, companyId, founderId, topK = 15 } = params

  if (!isPineconeConfigured()) return []

  const index = getPineconeIndex()
  const namespace = `user_${userId}`

  // Build filter
  const filter: Record<string, any> = {
    owner_id: { $eq: userId },
  }

  if (companyId) {
    filter.company_id = { $eq: companyId }
  }

  if (founderId) {
    filter.founder_id = { $eq: founderId }
  }

  try {
    const results = await index.namespace(namespace).searchRecords({
      query: {
        topK: topK * 2, // Get more for reranking
        inputs: { text: query },
        filter: Object.keys(filter).length > 1 ? filter : undefined,
      },
      rerank: {
        model: "bge-reranker-v2-m3",
        topN: topK,
        rankFields: ["content"],
      },
    })

    const sources: Source[] = []

    for (const hit of results.result.hits) {
      const fields = getSearchHitFields<{
        content?: string
        source_type?: string
        source_id?: string
        title?: string
        created_at?: string
        company_id?: string
        founder_id?: string
      }>(hit)

      sources.push({
        id: hit._id,
        type: "INTERNAL",
        sourceType: fields.source_type || "note",
        title: fields.title || "Untitled",
        content: fields.content || "",
        date: fields.created_at,
        companyId: fields.company_id,
        founderId: fields.founder_id,
        metadata: {
          score: hit._score,
          source_id: fields.source_id,
        },
      })
    }

    return sources
  } catch (e) {
    console.error("[Pinecone Search] Error:", e)
    return []
  }
}

// =============================================================================
// Web Search (Exa)
// =============================================================================

interface WebSearchParams {
  companyName?: string
  founderName?: string
  query: string
}

async function searchWeb(params: WebSearchParams): Promise<Source[]> {
  const { companyName, founderName, query } = params

  if (!isExaConfigured()) return []

  const sources: Source[] = []
  const searchQueries: string[] = []

  // Build search queries based on entity type
  if (companyName) {
    searchQueries.push(
      `"${companyName}" official website`,
      `"${companyName}" funding round investment`,
      `"${companyName}" news startup`,
      `"${companyName}" product pricing`,
    )
  }

  if (founderName) {
    searchQueries.push(
      `"${founderName}" founder entrepreneur`,
      `"${founderName}" background startup`,
    )
  }

  // If user query seems to need specific info, add targeted search
  if (query.match(/competitor|market|similar|alternative/i)) {
    const entity = companyName || founderName
    if (entity) searchQueries.push(`"${entity}" competitors market`)
  }

  if (query.match(/pricing|cost|subscription|plan/i)) {
    if (companyName) searchQueries.push(`"${companyName}" pricing plans`)
  }

  if (query.match(/funding|raise|invest|valuation/i)) {
    if (companyName) searchQueries.push(`"${companyName}" funding series valuation`)
  }

  // Run searches (limit to 3 queries to avoid rate limits)
  const queriesToRun = searchQueries.slice(0, 3)

  for (const searchQuery of queriesToRun) {
    try {
      const results = await exaSearch({
        query: searchQuery,
        numResults: 3,
        useAutoprompt: false,
        type: "neural",
        contents: {
          text: { maxCharacters: 1000 },
          highlights: { numSentences: 3 },
        },
      })

      for (const result of results) {
        // Avoid duplicates
        if (sources.some((s) => s.url === result.url)) continue

        sources.push({
          id: result.id,
          type: "WEB",
          sourceType: categorizeWebSource(result),
          title: result.title,
          content: result.text || result.highlights?.join(" ") || "",
          url: result.url,
          date: result.publishedDate,
          metadata: {
            author: result.author,
            score: result.score,
          },
        })
      }
    } catch (e) {
      console.error(`[Web Search] Query "${searchQuery}" failed:`, e)
    }
  }

  // Limit to top 8 web results
  return sources.slice(0, 8)
}

function categorizeWebSource(result: ExaSearchResult): string {
  const url = result.url.toLowerCase()
  const title = result.title?.toLowerCase() || ""

  if (url.includes("techcrunch") || url.includes("bloomberg") || url.includes("reuters")) {
    return "news"
  }
  if (url.includes("crunchbase") || url.includes("pitchbook")) {
    return "database"
  }
  if (url.includes("linkedin")) {
    return "linkedin"
  }
  if (title.includes("funding") || title.includes("raises") || title.includes("series")) {
    return "funding"
  }
  if (url.includes("docs.") || url.includes("/docs/") || title.includes("documentation")) {
    return "docs"
  }
  
  return "web_page"
}

// =============================================================================
// Web Search Trigger Logic
// =============================================================================

function shouldDoWebSearch(message: string, internalSourceCount: number): boolean {
  const msg = message.toLowerCase()

  // Always trigger for these patterns
  const webTriggers = [
    /what (do|does|is|are) .*(they|company|it|product)/i,
    /website|site|homepage/i,
    /pricing|cost|subscription|plan/i,
    /customer|client|user/i,
    /funding|raise|invest|valuation|series/i,
    /news|announcement|recent|latest/i,
    /competitor|market|similar|alternative/i,
    /product|feature|offering/i,
  ]

  for (const pattern of webTriggers) {
    if (pattern.test(msg)) return true
  }

  // If Pinecone returned few results, do web search
  if (internalSourceCount < 6) return true

  return false
}

// =============================================================================
// Format Context Pack
// =============================================================================

function formatContextPack(
  internalSources: Source[],
  externalSources: Source[]
): {
  sourceMap: Map<string, Source>
  sourceCitations: string
  contextPackText: string
} {
  const sourceMap = new Map<string, Source>()
  const citationLines: string[] = []
  const contextLines: string[] = []
  let sourceIndex = 1

  // Add internal sources first
  for (const source of internalSources) {
    const key = `S${sourceIndex}`
    sourceMap.set(key, source)

    const dateStr = source.date ? ` (${new Date(source.date).toLocaleDateString()})` : ""
    citationLines.push(`${key}: [INTERNAL/${source.sourceType}] ${source.title}${dateStr}`)
    contextLines.push(`[${key}] ${source.content.slice(0, 500)}${source.content.length > 500 ? "..." : ""}`)

    sourceIndex++
  }

  // Add external sources
  for (const source of externalSources) {
    const key = `S${sourceIndex}`
    sourceMap.set(key, source)

    const dateStr = source.date ? ` (${new Date(source.date).toLocaleDateString()})` : ""
    citationLines.push(`${key}: [WEB/${source.sourceType}] ${source.title}${dateStr} - ${source.url}`)
    contextLines.push(`[${key}] ${source.content.slice(0, 500)}${source.content.length > 500 ? "..." : ""}`)

    sourceIndex++
  }

  return {
    sourceMap,
    sourceCitations: citationLines.join("\n"),
    contextPackText: contextLines.join("\n\n"),
  }
}

// =============================================================================
// Citation Prompt
// =============================================================================

export function getCitationSystemPrompt(): string {
  return `CITATION RULES:
- Use ONLY the provided sources to answer questions.
- Every factual claim MUST include a citation [S#] (e.g., [S1], [S2]).
- If information is not in the sources, say "I couldn't find information about this in the available sources."
- Never make up facts or URLs.
- At the end of your response, list the sources you cited.

OUTPUT FORMAT:
1. Answer with inline citations [S#]
2. Sources section listing cited sources`
}

// =============================================================================
// Persist Web Results (Flywheel)
// =============================================================================

export interface WebDocumentToStore {
  url: string
  title: string
  content: string
  companyId?: string
  founderId?: string
  retrievedAt: string
}

/**
 * Store web documents for future retrieval (flywheel pattern)
 * Call this after successful web search to build internal knowledge
 */
export async function persistWebDocument(
  userId: string,
  document: WebDocumentToStore
): Promise<void> {
  if (!isPineconeConfigured()) return

  const index = getPineconeIndex()
  const namespace = `user_${userId}`

  const record: Record<string, any> = {
    _id: `web_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    content: document.content,
    source_type: "web_document",
    source_id: document.url,
    title: document.title,
    created_at: document.retrievedAt,
    owner_id: userId,
    url: document.url,
  }
  
  // Only add optional fields if they have values
  if (document.companyId) record.company_id = document.companyId
  if (document.founderId) record.founder_id = document.founderId

  try {
    await index.namespace(namespace).upsertRecords([record])
  } catch (e) {
    console.error("[PersistWebDocument] Failed to store:", e)
  }
}

