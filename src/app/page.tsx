"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Sidebar } from "@/components/pipeline/sidebar"
import { useAppStore } from "@/lib/store"
import {
  CalendarIcon,
  ClockIcon,
  ArrowRightIcon,
  PlusIcon,
  TrendingIcon,
  StarIcon,
  BellIcon,
  SearchIcon,
  UsersIcon,
  BuildingIcon,
  CheckIcon,
} from "@/components/icons"

interface NewsArticle {
  id: string
  companyName?: string
  title: string
  url: string
  source?: string
  publishedAt?: string
  summary?: string
}

interface RecentActivity {
  id: string
  type: "company_added" | "stage_change" | "comment" | "meeting"
  title: string
  subtitle?: string
  timestamp: Date
  companyId?: string
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export default function HomePage() {
  const router = useRouter()
  const { user } = useAuth()
  const { companies, founders, initialize } = useAppStore()

  const [news, setNews] = useState<NewsArticle[]>([])
  const [newsLoading, setNewsLoading] = useState(false)
  const [heroInput, setHeroInput] = useState("")

  useEffect(() => {
    initialize()
  }, [initialize])

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

  // Compute stats
  const stats = useMemo(() => {
    const totalCompanies = companies.length
    const activeDeals = companies.filter((c) => c.stage !== "Passed").length
    const followUps = companies.filter((c: any) => c.needs_followup).length
    const priorities = companies.filter((c: any) => c.is_priority).length
    const foundersCount = founders.length

    // Stage breakdown
    const stageBreakdown = {
      Inbound: companies.filter((c) => c.stage === "Inbound").length,
      Qualified: companies.filter((c) => c.stage === "Qualified").length,
      Diligence: companies.filter((c) => c.stage === "Diligence").length,
      Committed: companies.filter((c) => c.stage === "Committed").length,
      Passed: companies.filter((c) => c.stage === "Passed").length,
    }

    return { totalCompanies, activeDeals, followUps, priorities, foundersCount, stageBreakdown }
  }, [companies, founders])

  // Focus deals - priority companies and those needing follow-up
  const focusDeals = useMemo(() => {
    return companies
      .filter((company: any) => company.is_priority || company.needs_followup || company.needs_diligence)
      .slice(0, 5)
  }, [companies])

  // Recent companies (last 5 added)
  const recentCompanies = useMemo(() => {
    return [...companies]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
  }, [companies])

  // Recent activity feed (simulated from company data)
  const recentActivity = useMemo((): RecentActivity[] => {
    const activities: RecentActivity[] = []

    // Add recent companies as "added" activities
    recentCompanies.slice(0, 3).forEach((company: any) => {
      activities.push({
        id: `add-${company.id}`,
        type: "company_added",
        title: `Added ${company.name}`,
        subtitle: company.stage,
        timestamp: new Date(company.created_at),
        companyId: company.id,
      })
    })

    // Add companies with recent comments
    companies.slice(0, 5).forEach((company: any) => {
      if (company.comments?.length > 0) {
        const latestComment = company.comments[company.comments.length - 1]
        activities.push({
          id: `comment-${company.id}-${latestComment.id}`,
          type: "comment",
          title: `Note on ${company.name}`,
          subtitle: latestComment.content?.slice(0, 50) + (latestComment.content?.length > 50 ? "..." : ""),
          timestamp: new Date(latestComment.created_at),
          companyId: company.id,
        })
      }
    })

    // Sort by timestamp and return top 6
    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 6)
  }, [companies, recentCompanies])

  const handleStartChat = () => {
    if (heroInput.trim()) {
      sessionStorage.setItem("otho_initial_message", heroInput.trim())
    }
    router.push("/otho")
  }

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || ""

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar activePage="home" />

