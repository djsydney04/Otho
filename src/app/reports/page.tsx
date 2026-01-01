"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Loader2 } from "lucide-react"
import { Sidebar } from "@/components/pipeline/sidebar"

interface Report {
  id: string
  title: string
  type: string
  status: string
  created_at: string
  generated_at: string | null
  generation_time_ms: number | null
  company: {
    id: string
    name: string
    logo_url: string | null
    stage: string
  }
  sources: { count: number }[]
}

export default function ReportsPage() {
  const router = useRouter()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "deal_closed" | "investment_memo">("all")

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    loadReports()
  }, [filter])

  const loadReports = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter !== "all") {
        params.set("type", filter)
      }

      const response = await fetch(`/api/reports?${params}`)
      const data = await response.json()

      if (data.reports) {
        setReports(data.reports)
      }
    } catch (error) {
      console.error("Error loading reports:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="success">Completed</Badge>
      case "generating":
        return (
          <Badge variant="info" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Generating
          </Badge>
        )
      case "pending":
        return <Badge variant="warning">Pending</Badge>
      case "failed":
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "deal_closed":
        return "Deal Report"
      case "investment_memo":
        return "Investment Memo"
      default:
        return "Custom Report"
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar activePage="reports" />
      
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
            <p className="text-muted-foreground mt-1">
              AI-generated deal reports and investment memos with comprehensive analysis
            </p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 mb-6">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              All Reports
            </Button>
            <Button
              variant={filter === "deal_closed" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("deal_closed")}
            >
              Deal Reports
            </Button>
            <Button
              variant={filter === "investment_memo" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("investment_memo")}
            >
              Investment Memos
            </Button>
            
            <div className="flex-1" />
            
            <span className="text-sm text-muted-foreground">
              {loading ? "Loading..." : `${reports.length} reports`}
            </span>
          </div>

          {/* Reports List */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-11 w-11 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <Skeleton className="h-6 w-20 rounded-md" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : reports.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                    <svg
                      className="h-7 w-7 text-muted-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">No reports yet</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Reports are automatically generated when deals are closed, or you can create them manually from any company page.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => router.push("/pipeline")}
                    className="mt-2"
                  >
                    Go to Pipeline
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <Card
                  key={report.id}
                  className="hover:border-primary/30 hover:shadow-elevation-2 transition-all cursor-pointer group"
                  onClick={() => router.push(`/reports/${report.id}`)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      {/* Company Avatar */}
                      <Avatar className="h-11 w-11 rounded-lg">
                        <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-medium">
                          {report.company.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      {/* Report Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-medium truncate">
                            {report.company.name}
                          </h3>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-sm text-muted-foreground">
                            {getTypeLabel(report.type)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>
                            {new Date(report.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                          {report.generated_at && report.generation_time_ms && (
                            <>
                              <span>·</span>
                              <span>
                                {(report.generation_time_ms / 1000).toFixed(1)}s
                              </span>
                            </>
                          )}
                          {report.sources?.[0]?.count && (
                            <>
                              <span>·</span>
                              <span>{report.sources[0].count} sources</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Status Badge */}
                      {getStatusBadge(report.status)}

                      {/* Arrow */}
                      <svg
                        className="h-5 w-5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
