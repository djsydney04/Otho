import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/client"

const NEWS_API_KEY = process.env.NEWS_API_KEY
const NEWS_API_ENDPOINT = "https://newsapi.org/v2/everything"
const NEWS_TOP_HEADLINES = "https://newsapi.org/v2/top-headlines"

// Category to search query mapping for better results
const CATEGORY_QUERIES: Record<string, string> = {
  venture: '"venture capital" OR "series a" OR "series b" OR "seed funding" OR "startup funding" OR "angel investor" OR "VC fund"',
  tech: 'technology OR "tech startup" OR "silicon valley" OR innovation OR "product launch"',
  ai: '"artificial intelligence" OR "machine learning" OR "generative AI" OR GPT OR "large language model" OR "AI startup"',
  defense: '"defense tech" OR "defense contractor" OR "military technology" OR aerospace OR "government contract" OR "national security"',
  fintech: 'fintech OR "financial technology" OR payments OR "digital banking" OR neobank OR "embedded finance"',
  healthcare: '"healthcare technology" OR biotech OR "digital health" OR "life sciences" OR medtech OR "drug discovery"',
  climate: '"climate tech" OR "clean energy" OR sustainability OR "renewable energy" OR "carbon capture" OR "electric vehicle"',
  crypto: 'cryptocurrency OR blockchain OR "web3" OR bitcoin OR ethereum OR "decentralized finance"',
  macro: '"stock market" OR "federal reserve" OR "interest rates" OR "economic outlook" OR "market analysis" OR IPO',
  founders: '"startup founder" OR "entrepreneur interview" OR "CEO profile" OR "company founder" OR "startup journey"',
}

// Trusted tech/VC sources
const TRUSTED_DOMAINS = [
  "techcrunch.com",
  "theverge.com",
  "wired.com",
  "bloomberg.com",
  "reuters.com",
  "wsj.com",
  "ft.com",
  "axios.com",
  "theinformation.com",
  "cnbc.com",
  "forbes.com",
  "venturebeat.com",
  "semafor.com",
  "pitchbook.com",
  "crunchbase.com",
]

interface NewsAPIArticle {
  title?: string
  url?: string
  description?: string
  source?: { name?: string; id?: string }
  publishedAt?: string
  urlToImage?: string
  author?: string
  content?: string
}

// GET /api/news - Fetch news with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category") // filter by category
    const portfolioOnly = searchParams.get("portfolio") === "true" // only portfolio-relevant
    const limit = parseInt(searchParams.get("limit") || "20")
    const forYou = searchParams.get("forYou") === "true" // personalized feed
    const searchQuery = searchParams.get("q") // search query
    const sourceFilter = searchParams.get("source") // news, newsletters, social
    const timeFilter = searchParams.get("time") // today, week, month, all
    
    // Calculate date range based on time filter
    const getFromDate = () => {
      const now = new Date()
      switch (timeFilter) {
        case "today":
          return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
        case "week":
          return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
        case "month":
          return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
        default:
          return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString() // default to week
      }
    }
    const fromDate = getFromDate()

    const supabase = createServerClient()

    // Get portfolio companies for relevance matching
    const { data: companies } = await supabase
      .from("companies")
      .select(`
        id,
        name,
        description,
        website,
        stage,
        tags:company_tags(tag:tags(label))
      `)
      .not("name", "is", null)
      .limit(20)

    // Get available categories
    const { data: categories } = await supabase
      .from("news_categories")
      .select("*")
      .order("sort_order")

    // If no API key, return mock data
    if (!NEWS_API_KEY) {
      return NextResponse.json({
        articles: generateMockArticles(companies || [], category),
        categories: categories || [],
        portfolioCompanies: companies?.map(c => c.name) || [],
      })
    }

    // Build search queries based on filters
    let articles: any[] = []

    if (searchQuery) {
      // Search mode - search across all sources
      articles = await fetchSearchResults(searchQuery, limit, sourceFilter, fromDate)
    } else if (portfolioOnly && companies?.length) {
      // Fetch news for each portfolio company
      const companyArticles = await fetchPortfolioNews(companies)
      articles.push(...companyArticles)
    } else if (category && CATEGORY_QUERIES[category]) {
      // Fetch news for specific category
      const categoryArticles = await fetchCategoryNews(category, limit, fromDate)
      articles.push(...categoryArticles)
    } else if (forYou) {
      // Fetch personalized feed - mix of categories and portfolio
      const [categoryNews, portfolioNews, socialNews] = await Promise.all([
        fetchMixedCategoryNews(["venture", "tech", "ai"], Math.floor(limit * 0.5), fromDate),
        companies?.length ? fetchPortfolioNews(companies.slice(0, 3)) : Promise.resolve([]),
        fetchSocialDiscussions(limit * 0.2),
      ])
      
      // Merge and dedupe by URL
      const seen = new Set<string>()
      for (const article of [...portfolioNews, ...categoryNews, ...socialNews]) {
        if (!seen.has(article.url)) {
          seen.add(article.url)
          articles.push(article)
        }
      }
    } else {
      // Default: top tech/business news
      const defaultNews = await fetchMixedCategoryNews(["venture", "tech", "macro"], limit, fromDate)
      articles.push(...defaultNews)
    }

    // Apply source filter if specified
    if (sourceFilter && sourceFilter !== "all") {
      articles = articles.filter(a => {
        if (sourceFilter === "newsletters") {
          return NEWSLETTER_SOURCES.some(ns => a.source?.toLowerCase().includes(ns.toLowerCase()))
        }
        if (sourceFilter === "social") {
          return a.sourceType === "social" || SOCIAL_SOURCES.some(ss => a.source?.toLowerCase().includes(ss.toLowerCase()))
        }
        return true
      })
    }

    // Sort by date and limit
    const sorted = articles
      .sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime())
      .slice(0, limit)

    return NextResponse.json({
      articles: sorted,
      categories: categories || [],
      portfolioCompanies: companies?.map(c => c.name) || [],
    })
  } catch (error) {
    console.error("News route error:", error)
    return NextResponse.json({ error: "Failed to load news" }, { status: 500 })
  }
}

