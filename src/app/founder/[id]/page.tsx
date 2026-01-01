"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowLeftIcon,
  MailIcon,
  MapPinIcon,
  BuildingIcon,
  GraduationCapIcon,
  BriefcaseIcon,
  TwitterIcon,
  LinkedInIcon,
} from "@/components/icons"
import { MeetingList, EmailList, CommentTimeline, DrivePicker, OthoReport } from "@/components/shared"
import { EditFounderDialog } from "@/components/shared/edit-founder-dialog"
import { AccountChat } from "@/components/otho/account-chat"
import { formatRelative, syncCalendar, syncEmails, useAppStore } from "@/lib/store"
import { formatDate, getTwitterUrl, getLinkedInUrl, getTwitterHandle } from "@/lib/utils"
import type {
  FounderWithRelations,
  Company,
} from "@/lib/supabase/types"

// =============================================================================
// API Functions
// =============================================================================

async function fetchFounder(id: string): Promise<FounderWithRelations | null> {
  try {
    const response = await fetch(`/api/founders/${id}`)
    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error("Failed to fetch founder")
    }
    return await response.json()
  } catch (error) {
    console.error("Error fetching founder:", error)
    return null
  }
}

// =============================================================================
// Page Component
// =============================================================================

export default function FounderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const founderId = params.id as string
  const { syncing, emailSyncing } = useAppStore()

  // State
  const [founder, setFounder] = useState<FounderWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  // Scroll to top on mount - aggressive approach
  useEffect(() => {
    // Immediate scroll
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    
    // Also scroll after a short delay to override any other scroll behavior
    const timer = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }, 100)
    
    return () => clearTimeout(timer)
  }, [founderId])

  // Fetch founder data
  useEffect(() => {
    async function loadFounder() {
      setLoading(true)
      const data = await fetchFounder(founderId)
      setFounder(data)
      setLoading(false)
    }
    loadFounder()
  }, [founderId])

  // Handlers
  const handleSync = async () => {
    await Promise.all([syncCalendar(), syncEmails()])
    const data = await fetchFounder(founderId)
    setFounder(data)
  }

  const handleAddComment = async (content: string) => {
    const response = await fetch(`/api/founders/${founderId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })

    if (response.ok) {
      const data = await fetchFounder(founderId)
      setFounder(data)
    }
  }

  const handleUpdateFounder = async (updates: Partial<FounderWithRelations>) => {
    const response = await fetch(`/api/founders/${founderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })

    if (response.ok) {
      const data = await fetchFounder(founderId)
      setFounder(data)
    } else {
      const error = await response.json()
      throw new Error(error.error || "Failed to update founder")
    }
  }

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [founderId])

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  // Not found state
  if (!founder) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Founder not found</p>
      </div>
    )
  }

  const companies = founder.companies || []
  const comments = founder.comments || []
  const calendarEvents = founder.calendar_events || []
  const emailThreads = founder.email_threads || []

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50">
        <div className="mx-auto max-w-5xl px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary smooth"
            >
              <ArrowLeftIcon className="h-4 w-4 text-muted-foreground" />
            </button>
            <div className="h-6 w-px bg-border" />
            <Link
              href="/founders"
              className="text-sm text-muted-foreground hover:text-foreground smooth"
            >
              Founders
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm font-medium">{founder.name}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* Founder Header */}
        <FounderHeader 
          founder={founder} 
          companies={companies}
          onEdit={() => setEditDialogOpen(true)}
        />

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column - Details & Activity */}
          <div className="lg:col-span-2 space-y-8">
            {/* Otho Report */}
            <OthoReport 
              founderId={founder.id} 
              name={founder.name}
            />

            {/* Background Info */}
            <BackgroundSection founder={founder} />

            {/* Meetings */}
            <MeetingList
              events={calendarEvents}
              syncing={syncing}
              onSync={handleSync}
            />

            {/* Emails */}
            <EmailList
              emails={emailThreads}
              syncing={emailSyncing}
              onSync={handleSync}
            />

            {/* Comments */}
            <CommentTimeline
              comments={comments.map((c) => ({
                id: c.id,
                content: c.content,
                created_at: c.created_at,
                author: (c as any).author,
              }))}
              onAddComment={handleAddComment}
              title="Activity"
              placeholder="Add a note..."
            />
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Otho Chat - Moved to top */}
            <AccountChat founderId={founder.id} contextName={founder.name} />

            {/* Companies */}
            <CompaniesCard companies={companies} founder={founder} />

            {/* Source & Intro Path */}
            <SourceCard founder={founder} />

            {/* Notes */}
            <NotesCard notes={founder.notes} />

            {/* Google Drive */}
            <DrivePicker
              founderId={founder.id}
              initialAttachments={(founder as any).drive_documents || []}
            />

            {/* Timeline */}
            <TimelineCard founder={founder} />
          </div>
        </div>
      </main>

      {/* Edit Dialog */}
      {founder && (
        <EditFounderDialog
          founder={founder}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSave={handleUpdateFounder}
        />
      )}
    </div>
  )
}

