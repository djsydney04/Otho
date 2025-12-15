import { FeedConfig, NewsItem } from './types'

// Curated feed directory for general + business/tech coverage.
export const CURATED_FEEDS: FeedConfig[] = [
  {
    id: 'techcrunch',
    label: 'TechCrunch',
    url: 'https://techcrunch.com/feed/',
    topicHints: ['startups', 'technology'],
  },
  {
    id: 'venturebeat',
    label: 'VentureBeat',
    url: 'https://venturebeat.com/feed/',
    topicHints: ['startups', 'ai', 'enterprise'],
  },
  {
    id: 'wsj-markets',
    label: 'WSJ Markets',
    url: 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml',
    topicHints: ['markets', 'finance'],
  },
  {
    id: 'ft-companies',
    label: 'FT Companies',
    url: 'https://www.ft.com/companies?format=rss',
    topicHints: ['companies', 'business'],
  },
]

const CACHE_TTL_MS = 15 * 60 * 1000

type CachedFeed = {
  items: NewsItem[]
  etag?: string | null
  lastModified?: string | null
  fetchedAt: number
}

const feedCache = new Map<string, CachedFeed>()

const decodeEntities = (value: string | undefined) => {
  if (!value) return undefined
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

const extractTag = (block: string, tagName: string) => {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i')
  const match = block.match(regex)
  return decodeEntities(match?.[1])
}

const extractSelfClosing = (block: string, tagName: string, attr: string) => {
  const regex = new RegExp(`<${tagName}[^>]*${attr}=\"([^\"]+)\"[^>]*\\/>`, 'i')
  const match = block.match(regex)
  return decodeEntities(match?.[1])
}

const parseRssBlock = (block: string, fallbackSource: string): NewsItem => {
  const title = extractTag(block, 'title') || 'Untitled'
  const link = extractTag(block, 'link') || extractSelfClosing(block, 'link', 'href') || ''
  const publishedAt =
    extractTag(block, 'pubDate') ||
    extractTag(block, 'updated') ||
    extractTag(block, 'published') ||
    undefined
  const categories = [...block.matchAll(/<category[^>]*>([^<]+)<\/category>/gi)].map((m) => decodeEntities(m[1]) || '')
  const summary = extractTag(block, 'description') || extractTag(block, 'summary')
  const sourceHost = (() => {
    try {
      const url = new URL(link)
      return url.hostname.replace(/^www\./, '')
    } catch {
      return fallbackSource
    }
  })()

  return {
    title,
    link,
    publishedAt,
    categories,
    source: sourceHost || fallbackSource,
    summary,
  }
}

const parseFeed = (xml: string, sourceLabel: string): NewsItem[] => {
  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) || []
  const entryBlocks = xml.match(/<entry[\s\S]*?<\/entry>/gi) || []
  const blocks = itemBlocks.length > 0 ? itemBlocks : entryBlocks

  return blocks.map((block) => parseRssBlock(block, sourceLabel))
}

const shouldUseCache = (cached?: CachedFeed) => {
  if (!cached) return false
  return Date.now() - cached.fetchedAt < CACHE_TTL_MS
}

const fetchFeed = async (feed: FeedConfig): Promise<NewsItem[]> => {
  const cached = feedCache.get(feed.url)
  if (shouldUseCache(cached)) {
    return cached!.items
  }

  const headers: Record<string, string> = {}
  if (cached?.etag) headers['If-None-Match'] = cached.etag
  if (cached?.lastModified) headers['If-Modified-Since'] = cached.lastModified

  const response = await fetch(feed.url, { headers })

  if (response.status === 304 && cached) {
    feedCache.set(feed.url, { ...cached, fetchedAt: Date.now() })
    return cached.items
  }

  const body = await response.text()
  const items = parseFeed(body, feed.label)
  const etag = response.headers.get('etag')
  const lastModified = response.headers.get('last-modified')

  feedCache.set(feed.url, {
    items,
    etag,
    lastModified,
    fetchedAt: Date.now(),
  })

  return items
}

const dedupe = (items: NewsItem[]) => {
  const seen = new Map<string, NewsItem>()

  for (const item of items) {
    const key = item.link || `${item.title}-${item.source}-${item.publishedAt}`
    if (!seen.has(key)) {
      seen.set(key, item)
    }
  }

  return Array.from(seen.values())
}

const matchesKeywords = (item: NewsItem, keywords: string[]) => {
  if (keywords.length === 0) return true
  const haystack = `${item.title} ${item.summary ?? ''} ${item.categories?.join(' ') ?? ''}`.toLowerCase()
  return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()))
}

export const fetchNews = async (options?: {
  keywords?: string[]
  limit?: number
  feeds?: FeedConfig[]
}): Promise<NewsItem[]> => {
  const { keywords = [], limit = 50, feeds = CURATED_FEEDS } = options ?? {}

  const results = await Promise.all(
    feeds.map(async (feed) => {
      try {
        return await fetchFeed(feed)
      } catch (error) {
        console.error(`Failed to fetch feed ${feed.id}:`, error)
        return []
      }
    }),
  )

  const flattened = results.flat()
  const filtered = flattened.filter((item) => matchesKeywords(item, keywords))
  const deduped = dedupe(filtered)

  return deduped
    .sort((a, b) => {
      const aDate = a.publishedAt ? Date.parse(a.publishedAt) : 0
      const bDate = b.publishedAt ? Date.parse(b.publishedAt) : 0
      return bDate - aDate
    })
    .slice(0, limit)
}
