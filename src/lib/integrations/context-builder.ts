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
  companyWebsite?: string       // Used for more accurate web search
  companyDescription?: string   // Used to filter irrelevant sources
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
    companyWebsite,
    companyDescription,
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
        companyWebsite,
        companyDescription,
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
    // Wrap in try-catch to handle index not found errors gracefully
    let results
    try {
      results = await index.namespace(namespace).searchRecords({
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
    } catch (searchError: any) {
      // Handle Pinecone index not found - return empty results
      if (searchError.message?.includes("404") || searchError.name?.includes("NotFound")) {
        console.log("[Pinecone Search] Index not found, skipping internal search")
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
        metadata: {
          score: hit._score,
          source_id: fields.source_id,
        },
      })
    }

    return sources
  } catch (e: any) {
    // Gracefully handle all Pinecone errors - reports should still work without internal context
    console.warn("[Pinecone Search] Error (non-fatal):", e?.message || e)
    return []
  }
}

// =============================================================================
// Web Search (Exa)
// =============================================================================

interface WebSearchParams {
  companyName?: string
  companyWebsite?: string
  companyDescription?: string
  founderName?: string
  query: string
}

async function searchWeb(params: WebSearchParams): Promise<Source[]> {
  const { companyName, companyWebsite, companyDescription, founderName, query } = params

  if (!isExaConfigured()) return []

  const sources: Source[] = []
  const searchQueries: string[] = []

  // Extract domain from website for more accurate searches
  let domain: string | undefined
  if (companyWebsite) {
    try {
      const url = new URL(companyWebsite.startsWith("http") ? companyWebsite : `https://${companyWebsite}`)
      domain = url.hostname.replace("www.", "")
    } catch {
      // Ignore invalid URLs
    }
  }

  // Extract key terms from description for disambiguation
  const descriptionKeywords = companyDescription
    ? extractKeyTerms(companyDescription)
    : []

  // Build highly targeted search queries
  if (companyName) {
    // Primary: Search with domain for exact company match
    if (domain) {
      searchQueries.push(
        `site:${domain}`,
        `"${companyName}" site:${domain}`,
      )
    }

    // Secondary: Search with company name + unique description terms
    if (descriptionKeywords.length > 0) {
      const keyTerms = descriptionKeywords.slice(0, 3).join(" ")
      searchQueries.push(
        `"${companyName}" ${keyTerms}`,
        `"${companyName}" ${keyTerms} company startup`,
      )
    }

    // Founder name helps disambiguate significantly
    if (founderName) {
      searchQueries.push(
        `"${companyName}" "${founderName}" founder`,
        `"${companyName}" "${founderName}" startup company`,
      )
    }

    // General searches (lower priority)
    searchQueries.push(
      `"${companyName}" funding round investment 2024`,
      `"${companyName}" company startup news`,
    )
  }

  // Founder-specific searches
  if (founderName) {
    if (companyName) {
      searchQueries.push(
        `"${founderName}" "${companyName}" founder CEO`,
      )
    }
    searchQueries.push(
      `"${founderName}" founder entrepreneur background`,
      `"${founderName}" startup CEO interview`,
    )
  }

  // Run targeted searches (up to 5 queries)
  const queriesToRun = searchQueries.slice(0, 5)

  for (const searchQuery of queriesToRun) {
    try {
      const results = await exaSearch({
        query: searchQuery,
        numResults: 4,
        useAutoprompt: false,
        type: "neural",
        contents: {
          text: { maxCharacters: 1500 },
          highlights: { numSentences: 5 },
        },
      })

      for (const result of results) {
        // Avoid duplicates
        if (sources.some((s) => s.url === result.url)) continue

        // CRITICAL: Filter out sources that don't match the company
        if (!isSourceRelevant(result, companyName, domain, descriptionKeywords, founderName)) {
          console.log(`[Web Search] Filtered irrelevant source: ${result.url}`)
          continue
        }

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

  // Limit to top 10 verified results
  return sources.slice(0, 10)
}

/**
 * Extract key unique terms from description for disambiguation
 */
function extractKeyTerms(description: string): string[] {
  // Common words to exclude
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "is", "are", "was", "were",
    "be", "been", "being", "have", "has", "had", "do", "does", "did",
    "will", "would", "could", "should", "may", "might", "must",
    "for", "of", "to", "in", "on", "at", "by", "with", "from",
    "that", "this", "it", "its", "their", "our", "your", "we", "they",
    "company", "startup", "business", "platform", "solution", "solutions",
    "technology", "software", "service", "services"
  ])

  return description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word))
    .slice(0, 10) // Top 10 unique terms
}

/**
 * Check if a source is actually relevant to the company
 * This prevents mixing up companies with similar names
 */
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

  // High confidence: URL matches company domain
  if (domain && url.includes(domain.toLowerCase())) {
    return true
  }

  // High confidence: Both company name AND founder name appear
  if (companyName && founderName) {
    const hasCompany = combined.includes(companyName.toLowerCase())
    const hasFounder = combined.includes(founderName.toLowerCase().split(" ")[0])
    if (hasCompany && hasFounder) {
      return true
    }
  }

  // Medium confidence: Company name + multiple description keywords
  if (companyName && descriptionKeywords && descriptionKeywords.length > 0) {
    const hasCompany = combined.includes(companyName.toLowerCase())
    const keywordMatches = descriptionKeywords.filter(kw => combined.includes(kw)).length
    if (hasCompany && keywordMatches >= 2) {
      return true
    }
  }

  // Check for common disambiguators - reject sources about clearly different companies
  // These patterns suggest a DIFFERENT company with similar name
  const differentCompanyIndicators = [
    /acquired (?:on|in) (?:19|200[0-9]|201[0-5])/, // Old acquisitions
    /therapeutics|pharmaceutical|biotech|medical/i, // Different industry
    /(?:raised|funding).*\$\d+[mb].*(?:19|200[0-9]|201[0-5])/, // Old funding
  ]

  for (const pattern of differentCompanyIndicators) {
    if (pattern.test(combined)) {
      // Unless our description also mentions these terms
      const descText = (descriptionKeywords || []).join(" ").toLowerCase()
      if (pattern.test(descText)) {
        continue // Our company does match this pattern, keep it
      }
      return false // Different company
    }
  }

  // Low confidence: Just has company name - allow but flag in logs
  if (companyName && combined.includes(companyName.toLowerCase())) {
    return true
  }

  // Founder name only - allow for founder-specific searches
  if (founderName && combined.includes(founderName.toLowerCase().split(" ")[0])) {
    return true
  }

  // No clear match - reject
  return false
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

