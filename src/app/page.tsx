"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sidebar } from "@/components/pipeline/sidebar"
import { useAppStore, syncCalendar, syncEmails } from "@/lib/store"

interface NewsArticle {
  id: string
  companyName?: string
  title: string
  url: string
  source?: string
  publishedAt?: string
  summary?: string
}

export default function HomePage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { companies, founders, lastSyncTime, initialize } = useAppStore()

  const [news, setNews] = useState<NewsArticle[]>([])
  const [newsLoading, setNewsLoading] = useState(false)
  const [heroInput, setHeroInput] = useState("")

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    const shouldSync = session?.accessToken && !lastSyncTime
    if (shouldSync) {
      syncCalendar()
      syncEmails()
    }
  }, [session?.accessToken, lastSyncTime])

  const fetchNews = useCallback(async () => {
    setNewsLoading(true)
    try {
      const response = await fetch("/api/news")
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to load news")
      setNews(data.articles || [])
    } catch (error: any) {
      console.error("News fetch error:", error)
    } finally {
      setNewsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNews()
  }, [fetchNews])

  const stats = useMemo(() => {
    const totalCompanies = companies.length
    const activeDeals = companies.filter((c) => c.stage !== "Passed").length
    const followUps = companies.filter((c: any) => c.needs_followup).length
    const foundersCount = founders.length
    return { totalCompanies, activeDeals, followUps, foundersCount }
  }, [companies, founders])

  const focusDeals = useMemo(() => {
    return companies
      .filter((company: any) => company.is_priority || company.needs_followup || company.needs_diligence)
      .slice(0, 4)
  }, [companies])

  const handleStartChat = () => {
    if (heroInput.trim()) {
      sessionStorage.setItem("otho_initial_message", heroInput.trim())
    }
    router.push("/otho")
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar activePage="home" />

      <main className="flex flex-1 flex-col h-full overflow-hidden">
        {/* Fixed Header */}
        <header className="flex-shrink-0 border-b bg-card/50 px-6 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between max-w-6xl mx-auto">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Dashboard</p>
              <h1 className="font-display text-xl font-semibold tracking-tight">
                Welcome back{session?.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""}.
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/pipeline">View Pipeline</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/add-company">Add Company</Link>
              </Button>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <section className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
            
            {/* Otho Chat Trigger */}
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="font-display text-2xl font-semibold text-foreground">Chat with Otho</h2>
              <p className="text-muted-foreground mt-1 text-sm">Your AI portfolio copilot. Ask anything about your deals or founders.</p>
              
              <div className="relative mt-4">
                <input
                  value={heroInput}
                  onChange={(e) => setHeroInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleStartChat()
                    }
                  }}
                  placeholder="Ask Otho anything..."
                  className="w-full rounded-2xl border bg-white shadow-sm px-5 py-3.5 text-base transition-all placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
                    ⌘K
                  </kbd>
                  <Button 
                    size="sm" 
                    className="h-8 px-3 rounded-xl"
                    onClick={handleStartChat} 
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </Button>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Portfolio companies" value={stats.totalCompanies} helper="Across all stages" />
              <StatCard label="Active deals" value={stats.activeDeals} helper="Not passed yet" />
              <StatCard label="Follow-ups" value={stats.followUps} helper="Need a response" />
              <StatCard label="Founders" value={stats.foundersCount} helper="People you're tracking" />
            </div>

            {/* Two Column Grid */}
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Focus companies</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {focusDeals.length === 0 && (
                    <p className="text-sm text-muted-foreground py-4 text-center">No flagged companies.</p>
                  )}
                  {focusDeals.map((company: any) => (
                    <Link key={company.id} href={`/company/${company.id}`} className="block">
                      <div className="flex items-center justify-between rounded-lg border bg-background p-3 hover:bg-secondary/30 transition-colors">
                        <div>
                          <p className="font-medium text-sm">{company.name}</p>
                          <p className="text-xs text-muted-foreground">{company.stage}</p>
                        </div>
                        <div className="flex gap-1">
                          {company.is_priority && <div className="h-2 w-2 rounded-full bg-amber-400" title="Priority" />}
                          {company.needs_followup && <div className="h-2 w-2 rounded-full bg-blue-400" title="Needs follow-up" />}
                        </div>
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>

              <Card className="border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Signals & News</CardTitle>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={fetchNews} disabled={newsLoading}>
                    {newsLoading ? "Loading..." : "Refresh"}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {news.slice(0, 3).map((article) => (
                    <a key={article.id} href={article.url} target="_blank" rel="noopener noreferrer" className="block group">
                      <div className="rounded-lg border bg-background p-3 hover:bg-secondary/30 transition-colors">
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
                          {article.companyName && <span className="font-semibold text-primary/80">{article.companyName}</span>}
                          {article.source && <span>• {article.source}</span>}
                        </div>
                        <p className="text-sm font-medium leading-tight group-hover:text-primary line-clamp-2">{article.title}</p>
                      </div>
                    </a>
                  ))}
                  {news.length === 0 && !newsLoading && (
                    <p className="text-sm text-muted-foreground py-4 text-center">No news right now.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

function StatCard({
  label,
  value,
  helper,
}: {
  label: string
  value: number
  helper?: string
}) {
  return (
    <Card className="border shadow-sm">
      <CardContent className="py-3 px-4">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
        <p className="text-2xl font-semibold text-foreground mt-0.5">{value}</p>
        {helper && <p className="text-xs text-muted-foreground mt-0.5">{helper}</p>}
      </CardContent>
    </Card>
  )
}