// =============================================================================
// Sub-Components
// =============================================================================

function FounderHeader({
  founder,
  companies,
  onEdit,
}: {
  founder: FounderWithRelations
  companies: Company[]
  onEdit: () => void
}) {
  return (
    <div className="mb-8 flex items-start gap-6">
      <Avatar className="h-20 w-20 border-2">
        <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
          {founder.name
            .split(" ")
            .map((n) => n[0])
            .join("")}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {founder.name}
        </h1>
        {founder.role_title && (
          <p className="mt-1 text-muted-foreground">{founder.role_title}</p>
        )}
        {founder.bio && (
          <p className="mt-3 text-muted-foreground leading-relaxed max-w-2xl">
            {founder.bio}
          </p>
        )}

        {/* Quick Links */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted-foreground">{founder.email}</span>
          <div className="flex items-center gap-1.5">
            <a
              href={`mailto:${founder.email}`}
              className="flex items-center justify-center h-8 w-8 rounded-lg border bg-background hover:bg-secondary transition-colors"
              title="Email"
            >
              <MailIcon className="h-3.5 w-3.5 text-muted-foreground" />
            </a>
            {founder.linkedin && (
              <a
                href={getLinkedInUrl(founder.linkedin)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center h-8 w-8 rounded-lg border bg-background hover:bg-secondary transition-colors"
                title="LinkedIn"
              >
                <LinkedInIcon className="h-3.5 w-3.5 text-[#0A66C2]" />
              </a>
            )}
            {founder.twitter && (
              <a
                href={getTwitterUrl(founder.twitter)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center h-8 w-8 rounded-lg border bg-background hover:bg-secondary transition-colors"
                title="Twitter/X"
              >
                <TwitterIcon className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
          {founder.location && (
            <span className="flex items-center gap-2 text-sm text-muted-foreground ml-auto">
              <MapPinIcon className="h-4 w-4" />
              {founder.location}
            </span>
          )}
        </div>

        {/* Custom Fields */}
        {(founder as any).custom_fields?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
            {(founder as any).custom_fields.map((field: any) => (
              <div key={field.id} className="text-sm">
                <span className="text-muted-foreground">{field.field_name}:</span>{" "}
                {field.field_type === "url" ? (
                  <a
                    href={field.field_value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {field.field_value?.replace(/^https?:\/\//, "").slice(0, 30)}
                  </a>
                ) : field.field_type === "email" ? (
                  <a
                    href={`mailto:${field.field_value}`}
                    className="text-primary hover:underline"
                  >
                    {field.field_value}
                  </a>
                ) : (
                  <span className="font-medium">{field.field_value}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <a
            href={`mailto:${founder.email}`}
            className="flex items-center justify-center h-9 w-9 rounded-lg border bg-background hover:bg-secondary transition-colors"
            title="Email"
          >
            <MailIcon className="h-4 w-4 text-muted-foreground" />
          </a>
          {founder.linkedin && (
            <a
              href={getLinkedInUrl(founder.linkedin)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center h-9 w-9 rounded-lg border bg-background hover:bg-secondary transition-colors"
              title="LinkedIn"
            >
              <LinkedInIcon className="h-4 w-4 text-[#0A66C2]" />
            </a>
          )}
          {founder.twitter && (
            <a
              href={getTwitterUrl(founder.twitter)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center h-9 w-9 rounded-lg border bg-background hover:bg-secondary transition-colors"
              title="Twitter/X"
            >
              <TwitterIcon className="h-4 w-4" />
            </a>
          )}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Button size="sm" variant="outline" onClick={onEdit}>
            <svg className="h-4 w-4 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit
          </Button>
          {companies.length === 0 && (
            <Button size="sm" asChild>
              <Link
                href={`/add-company?founder_id=${founder.id}&founder_name=${encodeURIComponent(founder.name)}&founder_email=${encodeURIComponent(founder.email)}`}
              >
                <BuildingIcon className="h-4 w-4 mr-1.5" />
                Add Company
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function BackgroundSection({ founder }: { founder: FounderWithRelations }) {
  if (
    !founder.previous_companies &&
    !founder.education &&
    !founder.domain_expertise?.length
  ) {
    return null
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
        Background
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {founder.previous_companies && (
          <div className="flex items-start gap-3">
            <BriefcaseIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">Previous Companies</p>
              <p className="text-sm text-muted-foreground">
                {founder.previous_companies}
              </p>
            </div>
          </div>
        )}
        {founder.education && (
          <div className="flex items-start gap-3">
            <GraduationCapIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">Education</p>
              <p className="text-sm text-muted-foreground">{founder.education}</p>
            </div>
          </div>
        )}
      </div>
      {founder.domain_expertise && founder.domain_expertise.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {founder.domain_expertise.map((domain, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {domain}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

function CompaniesCard({
  companies,
  founder,
}: {
  companies: Company[]
  founder: FounderWithRelations
}) {
  return (
    <Card className="elevated">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Companies
          </CardTitle>
          <span className="text-xs text-muted-foreground">{companies.length}</span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {companies.length > 0 ? (
          <div className="divide-y">
            {companies.map((company) => (
              <Link
                key={company.id}
                href={`/company/${company.id}`}
                className="flex items-center gap-3 px-6 py-4 hover:bg-secondary/30 smooth"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-medium">
                  {company.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{company.name}</p>
                  <p className="text-xs text-muted-foreground">{company.stage}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center px-6">
            <BuildingIcon className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No companies yet</p>
            <Button variant="link" size="sm" className="text-primary mt-1" asChild>
              <Link
                href={`/add-company?founder_id=${founder.id}&founder_name=${encodeURIComponent(founder.name)}&founder_email=${encodeURIComponent(founder.email)}`}
              >
                Add a company
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SourceCard({ founder }: { founder: FounderWithRelations }) {
  if (!founder.source && !founder.warm_intro_path) {
    return null
  }

  return (
    <Card className="elevated">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          How You Know Them
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {founder.source && (
          <div>
            <p className="text-xs text-muted-foreground">Source</p>
            <p className="text-sm">{founder.source}</p>
          </div>
        )}
        {founder.warm_intro_path && (
          <div>
            <p className="text-xs text-muted-foreground">Warm Intro Path</p>
            <p className="text-sm">{founder.warm_intro_path}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function NotesCard({ notes }: { notes?: string | null }) {
  if (!notes) return null

  return (
    <Card className="elevated">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Notes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {notes}
        </p>
      </CardContent>
    </Card>
  )
}

function TimelineCard({ founder }: { founder: FounderWithRelations }) {
  return (
    <Card className="elevated">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Added</span>
            <span>{formatDate(founder.created_at)}</span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Last updated</span>
            <span>{formatRelative(founder.updated_at)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