      <main className="flex flex-1 flex-col h-full overflow-hidden">
        {/* Fixed Header */}
        <header className="flex-shrink-0 border-b bg-card/50 px-6 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between max-w-7xl mx-auto">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Dashboard</p>
              <h1 className="font-display text-xl font-semibold tracking-tight">
                {getGreeting()}{userName ? `, ${userName.split(" ")[0]}` : ""}.
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/pipeline">
                  <BuildingIcon className="h-4 w-4 mr-1.5" />
                  View Pipeline
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/add-company">
                  <PlusIcon className="h-4 w-4 mr-1.5" />
                  Add Company
                </Link>
              </Button>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <section className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
            
            {/* Otho Chat Trigger - Hero */}
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5 overflow-hidden">
              <CardContent className="p-6">
                <div className="max-w-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                      <span className="text-primary-foreground text-sm font-semibold">O</span>
                    </div>
                    <h2 className="font-display text-lg font-semibold">Ask Otho</h2>
                  </div>
                  <p className="text-muted-foreground text-sm mb-4">
                    Your AI portfolio copilot. Research companies, draft emails, analyze founders, or get deal insights.
                  </p>
                  
                  <div className="relative">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      value={heroInput}
                      onChange={(e) => setHeroInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          handleStartChat()
                        }
                      }}
                      placeholder="Ask about your pipeline, research a company, or get deal advice..."
                      className="w-full rounded-xl border bg-background/80 backdrop-blur-sm shadow-sm pl-11 pr-24 py-3 text-sm transition-all placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/20 focus:outline-none focus:bg-background"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <kbd className="hidden sm:inline-flex h-6 items-center gap-1 rounded border bg-muted px-2 text-[10px] font-medium text-muted-foreground">
                        ⌘K
                      </kbd>
                      <Button 
                        size="sm" 
                        className="h-8 px-3 rounded-lg"
                        onClick={handleStartChat} 
                      >
                        <ArrowRightIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Overview */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <BuildingIcon className="h-5 w-5 text-muted-foreground" />
                    <Badge variant="secondary" className="text-xs font-normal">
                      Total
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold">{stats.totalCompanies}</p>
                  <p className="text-xs text-muted-foreground">Companies tracked</p>
                </CardContent>
              </Card>
              
              <Card className="border hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingIcon className="h-5 w-5 text-primary" />
                    <Badge variant="default" className="text-xs font-normal">
                      Active
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold">{stats.activeDeals}</p>
                  <p className="text-xs text-muted-foreground">Active deals</p>
                </CardContent>
              </Card>

              <Card className="border hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <BellIcon className="h-5 w-5 text-amber-500" />
                    {stats.followUps > 0 && (
                      <Badge variant="outline" className="text-xs font-normal text-amber-600 border-amber-300">
                        Action needed
                      </Badge>
                    )}
                  </div>
                  <p className="text-2xl font-bold">{stats.followUps}</p>
                  <p className="text-xs text-muted-foreground">Need follow-up</p>
                </CardContent>
              </Card>

              <Card className="border hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <UsersIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold">{stats.foundersCount}</p>
                  <p className="text-xs text-muted-foreground">Founders tracked</p>
                </CardContent>
              </Card>
            </div>

            {/* Pipeline Overview */}
            {stats.totalCompanies > 0 && (
              <Card className="border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">Pipeline Overview</CardTitle>
                    <Link href="/pipeline">
                      <Button variant="ghost" size="sm" className="h-7 text-xs">
                        View all <ArrowRightIcon className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(stats.stageBreakdown).map(([stage, count]) => {
                    const percentage = stats.totalCompanies > 0 
                      ? Math.round((count / stats.totalCompanies) * 100) 
                      : 0
                    return (
                      <div key={stage} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{stage}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                        <Progress value={percentage} className="h-1.5" />
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )}

            {/* Two Column Layout */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Focus Companies */}
              <Card className="border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StarIcon className="h-4 w-4 text-amber-500" filled />
                      <CardTitle className="text-sm font-medium">Focus Companies</CardTitle>
                    </div>
                    <Link href="/pipeline">
                      <Button variant="ghost" size="sm" className="h-7 text-xs">
                        View all
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {focusDeals.length === 0 ? (
                    <div className="py-8 text-center">
                      <StarIcon className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No priority companies</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Mark companies as priority to see them here
                      </p>
                    </div>
                  ) : (
                    focusDeals.map((company: any) => (
                      <Link key={company.id} href={`/company/${company.id}`} className="block">
                        <div className="flex items-center justify-between rounded-lg border bg-background p-3 hover:bg-secondary/30 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm truncate">{company.name}</p>
                              <Badge variant="secondary" className="text-xs font-normal">
                                {company.stage}
                              </Badge>
                            </div>
                            {company.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {company.description}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1.5 ml-2 flex-shrink-0">
                            {company.is_priority && (
                              <div className="h-2 w-2 rounded-full bg-amber-400" title="Priority" />
                            )}
                            {company.needs_followup && (
                              <div className="h-2 w-2 rounded-full bg-blue-400" title="Needs follow-up" />
                            )}
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ClockIcon className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {recentActivity.length === 0 ? (
                    <div className="py-8 text-center">
                      <ClockIcon className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No recent activity</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Add companies to get started
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentActivity.map((activity) => (
                        <div 
                          key={activity.id} 
                          className="flex items-start gap-3 text-sm"
                        >
                          <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${
                            activity.type === "company_added" ? "bg-green-400" :
                            activity.type === "comment" ? "bg-blue-400" :
                            activity.type === "stage_change" ? "bg-purple-400" :
                            "bg-muted-foreground"
                          }`} />
                          <div className="flex-1 min-w-0">
                            {activity.companyId ? (
                              <Link 
                                href={`/company/${activity.companyId}`}
                                className="font-medium hover:text-primary transition-colors"
                              >
                                {activity.title}
                              </Link>
                            ) : (
                              <p className="font-medium">{activity.title}</p>
                            )}
                            {activity.subtitle && (
                              <p className="text-xs text-muted-foreground truncate">
                                {activity.subtitle}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {getTimeAgo(activity.timestamp)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* News & Signals */}
            <Card className="border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingIcon className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm font-medium">Signals & News</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 text-xs" 
                      onClick={fetchNews} 
                      disabled={newsLoading}
                    >
                      {newsLoading ? "Loading..." : "Refresh"}
                    </Button>
                    <Link href="/discover">
                      <Button variant="ghost" size="sm" className="h-7 text-xs">
                        Discover <ArrowRightIcon className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {news.length === 0 && !newsLoading ? (
                  <div className="py-8 text-center">
                    <TrendingIcon className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No news available</p>
                    <Link href="/discover">
                      <Button variant="link" size="sm" className="mt-2">
                        Explore Discover →
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {news.slice(0, 6).map((article) => (
                      <a 
                        key={article.id} 
                        href={article.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="block group"
                      >
                        <div className="rounded-lg border bg-background p-4 h-full hover:bg-secondary/30 hover:border-primary/30 transition-all">
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-wide mb-2">
                            {article.companyName && (
                              <span className="font-semibold text-primary/80">{article.companyName}</span>
                            )}
                            {article.source && (
                              <>
                                {article.companyName && <span>•</span>}
                                <span>{article.source}</span>
                              </>
                            )}
                          </div>
                          <p className="text-sm font-medium leading-snug group-hover:text-primary line-clamp-2">
                            {article.title}
                          </p>
                          {article.summary && (
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                              {article.summary}
                            </p>
                          )}
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions Footer */}
            <div className="flex flex-wrap gap-3 justify-center py-4">
              <Link href="/add-company">
                <Button variant="outline" size="sm">
                  <PlusIcon className="h-4 w-4 mr-1.5" />
                  Add Company
                </Button>
              </Link>
              <Link href="/add-founder">
                <Button variant="outline" size="sm">
                  <PlusIcon className="h-4 w-4 mr-1.5" />
                  Add Founder
                </Button>
              </Link>
              <Link href="/founders">
                <Button variant="outline" size="sm">
                  <UsersIcon className="h-4 w-4 mr-1.5" />
                  View Founders
                </Button>
              </Link>
              <Link href="/settings">
                <Button variant="outline" size="sm">
                  Settings
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
