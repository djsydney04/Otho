/**
 * Context Builder
 * 
 * Orchestrates retrieval from:
 * - Internal sources (Pinecone vector search)
 * - External sources (Web search via Exa)
 * 
 * Returns formatted context with citations [S1], [S2], etc.
 */

import { getPineconeIndex, isPineconeConfigured, getSearchHitFields } from "@/lib/pinecone"
import { exaSearch, isExaConfigured, type ExaSearchResult } from "@/lib/exa"

// ==================== TYPES ====================

export interface Source {
  id: string
  type: "INTERNAL" | "WEB"
  sourceType: string
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
  sourceMap: Map<string, Source>
  sourceCitations: string
}

export interface ContextBuilderParams {
  userId: string
  message: string
  companyId?: string
  companyName?: string
  companyWebsite?: string
  companyDescription?: string
  founderId?: string
  founderName?: string
  includeWebSearch?: boolean
}

// ==================== MAIN BUILDER ====================

export async function buildContext(params: ContextBuilderParams): Promise<ContextPack> {
  const {
    userId,
    message,
    companyId,
    companyName,
    companyWebsite,
    companyDescription,
    founderId,
    founderName,
    includeWebSearch = true,
  } = params

  const internalSources: Source[] = []
  const externalSources: Source[] = []

  // Step 1: Pinecone retrieval
  if (isPineconeConfigured()) {
    try {
      const results = await searchPinecone({ userId, query: message, companyId, founderId, topK: 15 })
      internalSources.push(...results)
    } catch (e) {
      console.error("[ContextBuilder] Pinecone search failed:", e)
    }
  }

  // Step 2: Web search if needed
  const needsWebSearch = includeWebSearch && shouldDoWebSearch(message, internalSources.length)

  if (needsWebSearch && isExaConfigured() && (companyName || founderName)) {
    try {
      const results = await searchWeb({ companyName, companyWebsite, companyDescription, founderName, query: message })
      externalSources.push(...results)
    } catch (e) {
      console.error("[ContextBuilder] Web search failed:", e)
    }
  }

  // Step 3: Format context
  const { sourceMap, sourceCitations, contextPackText } = formatContextPack(internalSources, externalSources)

  return { internalSources, externalSources, contextPackText, sourceMap, sourceCitations }
}

// ==================== PINECONE SEARCH ====================

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

  const filter: Record<string, any> = { owner_id: { $eq: userId } }
  if (companyId) filter.company_id = { $eq: companyId }
  if (founderId) filter.founder_id = { $eq: founderId }

  try {
    let results
    try {
      results = await index.namespace(namespace).searchRecords({
        query: { topK: topK * 2, inputs: { text: query }, filter: Object.keys(filter).length > 1 ? filter : undefined },
        rerank: { model: "bge-reranker-v2-m3", topN: topK, rankFields: ["content"] },
      })
    } catch (searchError: any) {
      if (searchError.message?.includes("404") || searchError.name?.includes("NotFound")) {
        return []
      }
      throw searchError
    }

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
        metadata: { score: hit._score, source_id: fields.source_id },
      })
    }

    return sources
  } catch (e: any) {
    console.warn("[Pinecone Search] Error (non-fatal):", e?.message || e)
    return []
  }
}

// ==================== WEB SEARCH ====================

interface WebSearchParams {
  companyName?: string
  companyWebsite?: string
  companyDescription?: string
  founderName?: string
  query: string
}

async function searchWeb(params: WebSearchParams): Promise<Source[]> {
  const { companyName, companyWebsite, companyDescription, founderName } = params

  if (!isExaConfigured()) return []

  const sources: Source[] = []
  const searchQueries: string[] = []

  let domain: string | undefined
  if (companyWebsite) {
    try {
      const url = new URL(companyWebsite.startsWith("http") ? companyWebsite : `https://${companyWebsite}`)
      domain = url.hostname.replace("www.", "")
    } catch { /* ignore */ }
  }

  const descriptionKeywords = companyDescription ? extractKeyTerms(companyDescription) : []

  // Build targeted search queries
  if (companyName) {
    if (domain) {
      searchQueries.push(`site:${domain}`, `"${companyName}" site:${domain}`)
    }
    if (descriptionKeywords.length > 0) {
      const keyTerms = descriptionKeywords.slice(0, 3).join(" ")
      searchQueries.push(`"${companyName}" ${keyTerms}`, `"${companyName}" ${keyTerms} company startup`)
    }
    if (founderName) {
      searchQueries.push(`"${companyName}" "${founderName}" founder`)
    }
    searchQueries.push(`"${companyName}" funding round investment 2024`, `"${companyName}" company startup news`)
  }

  if (founderName) {
    searchQueries.push(`"${founderName}" founder entrepreneur background`)
  }

  // Run searches
  for (const searchQuery of searchQueries.slice(0, 5)) {
    try {
      const results = await exaSearch({
        query: searchQuery,
        numResults: 4,
        useAutoprompt: false,
        type: "neural",
        contents: { text: { maxCharacters: 1500 }, highlights: { numSentences: 5 } },
      })

      for (const result of results) {
        if (sources.some((s) => s.url === result.url)) continue
        if (!isSourceRelevant(result, companyName, domain, descriptionKeywords, founderName)) continue

        sources.push({
          id: result.id,
          type: "WEB",
          sourceType: categorizeWebSource(result),
          title: result.title,
          content: result.text || result.highlights?.join(" ") || "",
          url: result.url,
          date: result.publishedDate,
          metadata: { author: result.author, score: result.score },
        })
      }
    } catch (e) {
      console.error(`[Web Search] Query "${searchQuery}" failed:`, e)
    }
  }

  return sources.slice(0, 10)
}

