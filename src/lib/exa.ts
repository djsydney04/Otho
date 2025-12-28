import Exa from "exa-js"

// Initialize Exa client
const EXA_API_KEY = process.env.EXA_API_KEY

export function getExaClient() {
  if (!EXA_API_KEY) {
    throw new Error("EXA_API_KEY is not configured")
  }
  return new Exa(EXA_API_KEY)
}

export function isExaConfigured() {
  return !!EXA_API_KEY
}

// =============================================================================
// Premium News Sources - Curated for VC Alpha
// =============================================================================

// Tier 1: Insider publications with exclusive scoops
export const INSIDER_SOURCES = [
  "theinformation.com",
  "newcomer.co",
  "bloomberg.com",
  "reuters.com",
]

// Tier 2: Quality tech and business journalism  
export const TECH_BUSINESS_SOURCES = [
  "techcrunch.com",
  "axios.com",
  "semafor.com",
  "ft.com",
  "wsj.com",
  "forbes.com",
  "fortune.com",
  "cnbc.com",
]

// Tier 3: VC/Startup ecosystem
export const VC_ECOSYSTEM_SOURCES = [
  "pitchbook.com",
  "crunchbase.com",
  "venturebeat.com",
  "inc.com",
  "fastcompany.com",
  "businessinsider.com",
  "protocol.com",
]

// Tier 4: Deep analysis & thought leadership
export const ANALYSIS_SOURCES = [
  "stratechery.com",
  "notboring.co",
  "every.to",
  "generalist.com",
  "platformer.news",
  "pragmaticengineer.com",
  "lennysnewsletter.com",
  "thegeneralist.substack.com",
  "readmultiplex.com",
  "hbr.org",
]

// Industry verticals
export const VERTICAL_SOURCES = {
  ai: [
    "openai.com/blog",
    "anthropic.com",
    "deepmind.google",
    "huggingface.co/blog",
    "technologyreview.com",
    "arxiv.org",
    "ai.meta.com",
    "theverge.com",
    "wired.com",
    "arstechnica.com",
  ],
  fintech: [
    "finextra.com",
    "pymnts.com",
    "tearsheet.co",
    "fintechfutures.com",
    "coindesk.com",
    "theblock.co",
  ],
  healthtech: [
    "statnews.com",
    "healthcareitnews.com",
    "fiercehealthcare.com",
    "mobihealthnews.com",
    "medcitynews.com",
  ],
  defense: [
    "defensenews.com",
    "c4isrnet.com",
    "defenseone.com",
    "breakingdefense.com",
    "aviationweek.com",
  ],
  climate: [
    "canarymedia.com",
    "greentechmedia.com",
    "electrek.co",
    "cleantech.com",
    "climatetechvc.substack.com",
  ],
  enterprise: [
    "enterprisetech.com",
    "zdnet.com",
    "infoworld.com",
    "computerworld.com",
  ],
}

// All premium sources combined
export const ALL_PREMIUM_SOURCES = [
  ...INSIDER_SOURCES,
  ...TECH_BUSINESS_SOURCES,
  ...VC_ECOSYSTEM_SOURCES,
  ...ANALYSIS_SOURCES,
]

// =============================================================================
// Webset Configurations - Alpha-Generating Topics for VCs
// =============================================================================

