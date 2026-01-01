"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Loader2 } from "lucide-react"
import { Sidebar } from "@/components/pipeline/sidebar"

interface ReportSection {
  id: string
  section_type: string
  title: string
  content: string
  order_index: number
}

interface ReportSource {
  id: string
  source_type: string
  source_url: string | null
  title: string
  snippet: string
  citation_key: string
}

interface Report {
  id: string
  title: string
  type: string
  status: string
  created_at: string
  generated_at: string | null
  generation_time_ms: number | null
  content: {
    sections?: Array<{ type: string; title: string; content: string }>
    raw_content?: string
    guard_validation?: any
    source_count?: number
  } | null
  company: {
    id: string
    name: string
    logo_url: string | null
    stage: string
    website: string | null
    description: string | null
    founder: any
  }
  sections: ReportSection[]
  sources: ReportSource[]
}

export default function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [copying, setCopying] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
    loadReport()
  }, [resolvedParams.id])

  // Poll for updates if report is pending/generating
  useEffect(() => {
    if (report && (report.status === "pending" || report.status === "generating")) {
      const interval = setInterval(loadReport, 5000) // Poll every 5 seconds
      return () => clearInterval(interval)
    }
  }, [report?.status])

  const loadReport = async () => {
    try {
      const response = await fetch(`/api/reports/${resolvedParams.id}`)
      const data = await response.json()

      if (data.report) {
        setReport(data.report)
      }
    } catch (error) {
      console.error("Error loading report:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerate = async () => {
    if (!report) return
    
    setRegenerating(true)
    try {
      const response = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: report.company.id,
          type: report.type,
          report_id: report.id,
        }),
      })
      
      if (response.ok) {
        // Successful generation
        loadReport()
      } else {
        // Handle error
        const data = await response.json()
        alert(`Failed to generate report: ${data.error || "Unknown error"}`)
        loadReport() // Reload to get current state
      }
    } catch (error) {
      console.error("Error regenerating report:", error)
      alert("Network error while generating report. Please try again.")
    } finally {
      setRegenerating(false)
    }
  }

  const handleCopy = async () => {
    if (!report) return

    setCopying(true)
    try {
      let text = `${report.title}\n`
      text += `Generated: ${new Date(report.generated_at || report.created_at).toLocaleDateString()}\n`
      text += `Company: ${report.company.name}\n\n`
      text += "=".repeat(60) + "\n\n"

      // Use sections from DB if available, otherwise from content
      const sections = report.sections?.length > 0 
        ? report.sections 
        : report.content?.sections || []

      sections.forEach((section: any) => {
        text += `${section.title}\n`
        text += "-".repeat(section.title.length) + "\n\n"
        text += `${section.content}\n\n`
      })

      // If no sections but raw content, use that
      if (sections.length === 0 && report.content?.raw_content) {
        text += report.content.raw_content
      }

      // Add sources
      if (report.sources?.length > 0) {
        text += "\n" + "=".repeat(60) + "\n\n"
        text += "SOURCES\n\n"
        report.sources.forEach((source) => {
          text += `[${source.citation_key}] ${source.title}\n`
          if (source.source_url) {
            text += `    ${source.source_url}\n`
          }
          text += `    ${source.snippet}\n\n`
        })
      }

      await navigator.clipboard.writeText(text)
      alert("Report copied to clipboard!")
    } catch (error) {
      console.error("Error copying report:", error)
      alert("Failed to copy report")
    } finally {
      setCopying(false)
    }
  }

  const handleExportPDF = () => {
    window.print()
  }

  const handleOpenInDocs = async () => {
    if (!report) return

    let text = `${report.title}\n\n`
    
    const sections = report.sections?.length > 0 
      ? report.sections 
      : report.content?.sections || []

    sections.forEach((section: any) => {
      text += `${section.title}\n${section.content}\n\n`
    })

    if (sections.length === 0 && report.content?.raw_content) {
      text += report.content.raw_content
    }

    const encodedText = encodeURIComponent(text)
    window.open(
      `https://docs.google.com/document/create?title=${encodeURIComponent(report.title)}&body=${encodedText}`,
      "_blank"
    )
  }

  // Helper to render markdown-like content
  const renderContent = (content: string) => {
    // Split by double newlines for paragraphs
    const paragraphs = content.split(/\n\n+/)
    
    return paragraphs.map((paragraph, idx) => {
      // Check if it's a bullet list
      if (paragraph.trim().startsWith("- ") || paragraph.trim().startsWith("• ")) {
        const items = paragraph.split(/\n/).filter(line => line.trim())
        return (
          <ul key={idx} className="list-disc pl-6 mb-4 space-y-1">
            {items.map((item, itemIdx) => (
              <li key={itemIdx} className="text-foreground">
                {item.replace(/^[-•]\s*/, "")}
              </li>
            ))}
          </ul>
        )
      }
      
      // Check if it's a numbered list
      if (/^\d+\.\s/.test(paragraph.trim())) {
        const items = paragraph.split(/\n/).filter(line => line.trim())
        return (
          <ol key={idx} className="list-decimal pl-6 mb-4 space-y-1">
            {items.map((item, itemIdx) => (
              <li key={itemIdx} className="text-foreground">
                {item.replace(/^\d+\.\s*/, "")}
              </li>
            ))}
          </ol>
        )
      }
      
      // Regular paragraph - handle citation references [S1], [S2], etc.
      const contentWithCitations = paragraph.replace(
        /\[S(\d+)\]/g,
        '<span class="text-primary font-medium text-sm">[S$1]</span>'
      )
      
      return (
        <p 
          key={idx} 
          className="mb-4 last:mb-0 text-foreground leading-relaxed"
          dangerouslySetInnerHTML={{ __html: contentWithCitations }}
        />
      )
    })
  }

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar activePage="reports" />
        <div className="flex-1 overflow-y-auto p-8">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar activePage="reports" />
        <div className="flex-1 overflow-y-auto p-8">
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Report not found</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => router.push("/reports")}
              >
                Back to Reports
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Determine what content to display
  const displaySections = report.sections?.length > 0 
    ? report.sections 
    : report.content?.sections?.map((s, idx) => ({
        id: `section-${idx}`,
        section_type: s.type,
        title: s.title,
        content: s.content,
        order_index: idx,
      })) || []

  const rawContent = report.content?.raw_content

  // Status badge color
  const statusColor = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    generating: "bg-blue-100 text-blue-800 border-blue-200",
    completed: "bg-green-100 text-green-800 border-green-200",
    failed: "bg-red-100 text-red-800 border-red-200",
  }[report.status] || "bg-gray-100 text-gray-800"

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar activePage="reports" />
      <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto print:max-w-none print:p-4">
        {/* Header */}
        <div className="mb-8 print:mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/reports")}
            className="mb-4 print:hidden"
          >
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Reports
          </Button>

          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-start gap-4 flex-1">
              <Avatar className="h-16 w-16 rounded-lg print:h-12 print:w-12">
                <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xl">
                  {report.company.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="font-display text-3xl font-semibold mb-2 print:text-2xl">
                  {report.title}
                </h1>
                <p className="text-muted-foreground">
                  {report.type === "deal_closed" ? "Deal Report" : "Investment Memo"}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={statusColor}>{report.status}</Badge>
                  {report.generated_at && (
                    <span className="text-xs text-muted-foreground">
                      Generated {new Date(report.generated_at).toLocaleDateString()}
                    </span>
                  )}
                  {report.generation_time_ms && (
                    <span className="text-xs text-muted-foreground">
                      ({(report.generation_time_ms / 1000).toFixed(1)}s)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 print:hidden">
              {(report.status === "failed" || report.status === "pending" || report.status === "generating") && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  className="bg-[#d4a853] hover:bg-[#c4983d]"
                >
                  {regenerating ? (
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
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  )}
                  {report.status === "failed" ? "Retry" : report.status === "generating" ? "Regenerate" : "Generate"}
                </Button>
              )}
              {report.status === "completed" && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    disabled={copying}
                  >
                    {copying ? (
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
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    )}
                    Copy
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportPDF}>
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
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                    PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleOpenInDocs}>
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
                    Google Docs
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Company Link */}
          <Link
            href={`/company/${report.company.id}`}
            className="text-sm text-primary hover:underline print:hidden"
          >
            View company profile →
          </Link>
        </div>

        {/* Status Messages */}
        {report.status === "pending" && (
          <Card className="mb-6 border-[#d4a853]/30 bg-[rgba(212,168,83,0.05)]">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-[rgba(212,168,83,0.15)] flex items-center justify-center">
                <svg className="h-5 w-5 text-[#92710d]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-foreground">Report Pending</h3>
                <p className="text-sm text-muted-foreground">
                  This report is queued for generation. Click to generate now.
                </p>
              </div>
              <Button
                size="sm"
                onClick={handleRegenerate}
                disabled={regenerating}
                className="bg-[#d4a853] hover:bg-[#c4983d] text-white"
              >
                {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate Now"}
              </Button>
            </CardContent>
          </Card>
        )}

        {report.status === "generating" && (
          <Card className="mb-6 border-[#d4a853]/30 bg-[rgba(212,168,83,0.05)]">
            <CardContent className="p-6 flex items-center gap-4">
              <Loader2 className="h-8 w-8 text-[#d4a853] animate-spin" />
              <div className="flex-1">
                <h3 className="font-medium text-foreground">Generating Report...</h3>
                <p className="text-sm text-muted-foreground">
                  AI is analyzing company data and web sources. This may take 1-2 minutes.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                disabled={regenerating}
              >
                {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Force Regenerate"}
              </Button>
            </CardContent>
          </Card>
        )}

        {report.status === "failed" && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-red-800">Generation Failed</h3>
                <p className="text-sm text-red-700">
                  There was an error generating this report. Please try again.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                disabled={regenerating}
                className="ml-auto"
              >
                {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Retry"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Report Content */}
        {report.status === "completed" && (
          <div className="space-y-6">
            {/* Display sections if available */}
            {displaySections.length > 0 ? (
              displaySections.map((section) => (
                <Card key={section.id} className="print:break-inside-avoid print:shadow-none print:border">
                  <CardHeader className="pb-3">
                    <h2 className="text-xl font-semibold">{section.title}</h2>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none">
                      {renderContent(section.content)}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : rawContent ? (
              // Fallback to raw content if no structured sections
              <Card className="print:break-inside-avoid print:shadow-none print:border">
                <CardContent className="p-6">
                  <div className="prose prose-sm max-w-none">
                    {renderContent(rawContent)}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">No content available for this report.</p>
                </CardContent>
              </Card>
            )}

            {/* Sources */}
            {report.sources?.length > 0 && (
              <Card className="print:break-inside-avoid print:shadow-none print:border">
                <CardHeader className="pb-3">
                  <h2 className="text-xl font-semibold">Sources</h2>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {report.sources.map((source) => (
                      <div
                        key={source.id}
                        className="border-l-2 border-primary/20 pl-4"
                      >
                        <div className="flex items-start gap-2 mb-1">
                          <Badge variant="outline" className="text-xs shrink-0">
                            {source.citation_key}
                          </Badge>
                          <span className="font-medium text-sm">{source.title}</span>
                        </div>
                        {source.source_url && (
                          <a
                            href={source.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline block mb-1 truncate"
                          >
                            {source.source_url}
                          </a>
                        )}
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {source.snippet}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
