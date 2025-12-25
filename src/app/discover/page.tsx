"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Sidebar } from "@/components/pipeline/sidebar"
import { useSearchFocus, useKeyboard } from "@/lib/hooks"
import { getDomain } from "@/lib/utils"
import {
  SearchIcon,
  RefreshIcon,
  AlertIcon,
  TrendingIcon,
  BrainIcon,
  RocketIcon,
  HeartIcon,
  ShieldIcon,
  LeafIcon,
  CreditCardIcon,
  BookIcon,
  UserIcon,
  ZapIcon,
} from "@/components/icons"

// =============================================================================
// Types
// =============================================================================

interface ExaResult {
  id: string
  url: string
  title: string
  text?: string
  highlights?: string[]
  publishedDate?: string
  author?: string
  score?: number
  image?: string
}

interface Webset {
  id: string
  name: string
  description?: string
  icon: string
}

// =============================================================================
// Constants
// =============================================================================

const WEBSET_ICONS: Record<string, React.ReactNode> = {
  trending: <TrendingIcon className="h-4 w-4" />,
  brain: <BrainIcon className="h-4 w-4" />,
  alert: <AlertIcon className="h-4 w-4" />,
  book: <BookIcon className="h-4 w-4" />,
  user: <UserIcon className="h-4 w-4" />,
  rocket: <RocketIcon className="h-4 w-4" />,
  "credit-card": <CreditCardIcon className="h-4 w-4" />,
  shield: <ShieldIcon className="h-4 w-4" />,
  leaf: <LeafIcon className="h-4 w-4" />,
  heart: <HeartIcon className="h-4 w-4" />,
}

// =============================================================================
// Helpers
// =============================================================================

function getTimeAgo(publishedDate?: string): string {
  if (!publishedDate) return ""
  const now = new Date()
  const published = new Date(publishedDate)
  const diffMs = now.getTime() - published.getTime()
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  
  if (hours < 1) return "Just now"
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return "Yesterday"
  return `${days}d ago`
}

function deduplicateResults(results: ExaResult[]): ExaResult[] {
  const seen = new Map<string, ExaResult>()
  const titleFingerprints = new Set<string>()
  
  for (const result of results) {
    if (seen.has(result.url)) continue
    
    const fingerprint = result.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 4)
      .sort()
      .slice(0, 4)
      .join('|')
    
    if (fingerprint && titleFingerprints.has(fingerprint)) continue
    
    seen.set(result.url, result)
    if (fingerprint) titleFingerprints.add(fingerprint)
  }
  
  return Array.from(seen.values())
}

function cleanText(text?: string): string {
  if (!text) return ""
  return text
    .replace(/\[.*?\]\(.*?\)/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180)
}

// =============================================================================
// Article Component
// =============================================================================