export const WEBSET_CONFIGS = [
  {
    id: "breaking-deals",
    name: "Breaking Deals",
    description: "Fresh funding rounds, acquisitions, and exits",
    query: "startup funding round raised million series seed venture capital acquisition exit IPO",
    criteria: [
      { description: "Announced in last 48 hours" },
      { description: "Specific funding amount mentioned" },
      { description: "Named investors or acquirers" },
    ],
    includeDomains: [...INSIDER_SOURCES, ...TECH_BUSINESS_SOURCES, ...VC_ECOSYSTEM_SOURCES],
    icon: "trending",
    color: "amber",
    priority: 1,
  },
  {
    id: "ai-frontier",
    name: "AI Frontier",
    description: "Breakthroughs, launches, and market shifts in AI",
    query: "artificial intelligence AI startup launch product GPT LLM foundation model breakthrough company",
    criteria: [
      { description: "New AI product or capability" },
      { description: "Company or research announcement" },
      { description: "Market or competitive implications" },
    ],
    includeDomains: [...INSIDER_SOURCES, ...TECH_BUSINESS_SOURCES, ...VERTICAL_SOURCES.ai],
    icon: "brain",
    color: "violet",
    priority: 2,
  },
  {
    id: "market-moves",
    name: "Market Signals",
    description: "Layoffs, pivots, shutdowns, and strategy shifts",
    query: "startup layoff pivot shutdown restructure strategy change company",
    criteria: [
      { description: "Significant operational change" },
      { description: "Market or competitive signal" },
      { description: "Named company" },
    ],
    includeDomains: [...INSIDER_SOURCES, ...TECH_BUSINESS_SOURCES],
    icon: "alert",
    color: "rose",
    priority: 3,
  },
  {
    id: "deep-dives",
    name: "Deep Dives",
    description: "In-depth analysis and industry insights",
    query: "analysis deep dive market trends industry startup venture capital insights strategy",
    criteria: [
      { description: "Long-form analysis" },
      { description: "Strategic insights" },
      { description: "Market perspective" },
    ],
    includeDomains: [...ANALYSIS_SOURCES, ...INSIDER_SOURCES],
    icon: "book",
    color: "blue",
    priority: 4,
  },
  {
    id: "founder-stories",
    name: "Founder Intel",
    description: "Profiles, interviews, and lessons from builders",
    query: "founder CEO startup interview profile lessons learned building company journey",
    criteria: [
      { description: "Founder perspective" },
      { description: "Company building insights" },
      { description: "Leadership lessons" },
    ],
    includeDomains: [...ALL_PREMIUM_SOURCES],
    icon: "user",
    color: "emerald",
    priority: 5,
  },
  {
    id: "product-launches",
    name: "New Products",
    description: "Launches, features, and product announcements",
    query: "launch new product feature announcement startup company release beta",
    criteria: [
      { description: "New product or feature" },
      { description: "From notable company" },
      { description: "Market implications" },
    ],
    includeDomains: [...TECH_BUSINESS_SOURCES, ...VC_ECOSYSTEM_SOURCES],
    icon: "rocket",
    color: "sky",
    priority: 6,
  },
  {
    id: "fintech",
    name: "Fintech",
    description: "Payments, banking, and financial infrastructure",
    query: "fintech payments banking neobank infrastructure startup funding",
    criteria: [
      { description: "Fintech company news" },
      { description: "Product or funding announcement" },
    ],
    includeDomains: [...INSIDER_SOURCES, ...TECH_BUSINESS_SOURCES, ...VERTICAL_SOURCES.fintech],
    icon: "credit-card",
    color: "green",
    priority: 7,
  },
  {
    id: "defense-gov",
    name: "Defense & Gov",
    description: "Defense tech, government contracts, and public sector",
    query: "defense technology government contract startup military aerospace security",
    criteria: [
      { description: "Defense or gov tech news" },
      { description: "Contract or funding announcement" },
    ],
    includeDomains: [...INSIDER_SOURCES, ...TECH_BUSINESS_SOURCES, ...VERTICAL_SOURCES.defense],
    icon: "shield",
    color: "slate",
    priority: 8,
  },
  {
    id: "climate-energy",
    name: "Climate & Energy",
    description: "Clean tech, sustainability, and energy transition",
    query: "climate technology clean energy sustainability startup funding renewable",
    criteria: [
      { description: "Climate tech news" },
      { description: "Funding or product announcement" },
    ],
    includeDomains: [...INSIDER_SOURCES, ...TECH_BUSINESS_SOURCES, ...VERTICAL_SOURCES.climate],
    icon: "leaf",
    color: "lime",
    priority: 9,
  },
  {
    id: "healthtech",
    name: "Health & Bio",
    description: "Digital health, biotech, and healthcare innovation",
    query: "healthtech biotech digital health startup funding medical healthcare",
    criteria: [
      { description: "Healthtech/biotech news" },
      { description: "Funding or breakthrough" },
    ],
    includeDomains: [...INSIDER_SOURCES, ...TECH_BUSINESS_SOURCES, ...VERTICAL_SOURCES.healthtech],
    icon: "heart",
    color: "pink",
    priority: 10,
  },
]

// =============================================================================
// Types
// =============================================================================

export interface ExaSearchResult {
  id: string
  url: string
  title: string
  text?: string
  highlights?: string[]
  highlightScores?: number[]
  publishedDate?: string
  author?: string
  score?: number
  image?: string
}

