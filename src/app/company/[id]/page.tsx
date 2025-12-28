"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeftIcon,
  CalendarIcon,
  MailIcon,
  MapPinIcon,
  GlobeIcon,
  RefreshIcon,
  BellIcon,
  StarIcon,
  SearchCheckIcon,
  TwitterIcon,
  LinkedInIcon,
  GoogleCalendarIcon,
} from "@/components/icons"
import { MeetingList, EmailList, CommentTimeline, DrivePicker, OthoReport } from "@/components/shared"
import { AccountChat } from "@/components/otho/account-chat"
import {
  useAppStore,
  syncCalendar,
  syncEmails,
  fetchCompanyWithRelations,
  STAGES,
  STAGE_CLASSES,
  formatRelative,
  type Stage,
  type CompanyWithRelations,
} from "@/lib/store"
import { formatDate, getTwitterUrl, getLinkedInUrl, getTwitterHandle } from "@/lib/utils"

// =============================================================================
// Page Component
// =============================================================================

export default function CompanyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const companyId = params.id as string
  const { user } = useAuth()

  const { lastSyncTime, syncing, emailSyncing, updateCompanyStage, addComment } =
    useAppStore()

  // State
  const [company, setCompany] = useState<CompanyWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  // Fetch logo from website
  useEffect(() => {
    if (company?.website) {
      fetch(`/api/logo?url=${encodeURIComponent(company.website)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.logoUrl) setLogoUrl(data.logoUrl)
        })
        .catch(() => {})
    }
  }, [company?.website])

  // Fetch company data
  useEffect(() => {
    async function loadCompany() {
      setLoading(true)
      const data = await fetchCompanyWithRelations(companyId)
      setCompany(data)
      setLoading(false)
    }
    loadCompany()
  }, [companyId])

  // Handlers
  const toggleFlag = async (
    flag: "needs_followup" | "needs_diligence" | "is_priority"
  ) => {
    if (!company) return
    const newValue = !(company as any)[flag]

    await fetch(`/api/companies/${companyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [flag]: newValue }),
    })

    const data = await fetchCompanyWithRelations(companyId)
    setCompany(data)
  }

  const handleSync = async () => {
    await Promise.all([syncCalendar(), syncEmails()])
    const data = await fetchCompanyWithRelations(companyId)
    setCompany(data)
  }

  const handleStageChange = async (newStage: Stage) => {
    await updateCompanyStage(companyId, newStage)
    const data = await fetchCompanyWithRelations(companyId)
    setCompany(data)
  }

  const handleAddComment = async (content: string) => {
    await addComment(companyId, content)
    const data = await fetchCompanyWithRelations(companyId)
    setCompany(data)
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  // Not found state
  if (!company) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Company not found</p>
      </div>
    )
  }

  const {
    founder,
    owner,
    comments = [],
    tags = [],
    calendar_events = [],
    email_threads = [],
  } = company

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary smooth"
            >
              <ArrowLeftIcon className="h-4 w-4 text-muted-foreground" />
            </button>
            <div className="h-6 w-px bg-border" />
            <Link
              href="/pipeline"
              className="text-sm text-muted-foreground hover:text-foreground smooth"
            >
              Pipeline
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm font-medium">{company.name}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Company Header */}
        <CompanyHeader
          company={company}
          logoUrl={logoUrl}
          setLogoUrl={setLogoUrl}
          tags={tags}
          onToggleFlag={toggleFlag}
          onStageChange={handleStageChange}
        />

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column - Founder & Activity */}
          <div className="lg:col-span-2 space-y-6">
            {/* Otho Report */}
            <OthoReport 
              companyId={company.id} 
              name={company.name}
              initialInsights={company.ai_analysis}
              website={company.website}
            />

            {/* Founder Card */}
            <FounderCard founder={founder} website={company.website} />

            {/* Meetings */}
            <MeetingList
              events={calendar_events}
              syncing={syncing}
              onSync={handleSync}
            />

            {/* Emails */}
            <EmailList
              emails={email_threads}
              syncing={emailSyncing}
              onSync={handleSync}
            />

            {/* Comments */}
            <CommentTimeline
              comments={comments.map((c) => ({
                id: c.id,
                content: c.content,
                comment_type: c.comment_type as any,
                created_at: c.created_at,
                author: (c as any).author,
              }))}
              onAddComment={handleAddComment}
            />
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Otho Chat - Moved to top */}
            <AccountChat companyId={company.id} contextName={company.name} />

            {/* Google Calendar Card */}
            <GoogleCalendarCard
              user={user}
              lastSyncTime={lastSyncTime}
              syncing={syncing}
              onSync={() => syncCalendar()}
            />

            {/* Google Drive */}
            <DrivePicker
              companyId={company.id}
              initialAttachments={(company as any).drive_documents || []}
            />

            {/* Owner */}
            <OwnerCard owner={owner} />

            {/* Timeline */}
            <TimelineCard company={company} />
          </div>
        </div>
      </main>
    </div>
  )
}