function ArticleRow({ article }: { article: ExaResult }) {
  const domain = getDomain(article.url)
  const timeAgo = getTimeAgo(article.publishedDate)
  const snippet = cleanText(article.highlights?.[0] || article.text)

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block py-4 border-b last:border-0"
    >
      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <img 
              src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`} 
              alt="" 
              className="h-4 w-4 rounded-sm flex-shrink-0"
            />
            <span className="text-xs text-muted-foreground truncate">{domain}</span>
            <span className="text-xs text-muted-foreground/50">{timeAgo}</span>
          </div>
          <h3 className="font-medium text-[15px] leading-snug group-hover:text-primary transition-colors mb-1">
            {article.title}
          </h3>
          {snippet && (
            <p className="text-sm text-muted-foreground line-clamp-2">{snippet}</p>
          )}
        </div>
        {article.image && (
          <img
            src={article.image}
            alt=""
            className="w-24 h-18 rounded-lg object-cover flex-shrink-0"
          />
        )}
      </div>
    </a>
  )
}

// =============================================================================
// AI Analysis Component
// =============================================================================

function AiAnalysisContent({ content }: { content: string }) {
  // Normalize and trim; keep concise
  const lines = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .slice(0, 8) // tighter

  const formatBold = (text: string) =>
    text.split(/(\*\*.*?\*\*)/g).map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-foreground font-semibold">{part.slice(2, -2)}</strong>
      }
      return part
    })

  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        // shorten long lines
        let safeLine = line.length > 180 ? line.slice(0, 180) + "…" : line

        // clean heading markers like "*1." or "**Heading**"
        const headingMatch = safeLine.match(/^\*?\s*\d*\.?\s*\*\*(.+)\*\*$/)
        if (headingMatch) {
          return (
            <p key={i} className="text-xs font-semibold text-foreground leading-snug">
              {headingMatch[1]}
            </p>
          )
        }

        const isBullet = safeLine.startsWith('-') || safeLine.startsWith('*')
        if (isBullet) {
          safeLine = safeLine.replace(/^[-*]\s*/, '')
          return (
            <div key={i} className="flex gap-2 text-xs text-muted-foreground leading-snug">
              <span className="text-primary mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
              <span>{formatBold(safeLine)}</span>
            </div>
          )
        }

        return (
          <p key={i} className="text-xs text-muted-foreground leading-snug">
            {formatBold(safeLine)}
          </p>
        )
      })}
    </div>
  )
}

// =============================================================================
// Page Component
// =============================================================================

export default function DiscoverPage() {
  const [websets, setWebsets] = useState<Webset[]>([])
  const [activeWebset, setActiveWebset] = useState<string | null>(null)
  const [results, setResults] = useState<ExaResult[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<ExaResult[]>([])
  const [exaConfigured, setExaConfigured] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  
  const [aiSummary, setAiSummary] = useState("")
  const [loadingSummary, setLoadingSummary] = useState(false)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  useSearchFocus(searchInputRef)
  useKeyboard({ key: "Escape", handler: () => { if (searchResults.length > 0) clearSearch() } })

  // Fetch AI summary
  const fetchSummary = useCallback(async (articles: ExaResult[]) => {
    if (articles.length < 2) return
    setLoadingSummary(true)
    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articles: articles.slice(0, 8).map(a => ({
            title: a.title,
            text: a.text?.slice(0, 800),
            highlights: a.highlights,
            url: a.url,
          }))
        })
      })
      const data = await response.json()
      if (data.briefSummary) setAiSummary(data.briefSummary)
    } catch {}
    setLoadingSummary(false)
  }, [])

  // Fetch websets
  useEffect(() => {
    const fetchWebsets = async () => {
      try {
        const response = await fetch("/api/exa")
        const data = await response.json()
        setExaConfigured(!data.error || data.configured)
        setWebsets(data.websets || [])
        if (data.websets?.length > 0) setActiveWebset(data.websets[0].id)
      } catch {
        setError("Failed to load feeds")
      } finally {
        setLoading(false)
      }
    }
    fetchWebsets()
  }, [])

  // Fetch results
  const fetchResults = useCallback(async (websetId: string, pageNum: number, append = false) => {
    if (!exaConfigured) return
    append ? setLoadingMore(true) : setLoading(true)
    if (!append) setAiSummary("")
    setError(null)

    try {
      const days = 3 + (pageNum - 1) * 2
      const response = await fetch(`/api/exa?webset=${websetId}&limit=${12 * pageNum}&days=${days}`)
      const data = await response.json()

      if (data.error) {
        setError(data.error)
        if (!append) setResults([])
      } else {
        const deduped = deduplicateResults(data.results || [])
        
        if (append) {
          const existingUrls = new Set(results.map(r => r.url))
          const newOnes = deduped.filter(r => !existingUrls.has(r.url))
          if (newOnes.length < 3) setHasMore(false)
          else setResults(prev => deduplicateResults([...prev, ...newOnes]))
        } else {
          setResults(deduped)
          setHasMore(deduped.length >= 8)
          if (deduped.length > 0) fetchSummary(deduped)
        }
      }
    } catch {
      setError("Failed to load articles")
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [exaConfigured, results, fetchSummary])

  useEffect(() => {
    if (!activeWebset || !exaConfigured) return
    setPage(1)
    setHasMore(true)
    fetchResults(activeWebset, 1)
  }, [activeWebset, exaConfigured])

  const loadMore = useCallback(() => {
    if (!activeWebset || loadingMore || !hasMore) return
    const next = page + 1
    setPage(next)
    fetchResults(activeWebset, next, true)
  }, [activeWebset, loadingMore, hasMore, page, fetchResults])

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loadingMore && !loading && results.length > 0) {
          loadMore()
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    )
    if (loadMoreRef.current) observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, loading, results.length, loadMore])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim() || !exaConfigured) return
    setIsSearching(true)
    setError(null)
    setAiSummary("")
    try {
      const response = await fetch(`/api/exa?q=${encodeURIComponent(searchQuery)}&limit=20&days=5`)
      const data = await response.json()
      if (data.error) setError(data.error)
      else {
        setSearchResults(deduplicateResults(data.results || []))
        setActiveWebset(null)
      }
    } catch {
      setError("Search failed")
    } finally {
      setIsSearching(false)
    }
  }

  const clearSearch = () => {
    setSearchQuery("")
    setSearchResults([])
    if (websets.length > 0) setActiveWebset(websets[0].id)
  }

  const handleRefresh = () => {
    if (searchResults.length > 0) {
      handleSearch({ preventDefault: () => {} } as React.FormEvent)
    } else if (activeWebset) {
      setPage(1)
      setHasMore(true)
      fetchResults(activeWebset, 1)
    }
  }

  const displayResults = searchResults.length > 0 ? searchResults : results
  const isSearchMode = searchResults.length > 0
  const activeWebsetData = websets.find(w => w.id === activeWebset)

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar activePage="discover" />

      {/* Main Container - fixed height, scrolls internally */}
      <div className="flex flex-1 h-full overflow-hidden">
        {/* Main Content */}
        <main className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
          {/* Header - fixed */}
          <header className="flex-shrink-0 flex items-center justify-between border-b px-6 py-4">
            <div>
              <h1 className="text-lg font-semibold">Discover</h1>
              <p className="text-sm text-muted-foreground">Curated news for investors</p>
            </div>
            <div className="flex items-center gap-2">
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="w-52 pl-9 h-9"
                    disabled={!exaConfigured}
                  />
                </div>
              </form>
              <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={loading || isSearching} className="h-9 w-9">
                <RefreshIcon className={`h-4 w-4 ${loading || isSearching ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </header>

          {/* Topics - fixed */}
          <div className="flex-shrink-0 border-b px-6 py-2.5 overflow-x-auto">
            <div className="flex items-center gap-1.5">
              {websets.map((webset) => {
                const isActive = activeWebset === webset.id && !isSearchMode
                return (
                  <button
                    key={webset.id}
                    onClick={() => { setActiveWebset(webset.id); setSearchResults([]); setSearchQuery("") }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors ${
                      isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {WEBSET_ICONS[webset.icon]}
                    {webset.name}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Feed - scrollable */}
          <section className="flex-1 overflow-y-auto">
            <div className="px-6 py-4">
              {!exaConfigured && (
                <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">
                  <span className="font-medium text-amber-600">API not configured.</span>{" "}
                  <span className="text-muted-foreground">Add EXA_API_KEY to your environment.</span>
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                  {error}
                </div>
              )}

              {isSearchMode && (
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{searchQuery}</Badge>
                    <span className="text-sm text-muted-foreground">{displayResults.length} results</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={clearSearch}>Clear</Button>
                </div>
              )}

              {loading && displayResults.length === 0 ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="py-4 border-b animate-pulse">
                      <div className="flex gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-32 bg-muted rounded" />
                          <div className="h-5 w-full bg-muted rounded" />
                          <div className="h-4 w-3/4 bg-muted rounded" />
                        </div>
                        <div className="w-24 h-18 bg-muted rounded-lg" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : displayResults.length === 0 ? (
                <div className="text-center py-12">
                  <SearchIcon className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No articles found</p>
                </div>
              ) : (
                <div>
                  {displayResults.map((article) => (
                    <ArticleRow key={article.id} article={article} />
                  ))}
                  
                  {!isSearchMode && (
                    <div ref={loadMoreRef} className="py-6 text-center">
                      {loadingMore ? (
                        <RefreshIcon className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                      ) : hasMore ? (
                        <Button variant="ghost" size="sm" onClick={loadMore}>Load more</Button>
                      ) : displayResults.length > 5 ? (
                        <p className="text-sm text-muted-foreground">End of feed</p>
                      ) : null}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </main>

        {/* Right Sidebar - fixed, doesn't scroll with content */}
        {/* Right Sidebar removed for now */}
      </div>
    </div>
  )
}