export interface ExaSearchOptions {
  query: string
  numResults?: number
  includeDomains?: string[]
  excludeDomains?: string[]
  startPublishedDate?: string
  endPublishedDate?: string
  useAutoprompt?: boolean
  type?: "keyword" | "neural" | "auto"
  category?: string
  contents?: {
    text?: boolean | { maxCharacters?: number }
    highlights?: boolean | { numSentences?: number }
    summary?: boolean | { query?: string }
  }
}

// =============================================================================
// Exa API Functions
// =============================================================================

/**
 * Search using Exa's neural search
 */
export async function exaSearch(options: ExaSearchOptions): Promise<ExaSearchResult[]> {
  const exa = getExaClient()
  
  const searchOptions: any = {
    numResults: options.numResults || 10,
    useAutoprompt: options.useAutoprompt ?? true,
    type: options.type || "neural",
  }

  if (options.includeDomains?.length) {
    searchOptions.includeDomains = options.includeDomains
  }
  if (options.excludeDomains?.length) {
    searchOptions.excludeDomains = options.excludeDomains
  }
  if (options.startPublishedDate) {
    searchOptions.startPublishedDate = options.startPublishedDate
  }
  if (options.endPublishedDate) {
    searchOptions.endPublishedDate = options.endPublishedDate
  }
  if (options.category) {
    searchOptions.category = options.category
  }
  if (options.contents) {
    searchOptions.contents = options.contents
  }

  const result = await exa.searchAndContents(options.query, searchOptions)

  return result.results.map((r: any) => ({
    id: r.id || r.url,
    url: r.url,
    title: r.title,
    text: r.text,
    highlights: r.highlights,
    highlightScores: r.highlightScores,
    publishedDate: r.publishedDate,
    author: r.author,
    score: r.score,
    image: r.image,
  }))
}

/**
 * Find similar content to a URL
 */
export async function exaFindSimilar(url: string, numResults = 10): Promise<ExaSearchResult[]> {
  const exa = getExaClient()
  
  const result = await exa.findSimilarAndContents(url, {
    numResults,
    contents: {
      text: { maxCharacters: 1000 },
      highlights: { numSentences: 3 },
    }
  })

  return result.results.map((r: any) => ({
    id: r.id || r.url,
    url: r.url,
    title: r.title,
    text: r.text,
    highlights: r.highlights,
    highlightScores: r.highlightScores,
    publishedDate: r.publishedDate,
    author: r.author,
    score: r.score,
    image: r.image,
  }))
}

/**
 * Get contents for specific URLs
 */
export async function exaGetContents(urls: string[]): Promise<ExaSearchResult[]> {
  const exa = getExaClient()
  
  const result = await exa.getContents(urls, {
    text: { maxCharacters: 2000 },
    highlights: { numSentences: 5 },
  })

  return result.results.map((r: any) => ({
    id: r.id || r.url,
    url: r.url,
    title: r.title,
    text: r.text,
    highlights: r.highlights,
    highlightScores: r.highlightScores,
    publishedDate: r.publishedDate,
    author: r.author,
    score: r.score,
    image: r.image,
  }))
}

/**
 * Get sources for a specific category
 */
export function getSourcesForCategory(category: string): string[] {
  const categoryMap: Record<string, string[]> = {
    ai: [...INSIDER_SOURCES, ...TECH_BUSINESS_SOURCES, ...VERTICAL_SOURCES.ai],
    fintech: [...INSIDER_SOURCES, ...TECH_BUSINESS_SOURCES, ...VERTICAL_SOURCES.fintech],
    healthtech: [...INSIDER_SOURCES, ...TECH_BUSINESS_SOURCES, ...VERTICAL_SOURCES.healthtech],
    defense: [...INSIDER_SOURCES, ...TECH_BUSINESS_SOURCES, ...VERTICAL_SOURCES.defense],
    climate: [...INSIDER_SOURCES, ...TECH_BUSINESS_SOURCES, ...VERTICAL_SOURCES.climate],
    enterprise: [...INSIDER_SOURCES, ...TECH_BUSINESS_SOURCES, ...VERTICAL_SOURCES.enterprise],
    general: ALL_PREMIUM_SOURCES,
  }
  return categoryMap[category] || ALL_PREMIUM_SOURCES
}
