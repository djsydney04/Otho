import { NextRequest, NextResponse } from "next/server"

// Popular Substack newsletters with RSS feeds
const SUBSTACK_FEEDS: Record<string, { name: string; author: string; url: string; rss: string; focus: string }> = {
  stratechery: {
    name: "Stratechery",
    author: "Ben Thompson",
    url: "https://stratechery.com",
    rss: "https://stratechery.com/feed/",
    focus: "Tech strategy",
  },
  notboring: {
    name: "Not Boring",
    author: "Packy McCormick",
    url: "https://www.notboring.co",
    rss: "https://www.notboring.co/feed",
    focus: "Tech optimism",
  },
  lennys: {
    name: "Lenny's Newsletter",
    author: "Lenny Rachitsky",
    url: "https://www.lennysnewsletter.com",
    rss: "https://www.lennysnewsletter.com/feed",
    focus: "Product",
  },
  thediff: {
    name: "The Diff",
    author: "Byrne Hobart",
    url: "https://www.thediff.co",
    rss: "https://www.thediff.co/feed",
    focus: "Finance & Tech",
  },
  newcomer: {
    name: "Newcomer",
    author: "Eric Newcomer",
    url: "https://www.newcomer.co",
    rss: "https://www.newcomer.co/feed",
    focus: "VC & Startups",
  },
  thegeneralist: {
    name: "The Generalist",
    author: "Mario Gabriele",
    url: "https://www.generalist.com",
    rss: "https://www.generalist.com/feed",
    focus: "Deep dives",
  },
  semaphore: {
    name: "Semafor Business",
    author: "Semafor",
    url: "https://www.semafor.com/business",
    rss: "https://www.semafor.com/feed/business",
    focus: "Business news",
  },
}

// Tech news RSS feeds
const NEWS_FEEDS: Record<string, { name: string; url: string; rss: string; category: string }> = {
  techcrunch: {
    name: "TechCrunch",
    url: "https://techcrunch.com",
    rss: "https://techcrunch.com/feed/",
    category: "tech",
  },
  theverge: {
    name: "The Verge",
    url: "https://www.theverge.com",
    rss: "https://www.theverge.com/rss/index.xml",
    category: "tech",
  },
  arstechnica: {
    name: "Ars Technica",
    url: "https://arstechnica.com",
    rss: "https://feeds.arstechnica.com/arstechnica/index",
    category: "tech",
  },
  wired: {
    name: "Wired",
    url: "https://www.wired.com",
    rss: "https://www.wired.com/feed/rss",
    category: "tech",
  },
  bloomberg: {
    name: "Bloomberg Tech",
    url: "https://www.bloomberg.com/technology",
    rss: "https://feeds.bloomberg.com/technology/news.rss",
    category: "tech",
  },
}

interface FeedItem {
  id: string
  title: string
  url: string
  description?: string
  publishedAt?: string
  author?: string
  source: string
  sourceUrl: string
  imageUrl?: string
  type: "newsletter" | "news"
}

// Simple RSS parser
async function parseRSSFeed(url: string, source: string, sourceUrl: string, type: "newsletter" | "news"): Promise<FeedItem[]> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AngelLead/1.0)",
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    })

    if (!response.ok) {
      console.error(`Failed to fetch RSS feed from ${url}: ${response.status}`)
      return []
    }

    const text = await response.text()
    const items: FeedItem[] = []

    // Simple regex-based RSS parsing (works for most feeds)
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi // Atom format
    
    const matches = text.match(itemRegex) || text.match(entryRegex) || []

    for (const itemXml of matches.slice(0, 10)) {
      const title = extractTag(itemXml, "title")
      const link = extractLink(itemXml)
      const description = extractTag(itemXml, "description") || extractTag(itemXml, "summary") || extractTag(itemXml, "content")
      const pubDate = extractTag(itemXml, "pubDate") || extractTag(itemXml, "published") || extractTag(itemXml, "updated")
      const author = extractTag(itemXml, "author") || extractTag(itemXml, "dc:creator")
      const imageUrl = extractImage(itemXml)

      if (title && link) {
        items.push({
          id: `${source}-${Buffer.from(link).toString("base64").slice(0, 20)}`,
          title: cleanHtml(title),
          url: link,
          description: description ? cleanHtml(description).slice(0, 300) : undefined,
          publishedAt: pubDate ? new Date(pubDate).toISOString() : undefined,
          author: author ? cleanHtml(author) : undefined,
          source,
          sourceUrl,
          imageUrl,
          type,
        })
      }
    }

    return items
  } catch (error) {
    console.error(`Error parsing RSS feed ${url}:`, error)
    return []
  }
}

function extractTag(xml: string, tag: string): string | undefined {
  // Handle CDATA
  const cdataRegex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, "i")
  const cdataMatch = xml.match(cdataRegex)
  if (cdataMatch) return cdataMatch[1]

  // Handle regular tags
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i")
  const match = xml.match(regex)
  return match ? match[1] : undefined
}

function extractLink(xml: string): string | undefined {
  // Try <link>url</link>
  const linkMatch = xml.match(/<link[^>]*>([^<]+)<\/link>/i)
  if (linkMatch) return linkMatch[1].trim()

  // Try <link href="url"/>
  const hrefMatch = xml.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i)
  if (hrefMatch) return hrefMatch[1]

  return undefined
}