// =============================================================================
// Sub-Components
// =============================================================================

function CompanyHeader({
  company,
  logoUrl,
  setLogoUrl,
  tags,
  onToggleFlag,
  onStageChange,
}: {
  company: CompanyWithRelations
  logoUrl: string | null
  setLogoUrl: (url: string | null) => void
  tags: { id: string; label: string }[]
  onToggleFlag: (flag: "needs_followup" | "needs_diligence" | "is_priority") => void
  onStageChange: (stage: Stage) => void
}) {
  return (
    <div className="mb-8 flex items-start justify-between">
      <div className="flex items-start gap-5">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={company.name}
            className="h-16 w-16 rounded-xl object-contain bg-white border"
            onError={() => setLogoUrl(null)}
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-primary text-2xl font-semibold">
            {company.name.charAt(0)}
          </div>
        )}
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            {company.name}
          </h1>
          <p className="mt-1.5 max-w-xl text-muted-foreground leading-relaxed">
            {company.description}
          </p>
          <div className="mt-4 flex items-center gap-3">
            <Badge className={`${STAGE_CLASSES[company.stage]} border`}>
              {company.stage}
            </Badge>
            {tags.map((tag) => (
              <Badge key={tag.id} variant="secondary" className="text-xs">
                {tag.label}
              </Badge>
            ))}
          </div>

          {/* Custom Fields */}
          {(company as any).custom_fields?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
              {(company as any).custom_fields.map((field: any) => (
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
      </div>

      <div className="flex items-center gap-2">
        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onToggleFlag("is_priority")}
            className={`group relative flex items-center gap-2 px-3 h-9 rounded-lg border smooth ${
              (company as any).is_priority
                ? "bg-amber-50 border-amber-200 text-amber-600"
                : "hover:bg-secondary text-muted-foreground"
            }`}
            title={
              (company as any).is_priority
                ? "Priority: This company is marked as high priority. Click to remove."
                : "Priority: Mark this company as high priority for quick access and focus."
            }
          >
            <StarIcon className="h-4 w-4" filled={(company as any).is_priority} />
            <span className="text-xs font-medium">Priority</span>
          </button>
          <button
            onClick={() => onToggleFlag("needs_followup")}
            className={`group relative flex items-center gap-2 px-3 h-9 rounded-lg border smooth ${
              (company as any).needs_followup
                ? "bg-blue-50 border-blue-200 text-blue-600"
                : "hover:bg-secondary text-muted-foreground"
            }`}
            title={
              (company as any).needs_followup
                ? "Follow-up: You need to follow up with this company. Click to clear reminder."
                : "Follow-up: Set a reminder to follow up with this company later."
            }
          >
            <BellIcon className="h-4 w-4" />
            <span className="text-xs font-medium">Follow-up</span>
          </button>
          <button
            onClick={() => onToggleFlag("needs_diligence")}
            className={`group relative flex items-center gap-2 px-3 h-9 rounded-lg border smooth ${
              (company as any).needs_diligence
                ? "bg-purple-50 border-purple-200 text-purple-600"
                : "hover:bg-secondary text-muted-foreground"
            }`}
            title={
              (company as any).needs_diligence
                ? "Diligence: This company needs more research/diligence. Click to mark complete."
                : "Diligence: Mark this company as needing more research and due diligence."
            }
          >
            <SearchCheckIcon className="h-4 w-4" />
            <span className="text-xs font-medium">Diligence</span>
          </button>
        </div>

        <div className="h-6 w-px bg-border mx-1" />

        <Select value={company.stage} onValueChange={onStageChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Move stage" />
          </SelectTrigger>
          <SelectContent>
            {STAGES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline">Edit</Button>
      </div>
    </div>
  )
}

function FounderCard({
  founder,
  website,
}: {
  founder: CompanyWithRelations["founder"]
  website?: string | null
}) {
  if (!founder) {
    return (
      <Card className="elevated">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Founder
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No founder information</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="elevated">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Founder
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14 border">
            <AvatarFallback className="bg-secondary text-foreground font-medium">
              {founder.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-medium text-foreground">{founder.name}</h3>
            <p className="text-sm text-muted-foreground">{founder.role_title}</p>

            <div className="mt-4 grid gap-2">
              <a
                href={`mailto:${founder.email}`}
                className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground smooth"
              >
                <MailIcon className="h-4 w-4" />
                {founder.email}
              </a>
              {founder.linkedin && (
                <a
                  href={getLinkedInUrl(founder.linkedin)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground smooth"
                >
                  <LinkedInIcon className="h-4 w-4 text-[#0A66C2]" />
                  LinkedIn Profile
                </a>
              )}
              {founder.twitter && (
                <a
                  href={getTwitterUrl(founder.twitter)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground smooth"
                >
                  <TwitterIcon className="h-4 w-4" />@{getTwitterHandle(founder.twitter)}
                </a>
              )}
              {founder.location && (
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <MapPinIcon className="h-4 w-4" />
                  {founder.location}
                </div>
              )}
              {website && (
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground smooth"
                >
                  <GlobeIcon className="h-4 w-4" />
                  {website.replace("https://", "").replace("http://", "")}
                </a>
              )}
            </div>
          </div>

        </div>
      </CardContent>
    </Card>
  )
}

function GoogleCalendarCard({
  user,
  lastSyncTime,
  syncing,
  onSync,
}: {
  user: any
  lastSyncTime: Date | null
  syncing: boolean
  onSync: () => void
}) {
  // Check if Google Calendar is connected (has access token)
  const [isConnected, setIsConnected] = useState(false)
  
  useEffect(() => {
    async function checkConnection() {
      if (!user) {
        setIsConnected(false)
        return
      }
      
      try {
        const res = await fetch('/api/integrations/check?provider=google_calendar')
        const data = await res.json()
        setIsConnected(data.connected || false)
      } catch {
        setIsConnected(false)
      }
    }
    checkConnection()
  }, [user])
  
  return (
    <Card className="elevated">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Google Calendar
          </CardTitle>
          {isConnected && (
            <div className="flex items-center gap-2">
              <div className="sync-indicator" />
              <span className="text-xs text-muted-foreground">Connected</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
            <div className="flex items-center gap-2">
              <GoogleCalendarIcon className="h-5 w-5" />
              <div>
                <p className="text-sm font-medium">{user?.email}</p>
                {lastSyncTime && (
                  <p className="text-xs text-muted-foreground">
                    Synced {formatRelative(lastSyncTime.toISOString())}
                  </p>
                )}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onSync} disabled={syncing}>
              <RefreshIcon className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        ) : (
          <Link href="/settings/integrations">
            <Button variant="outline" className="w-full">
              <GoogleCalendarIcon className="h-4 w-4 mr-2" />
              Connect Calendar
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  )
}

function OwnerCard({ owner }: { owner: CompanyWithRelations["owner"] }) {
  return (
    <Card className="elevated">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Owner
        </CardTitle>
      </CardHeader>
      <CardContent>
        {owner ? (
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border">
              <AvatarFallback className="bg-secondary text-foreground text-sm font-medium">
                {owner.initials ||
                  owner.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{owner.name}</p>
              <p className="text-xs text-muted-foreground">{owner.email}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No owner assigned</p>
        )}
      </CardContent>
    </Card>
  )
}

function TimelineCard({ company }: { company: CompanyWithRelations }) {
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
            <span>Added to pipeline</span>
            <span>{formatDate(company.created_at)}</span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Last updated</span>
            <span>{formatRelative(company.updated_at)}</span>
          </div>
          {company.last_touch && (
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Last contact</span>
              <span>{formatRelative(company.last_touch)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