// ==================== HELPERS ====================

function extractKeyTerms(description: string): string[] {
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might",
    "for", "of", "to", "in", "on", "at", "by", "with", "from", "that", "this", "it", "its",
    "company", "startup", "business", "platform", "solution", "technology", "software", "service"
  ])

  return description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word))
    .slice(0, 10)
}

function isSourceRelevant(
  result: ExaSearchResult,
  companyName?: string,
  domain?: string,
  descriptionKeywords?: string[],
  founderName?: string
): boolean {
  const url = result.url.toLowerCase()
  const title = (result.title || "").toLowerCase()
  const text = (result.text || "").toLowerCase()
  const combined = `${title} ${text}`

  if (domain && url.includes(domain.toLowerCase())) return true

  if (companyName && founderName) {
    const hasCompany = combined.includes(companyName.toLowerCase())
    const hasFounder = combined.includes(founderName.toLowerCase().split(" ")[0])
    if (hasCompany && hasFounder) return true
  }

  if (companyName && descriptionKeywords && descriptionKeywords.length > 0) {
    const hasCompany = combined.includes(companyName.toLowerCase())
    const keywordMatches = descriptionKeywords.filter(kw => combined.includes(kw)).length
    if (hasCompany && keywordMatches >= 2) return true
  }

  if (companyName && combined.includes(companyName.toLowerCase())) return true
  if (founderName && combined.includes(founderName.toLowerCase().split(" ")[0])) return true

  return false
}

function categorizeWebSource(result: ExaSearchResult): string {
  const url = result.url.toLowerCase()
  const title = result.title?.toLowerCase() || ""

  if (url.includes("techcrunch") || url.includes("bloomberg") || url.includes("reuters")) return "news"
  if (url.includes("crunchbase") || url.includes("pitchbook")) return "database"
  if (url.includes("linkedin")) return "linkedin"
  if (title.includes("funding") || title.includes("raises") || title.includes("series")) return "funding"
  
  return "web_page"
}

function shouldDoWebSearch(message: string, internalSourceCount: number): boolean {
  const msg = message.toLowerCase()

  const webTriggers = [
    /what (do|does|is|are) .*(they|company|it|product)/i,
    /website|site|homepage/i,
    /funding|raise|invest|valuation|series/i,
    /news|announcement|recent|latest/i,
    /competitor|market|similar|alternative/i,
  ]

  for (const pattern of webTriggers) {
    if (pattern.test(msg)) return true
  }

  if (internalSourceCount < 6) return true

  return false
}

function formatContextPack(
  internalSources: Source[],
  externalSources: Source[]
): { sourceMap: Map<string, Source>; sourceCitations: string; contextPackText: string } {
  const sourceMap = new Map<string, Source>()
  const citationLines: string[] = []
  const contextLines: string[] = []
  let sourceIndex = 1

  for (const source of internalSources) {
    const key = `S${sourceIndex}`
    sourceMap.set(key, source)
    const dateStr = source.date ? ` (${new Date(source.date).toLocaleDateString()})` : ""
    citationLines.push(`${key}: [INTERNAL/${source.sourceType}] ${source.title}${dateStr}`)
    contextLines.push(`[${key}] ${source.content.slice(0, 500)}${source.content.length > 500 ? "..." : ""}`)
    sourceIndex++
  }

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

// ==================== CITATION PROMPT ====================

export function getCitationSystemPrompt(): string {
  return `CITATION RULES:
- Use ONLY the provided sources to answer questions.
- Every factual claim MUST include a citation [S#] (e.g., [S1], [S2]).
- If information is not in the sources, say "I couldn't find information about this in the available sources."
- Never make up facts or URLs.`
}

// ==================== PERSIST WEB DOCS ====================

export interface WebDocumentToStore {
  url: string
  title: string
  content: string
  companyId?: string
  founderId?: string
  retrievedAt: string
}

export async function persistWebDocument(userId: string, document: WebDocumentToStore): Promise<void> {
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
  
  if (document.companyId) record.company_id = document.companyId
  if (document.founderId) record.founder_id = document.founderId

  try {
    await index.namespace(namespace).upsertRecords([record])
  } catch (e) {
    console.error("[PersistWebDocument] Failed to store:", e)
  }
}

