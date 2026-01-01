"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Loader2 } from "lucide-react"

interface Report {
  id: string
  title: string
  type: string
  status: string
  created_at: string
  generated_at: string | null
}

interface ReportsWidgetProps {
  companyId: string
  companyName: string
}

export function ReportsWidget({ companyId, companyName }: ReportsWidgetProps) {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    loadReports()
  }, [companyId])

  const loadReports = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/reports?company_id=${companyId}`)
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

  const handleGenerateReport = async (type: "deal_closed" | "investment_memo") => {
    setGenerating(true)
    try {
      const response = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: companyId,
          type,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error("Report generation failed:", data)
        alert("Failed to generate report: " + (data.error || `HTTP ${response.status}`))
        return
      }

      if (data.success && data.report_id) {
        // Navigate to the new report
        window.location.href = `/reports/${data.report_id}`
      } else if (data.report_id) {
        // Report created but maybe still processing
        window.location.href = `/reports/${data.report_id}`
      } else {
        // Reload reports to see if it was created
        await loadReports()
      }
    } catch (error) {
      console.error("Error generating report:", error)
      alert("Failed to generate report - check console for details")
    } finally {
      setGenerating(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/10 text-green-600 border-green-500/20"
      case "generating":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20"
      case "failed":
        return "bg-red-500/10 text-red-600 border-red-500/20"
      default:
        return "bg-gray-500/10 text-gray-600 border-gray-500/20"
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
    <Card className="elevated">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Reports
          </CardTitle>
          <Link
            href="/reports"
            className="text-xs text-primary hover:underline"
          >
            View all
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : reports.length === 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              No reports generated yet
            </p>
            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleGenerateReport("deal_closed")}
                disabled={generating}
                className="w-full justify-start"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <svg
                    className="h-4 w-4 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                )}
                Generate Deal Report
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleGenerateReport("investment_memo")}
                disabled={generating}
                className="w-full justify-start"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <svg
                    className="h-4 w-4 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                )}
                Generate Investment Memo
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.slice(0, 3).map((report) => (
              <Link
                key={report.id}
                href={`/reports/${report.id}`}
                className="block p-3 rounded-lg border hover:border-primary/50 transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-sm font-medium">
                    {getTypeLabel(report.type)}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-xs ${getStatusColor(report.status)}`}
                  >
                    {report.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(report.created_at).toLocaleDateString()}
                </p>
              </Link>
            ))}
            {reports.length > 3 && (
              <Link
                href="/reports"
                className="block text-center text-xs text-primary hover:underline pt-2"
              >
                View {reports.length - 3} more →
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

