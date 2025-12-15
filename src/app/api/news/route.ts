import { NextRequest, NextResponse } from 'next/server'
import { CURATED_FEEDS, fetchNews } from '@/lib/news/rss'
import type { FeedConfig } from '@/lib/news/types'

const homeFeeds: FeedConfig[] = CURATED_FEEDS

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const company = searchParams.get('company')?.trim()
  const industry = searchParams.get('industry')?.trim()
  const q = searchParams.get('q')?.trim()
  const scope = searchParams.get('scope')?.trim() ?? 'home'

  const keywords = [company, industry, q].filter((v): v is string => Boolean(v) && v.length > 0)
  const feeds = scope === 'home' ? homeFeeds : CURATED_FEEDS

  const items = await fetchNews({ keywords, feeds })

  return NextResponse.json({
    count: items.length,
    keywords,
    items,
  })
}