function extractImage(xml: string): string | undefined {
  // Try media:content
  const mediaMatch = xml.match(/<media:content[^>]*url=["']([^"']+)["'][^>]*\/?>/i)
  if (mediaMatch) return cleanImageUrl(mediaMatch[1])

  // Try media:thumbnail
  const thumbMatch = xml.match(/<media:thumbnail[^>]*url=["']([^"']+)["'][^>]*\/?>/i)
  if (thumbMatch) return cleanImageUrl(thumbMatch[1])

  // Try enclosure with image type
  const enclosureMatch = xml.match(/<enclosure[^>]*type=["']image[^"']*["'][^>]*url=["']([^"']+)["'][^>]*\/?>/i)
  if (enclosureMatch) return cleanImageUrl(enclosureMatch[1])
  
  // Try enclosure (any)
  const enclosureAnyMatch = xml.match(/<enclosure[^>]*url=["']([^"']+\.(?:jpg|jpeg|png|gif|webp)[^"']*)["'][^>]*\/?>/i)
  if (enclosureAnyMatch) return cleanImageUrl(enclosureAnyMatch[1])

  // Try image tag in item
  const imageMatch = xml.match(/<image[^>]*>[\s\S]*?<url>([^<]+)<\/url>/i)
  if (imageMatch) return cleanImageUrl(imageMatch[1])

  // Try content:encoded for img tags
  const contentMatch = xml.match(/<content:encoded[^>]*>[\s\S]*?<img[^>]*src=["']([^"']+)["'][^>]*>/i)
  if (contentMatch) return cleanImageUrl(contentMatch[1])

  // Try description for img tags
  const descImgMatch = xml.match(/<description[^>]*>[\s\S]*?<img[^>]*src=["']([^"']+)["'][^>]*>/i)
  if (descImgMatch) return cleanImageUrl(descImgMatch[1])

  // Try img src in CDATA
  const cdataImgMatch = xml.match(/!\[CDATA\[[\s\S]*?<img[^>]*src=["']([^"']+)["'][^>]*>/i)
  if (cdataImgMatch) return cleanImageUrl(cdataImgMatch[1])

  // Try to find any image URL in the content
  const anyImgMatch = xml.match(/https?:\/\/[^"'\s<>]+\.(?:jpg|jpeg|png|gif|webp)(?:\?[^"'\s<>]*)?/i)
  if (anyImgMatch) return cleanImageUrl(anyImgMatch[0])

  // Try og:image
  const ogMatch = xml.match(/og:image[^>]*content=["']([^"']+)["']/i)
  if (ogMatch) return cleanImageUrl(ogMatch[1])

  return undefined
}

function cleanImageUrl(url: string): string {
  // Decode HTML entities
  let cleaned = url
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim()

  // Remove tracking parameters but keep essential ones
  try {
    const urlObj = new URL(cleaned)
    // Keep the URL as-is for most cases
    return cleaned
  } catch {
    return cleaned
  }
}

function cleanHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, "") // Remove HTML tags
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

// GET /api/feeds - Fetch RSS feeds
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") // "newsletters" | "news" | "all"
    const source = searchParams.get("source") // specific source slug
    const limit = parseInt(searchParams.get("limit") || "20")

    const allItems: FeedItem[] = []

    // Fetch specific source
    if (source) {
      if (SUBSTACK_FEEDS[source]) {
        const feed = SUBSTACK_FEEDS[source]
        const items = await parseRSSFeed(feed.rss, feed.name, feed.url, "newsletter")
        allItems.push(...items)
      } else if (NEWS_FEEDS[source]) {
        const feed = NEWS_FEEDS[source]
        const items = await parseRSSFeed(feed.rss, feed.name, feed.url, "news")
        allItems.push(...items)
      }
    } else {
      // Fetch by type
      const feedPromises: Promise<FeedItem[]>[] = []

      if (type === "newsletters" || type === "all" || !type) {
        for (const feed of Object.values(SUBSTACK_FEEDS)) {
          feedPromises.push(parseRSSFeed(feed.rss, feed.name, feed.url, "newsletter"))
        }
      }

      if (type === "news" || type === "all" || !type) {
        for (const feed of Object.values(NEWS_FEEDS)) {
          feedPromises.push(parseRSSFeed(feed.rss, feed.name, feed.url, "news"))
        }
      }

      const results = await Promise.all(feedPromises)
      for (const items of results) {
        allItems.push(...items)
      }
    }

    // Sort by published date
    allItems.sort((a, b) => {
      if (!a.publishedAt) return 1
      if (!b.publishedAt) return -1
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    })

    return NextResponse.json({
      items: allItems.slice(0, limit),
      sources: {
        newsletters: Object.entries(SUBSTACK_FEEDS).map(([slug, feed]) => ({
          slug,
          ...feed,
        })),
        news: Object.entries(NEWS_FEEDS).map(([slug, feed]) => ({
          slug,
          ...feed,
        })),
      },
    })
  } catch (error) {
    console.error("Error fetching feeds:", error)
    return NextResponse.json({ error: "Failed to fetch feeds" }, { status: 500 })
  }
}