// Newsletter sources to identify
const NEWSLETTER_SOURCES = [
  "Substack",
  "Stratechery",
  "The Generalist",
  "Not Boring",
  "Lenny",
  "The Diff",
  "Morning Brew",
  "The Hustle",
  "CB Insights",
  "Mattermark",
]

// Social/discussion sources
const SOCIAL_SOURCES = [
  "Twitter",
  "X.com",
  "Reddit",
  "Hacker News",
  "Product Hunt",
  "LinkedIn",
]

// Search across all sources
async function fetchSearchResults(query: string, limit: number, sourceFilter?: string | null, fromDate?: string): Promise<any[]> {
  try {
    // Add business context to search to improve relevance
    const enrichedQuery = `${query} AND (startup OR company OR funding OR technology OR investment)`
    
    const params = new URLSearchParams({
      q: enrichedQuery,
      language: "en",
      sortBy: "relevancy",
      pageSize: String(Math.min(limit, 100)),
      domains: TRUSTED_DOMAINS.join(","),
    })
    
    if (fromDate) {
      params.set("from", fromDate)
    }

    const response = await fetch(`${NEWS_API_ENDPOINT}?${params}`, {
      headers: { "X-Api-Key": NEWS_API_KEY! },
      next: { revalidate: 60 * 10 },
    })

    if (!response.ok) {
      console.warn("Search API error:", await response.text())
      return []
    }

    const data = await response.json()
    return (data.articles || []).map((article: NewsAPIArticle, idx: number) => ({
      id: `search-${idx}-${Date.now()}`,
      title: article.title || "",
      url: article.url || "",
      description: article.description || "",
      source: article.source?.name || "",
      publishedAt: article.publishedAt || "",
      imageUrl: article.urlToImage || "",
      author: article.author || "",
      category: "search",
      sourceType: detectSourceType(article.source?.name || ""),
      isPortfolioRelevant: false,
    }))
  } catch (error) {
    console.error("Search failed:", error)
    return []
  }
}

// Fetch social media discussions and trending topics
async function fetchSocialDiscussions(limit: number): Promise<any[]> {
  try {
    // Search for trending tech/VC discussions
    const query = '("on Twitter" OR "viral" OR "trending" OR "discussion" OR "thread") AND (startup OR VC OR "venture capital" OR tech)'
    
    const params = new URLSearchParams({
      q: query,
      language: "en",
      sortBy: "publishedAt",
      pageSize: String(Math.min(Math.ceil(limit), 20)),
      domains: TRUSTED_DOMAINS.join(","),
    })

    const response = await fetch(`${NEWS_API_ENDPOINT}?${params}`, {
      headers: { "X-Api-Key": NEWS_API_KEY! },
      next: { revalidate: 60 * 15 },
    })

    if (!response.ok) return []

    const data = await response.json()
    return (data.articles || []).map((article: NewsAPIArticle, idx: number) => ({
      id: `social-${idx}-${Date.now()}`,
      title: article.title || "",
      url: article.url || "",
      description: article.description || "",
      source: article.source?.name || "",
      publishedAt: article.publishedAt || "",
      imageUrl: article.urlToImage || "",
      category: "social",
      sourceType: "social",
      isPortfolioRelevant: false,
    }))
  } catch (error) {
    console.error("Social fetch failed:", error)
    return []
  }
}

