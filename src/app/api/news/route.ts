import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/client"

const NEWS_API_KEY = process.env.NEWS_API_KEY
const NEWS_API_ENDPOINT = "https://newsapi.org/v2/everything"

type SupabaseCompany = {
  id: string
  name: string
  description: string | null
  website: string | null
  stage: string | null
  tags?: {
    tag?: {
      label?: string | null
    } | null
  }[]
}

type NewsAPIArticle = {
  title?: string
  url?: string
  description?: string
  source?: { name?: string }
  publishedAt?: string
}

const STOP_WORDS = new Set([
  "the",
  "and",
  "with",
  "from",
  "that",
  "their",
  "into",
  "will",
  "this",
  "have",
  "company",
  "platform",
  "startup",
  "solutions",
  "services",
])

export async function GET() {
  try {
    const supabase = createServerClient()
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
      .limit(6)

    if (!companies || companies.length === 0) {
      return NextResponse.json({ articles: [] })
    }

    if (!NEWS_API_KEY) {
      const fallback = companies.slice(0, 4).map((company) => ({
        id: company.id,
        companyName: company.name,
        title: `Updates coming soon for ${company.name}`,
        summary: company.description || "Add a description to this company to get richer summaries.",
        url: "https://newsapi.org/",
        source: "News API",
        publishedAt: new Date().toISOString(),
      }))
      return NextResponse.json({ articles: fallback })
    }

    const extractKeywords = (company: SupabaseCompany) => {
      const descriptionWords =
        company.description
          ?.toLowerCase()
          .match(/[a-z]{4,}/g)
          ?.filter((word) => !STOP_WORDS.has(word))
          .slice(0, 6) || []
      const tagLabels = company.tags?.map((entry) => entry.tag?.label?.toLowerCase()).filter(Boolean) ?? []
      return Array.from(new Set([...descriptionWords, ...tagLabels])).slice(0, 6)
    }

    const buildQuery = (company: SupabaseCompany) => {
      const keywords = extractKeywords(company)
      const quotedName = `"${company.name}"`
      let host = ""
      if (company.website) {
        try {
          const normalized = company.website.startsWith("http") ? company.website : `https://${company.website}`
          host = new URL(normalized).hostname.split(".")[0]
        } catch {
          host = ""
        }
      }

      const segments = [quotedName]
      if (company.stage) segments.push(company.stage)
      if (host) segments.push(host)
      if (keywords.length) segments.push(...keywords.map((kw) => `"${kw}"`))
      return segments.join(" OR ") || company.name
    }

    const articlesPerCompany = await Promise.all(
      companies.slice(0, 4).map(async (company: SupabaseCompany) => {
        try {
          const keywords = extractKeywords(company)
          const baseQuery = buildQuery(company)
          const params = new URLSearchParams({
            q: keywords.length ? `(${baseQuery}) AND (${keywords.join(" OR ")})` : baseQuery,
            language: "en",
            sortBy: "publishedAt",
            pageSize: "3",
          })
          const response = await fetch(`${NEWS_API_ENDPOINT}?${params.toString()}`, {
            headers: {
              "X-Api-Key": NEWS_API_KEY,
            },
            next: { revalidate: 60 * 30 },
          })

          if (!response.ok) {
            console.warn("News API error:", await response.text())
            return []
          }

          const data = await response.json()
          const articles: NewsAPIArticle[] = data.articles || []

          return articles.map((article, index) => ({
            id: `${company.id}-${index}`,
            companyName: company.name,
            title: article.title || `Update about ${company.name}`,
            summary: article.description,
            url: article.url || "https://newsapi.org/",
            source: article.source?.name || "News API",
            publishedAt: article.publishedAt,
          }))
        } catch (error) {
          console.error("News fetch failed for", company.name, error)
          return []
        }
      }),
    )

    const flattened = articlesPerCompany.flat().slice(0, 12)
    return NextResponse.json({ articles: flattened })
  } catch (error) {
    console.error("News route error:", error)
    return NextResponse.json({ error: "Failed to load news" }, { status: 500 })
  }
}