// Detect source type from source name
function detectSourceType(sourceName: string): "news" | "newsletters" | "social" {
  const lower = sourceName.toLowerCase()
  if (NEWSLETTER_SOURCES.some(ns => lower.includes(ns.toLowerCase()))) return "newsletters"
  if (SOCIAL_SOURCES.some(ss => lower.includes(ss.toLowerCase()))) return "social"
  return "news"
}

// Fetch news for portfolio companies
async function fetchPortfolioNews(companies: any[]): Promise<any[]> {
  const results = await Promise.all(
    companies.slice(0, 6).map(async (company) => {
      try {
        const query = buildCompanyQuery(company)
        const params = new URLSearchParams({
          q: query,
          language: "en",
          sortBy: "relevancy", // Use relevancy instead of date for better matching
          pageSize: "5",
          // Restrict to trusted business/tech domains to avoid irrelevant results
          domains: TRUSTED_DOMAINS.join(","),
        })

        const response = await fetch(`${NEWS_API_ENDPOINT}?${params}`, {
          headers: { "X-Api-Key": NEWS_API_KEY! },
          next: { revalidate: 60 * 30 },
        })

        if (!response.ok) return []
        
        const data = await response.json()
        
        // Filter articles that actually mention the company name (extra safety)
        const companyNameLower = company.name.toLowerCase()
        const relevantArticles = (data.articles || []).filter((article: NewsAPIArticle) => {
          const titleLower = (article.title || "").toLowerCase()
          const descLower = (article.description || "").toLowerCase()
          // Check if company name appears in title or description
          return titleLower.includes(companyNameLower) || descLower.includes(companyNameLower)
        })
        
        return relevantArticles.map((article: NewsAPIArticle) => ({
          id: `portfolio-${company.id}-${article.url}`,
          title: article.title || "",
          url: article.url || "",
          description: article.description || "",
          source: article.source?.name || "",
          publishedAt: article.publishedAt || "",
          imageUrl: article.urlToImage || "",
          author: article.author || "",
          category: "portfolio",
          companyName: company.name,
          companyId: company.id,
          isPortfolioRelevant: true,
        }))
      } catch (error) {
        console.error(`News fetch failed for ${company.name}:`, error)
        return []
      }
    })
  )

  return results.flat()
}

// Fetch news for a specific category
async function fetchCategoryNews(category: string, limit: number, fromDate?: string): Promise<any[]> {
  try {
    const query = CATEGORY_QUERIES[category] || category
    const params = new URLSearchParams({
      q: query,
      language: "en",
      sortBy: "publishedAt",
      pageSize: String(Math.min(limit, 100)),
      domains: TRUSTED_DOMAINS.slice(0, 10).join(","),
    })
    
    if (fromDate) {
      params.set("from", fromDate)
    }

    const response = await fetch(`${NEWS_API_ENDPOINT}?${params}`, {
      headers: { "X-Api-Key": NEWS_API_KEY! },
      next: { revalidate: 60 * 15 },
    })

    if (!response.ok) {
      console.warn("News API error:", await response.text())
      return []
    }

    const data = await response.json()
    return (data.articles || []).map((article: NewsAPIArticle, idx: number) => ({
      id: `${category}-${idx}-${Date.now()}`,
      title: article.title || "",
      url: article.url || "",
      description: article.description || "",
      source: article.source?.name || "",
      publishedAt: article.publishedAt || "",
      imageUrl: article.urlToImage || "",
      author: article.author || "",
      category,
      isPortfolioRelevant: false,
    }))
  } catch (error) {
    console.error(`Category news fetch failed for ${category}:`, error)
    return []
  }
}

// Fetch news from multiple categories
async function fetchMixedCategoryNews(categories: string[], totalLimit: number, fromDate?: string): Promise<any[]> {
  const perCategory = Math.ceil(totalLimit / categories.length)
  const results = await Promise.all(
    categories.map(cat => fetchCategoryNews(cat, perCategory, fromDate))
  )
  return results.flat()
}

// Business context terms to disambiguate company names from common words
const BUSINESS_CONTEXT = [
  "startup",
  "company", 
  "funding",
  "venture",
  "investment",
  "CEO",
  "founder",
  "raises",
  "valuation",
  "Series",
  "acquired",
  "launch",
  "announces",
]

// Build search query for a company with business context
function buildCompanyQuery(company: any): string {
  // Start with the company name
  const companyName = company.name.trim()
  
  // Extract domain from website for additional context
  let domain = ""
  if (company.website) {
    try {
      const normalized = company.website.startsWith("http") ? company.website : `https://${company.website}`
      const url = new URL(normalized)
      domain = url.hostname.replace("www.", "").split(".")[0]
    } catch {
      // ignore invalid URLs
    }
  }

  // Build the main query parts
  const namePart = `"${companyName}"`
  
  // Add business context to disambiguate generic names like "Hummingbird"
  // The query becomes: "Hummingbird" AND (startup OR company OR funding OR venture OR ...)
  const contextPart = `(${BUSINESS_CONTEXT.slice(0, 8).join(" OR ")})`
  
  // If we have a domain name different from company name, include it
  const domainPart = domain && domain.toLowerCase() !== companyName.toLowerCase() 
    ? `OR "${domain}"` 
    : ""
  
  // Extract meaningful keywords from description
  let descriptionKeywords: string[] = []
  if (company.description) {
    descriptionKeywords = company.description
      .toLowerCase()
      .match(/[a-z]{5,}/g)
      ?.filter((w: string) => !STOP_WORDS.has(w))
      .slice(0, 2) || []
  }

  // Get tag labels for additional context
  const tags = company.tags?.map((t: any) => t.tag?.label).filter(Boolean) || []
  
  // Build final query:
  // ("Company Name" OR "domain") AND (startup OR company OR funding...) 
  // Optionally AND (tag1 OR tag2 OR keyword1)
  let query = `(${namePart} ${domainPart}) AND ${contextPart}`
  
  // Add industry context from tags or description if available
  const industryTerms = [...tags.slice(0, 2), ...descriptionKeywords.slice(0, 1)]
  if (industryTerms.length > 0) {
    const industryPart = industryTerms.map(t => `"${t}"`).join(" OR ")
    query = `${query} AND (${industryPart})`
  }
  
  return query
}

// Stop words for keyword extraction
const STOP_WORDS = new Set([
  "the", "and", "with", "from", "that", "their", "into", "will", "this", 
  "have", "company", "platform", "startup", "solutions", "services",
  "using", "about", "through", "which", "would", "could", "should",
])

// Generate mock articles when no API key
function generateMockArticles(companies: any[], category: string | null): any[] {
  const mockCategories = category ? [category] : ["venture", "tech", "ai"]
  const articles = []
  
  // Add some portfolio-relevant mock articles
  for (const company of companies.slice(0, 3)) {
    articles.push({
      id: `mock-portfolio-${company.id}`,
      title: `${company.name} Updates: Industry Analysis`,
      url: "#",
      description: company.description || `Latest news and updates about ${company.name}`,
      source: "Portfolio News",
      publishedAt: new Date().toISOString(),
      category: "portfolio",
      companyName: company.name,
      companyId: company.id,
      isPortfolioRelevant: true,
    })
  }

  // Add category mock articles
  for (const cat of mockCategories) {
    articles.push({
      id: `mock-${cat}-1`,
      title: getMockTitle(cat),
      url: "#",
      description: `Latest updates in ${cat}. Add a NEWS_API_KEY to get real news.`,
      source: "News API Demo",
      publishedAt: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      category: cat,
      isPortfolioRelevant: false,
    })
  }

  return articles
}

function getMockTitle(category: string): string {
  const titles: Record<string, string> = {
    venture: "Early-Stage Funding Hits New Highs in Q4",
    tech: "Tech Giants Report Strong Growth Amid Market Shifts",
    ai: "New AI Models Push Boundaries of Machine Learning",
    defense: "Defense Tech Startups See Surge in Government Interest",
    fintech: "Digital Payments Revolution Continues to Accelerate",
    healthcare: "Biotech Breakthroughs Promise New Treatment Options",
    climate: "Clean Energy Investment Breaks Annual Records",
    crypto: "Institutional Adoption of Digital Assets Grows",
    macro: "Fed Signals Policy Shift as Economy Shows Resilience",
    founders: "How This Founder Built a Billion-Dollar Company",
  }
  return titles[category] || "Breaking News in Technology"
}
