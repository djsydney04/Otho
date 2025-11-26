"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useSession, signIn } from "next-auth/react"
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
import { Input } from "@/components/ui/input"

import { useAppStore, syncCalendar, syncEmails, fetchCompanyWithRelations, STAGES, STAGE_CLASSES, formatRelative, type Stage, type CompanyWithRelations } from "@/lib/store"
import type { CalendarEvent, EmailThread } from "@/lib/supabase/types"

// Icons
function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 6L12 13L2 6" />
    </svg>
  )
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  )
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  )
}

function MessageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  )
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  )
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

function GoogleCalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="18" rx="2" fill="#4285F4"/>
      <rect x="3" y="4" width="9" height="9" fill="#EA4335"/>
      <rect x="12" y="4" width="9" height="9" fill="#FBBC05"/>
      <rect x="3" y="13" width="9" height="9" fill="#34A853"/>
      <rect x="12" y="13" width="9" height="9" fill="#4285F4"/>
      <rect x="7" y="8" width="10" height="10" rx="1" fill="white"/>
      <line x1="10" y1="6" x2="10" y2="9" stroke="#EA4335" strokeWidth="1"/>
      <line x1="14" y1="6" x2="14" y2="9" stroke="#EA4335" strokeWidth="1"/>
    </svg>
  )
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M23 4v6h-6" />
      <path d="M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  )
}

function VideoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="6" width="14" height="12" rx="2" />
      <path d="M22 8l-4 2v4l4 2V8z" />
    </svg>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  )
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

function InboxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
    </svg>
  )
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function CompanyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const companyId = params.id as string
  const { data: session } = useSession()
  
  const { lastSyncTime, syncing, emailSyncing, updateCompanyStage, addComment } = useAppStore()
  
  const [newComment, setNewComment] = useState("")
  const [company, setCompany] = useState<CompanyWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set())
  
  const toggleEmailExpand = (emailId: string) => {
    setExpandedEmails(prev => {
      const next = new Set(prev)
      if (next.has(emailId)) {
        next.delete(emailId)
      } else {
        next.add(emailId)
      }
      return next
    })
  }
  
  const handleSync = async () => {
    await Promise.all([syncCalendar(), syncEmails()])
    // Refresh company data
    const data = await fetchCompanyWithRelations(companyId)
    setCompany(data)
  }
  
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
  
  const handleStageChange = async (newStage: Stage) => {
    await updateCompanyStage(companyId, newStage)
    // Refresh company data
    const data = await fetchCompanyWithRelations(companyId)
    setCompany(data)
  }
  
  const handleAddComment = async () => {
    if (!newComment.trim()) return
    await addComment(companyId, newComment.trim())
    setNewComment("")
    // Refresh company data
    const data = await fetchCompanyWithRelations(companyId)
    setCompany(data)
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAddComment()
    }
  }
  
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }
  
  if (!company) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Company not found</p>
      </div>
    )
  }
  
  const { founder, owner, comments = [], tags = [], calendar_events = [], email_threads = [] } = company
  
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
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground smooth">
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
        <div className="mb-8 flex items-start justify-between">
          <div className="flex items-start gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-primary text-2xl font-semibold">
              {company.name.charAt(0)}
            </div>
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
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={company.stage} onValueChange={handleStageChange}>
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
        
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column - Founder & Comments */}
          <div className="lg:col-span-2 space-y-6">
            {/* Founder Card */}
            <Card className="elevated">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                  Founder
                </CardTitle>
              </CardHeader>
              <CardContent>
                {founder ? (
                  <div className="flex items-start gap-4">
                    <Avatar className="h-14 w-14 border">
                      <AvatarFallback className="bg-secondary text-foreground font-medium">
                        {founder.name.split(' ').map(n => n[0]).join('')}
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
                            href={`https://${founder.linkedin}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground smooth"
                          >
                            <LinkIcon className="h-4 w-4" />
                            LinkedIn Profile
                          </a>
                        )}
                        {founder.location && (
                          <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                            <MapPinIcon className="h-4 w-4" />
                            {founder.location}
                          </div>
                        )}
                        {company.website && (
                          <a 
                            href={company.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground smooth"
                          >
                            <GlobeIcon className="h-4 w-4" />
                            {company.website.replace('https://', '')}
                          </a>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <a href={`mailto:${founder.email}`}>
                          <MailIcon className="h-4 w-4 mr-1.5" />
                          Email
                        </a>
                      </Button>
                      <Button size="sm">
                        <CalendarIcon className="h-4 w-4 mr-1.5" />
                        Schedule
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No founder information</p>
                )}
              </CardContent>
            </Card>
            
            {/* Meetings Section */}
            <Card className="elevated">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                    Meetings
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{calendar_events.length}</span>
                    <button 
                      onClick={handleSync}
                      disabled={syncing}
                      className="p-1 rounded hover:bg-secondary smooth"
                      title="Sync calendar & emails"
                    >
                      <RefreshIcon className={`h-3.5 w-3.5 text-muted-foreground ${syncing ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {calendar_events.length > 0 ? (
                  <div className="divide-y max-h-64 overflow-y-auto">
                    {calendar_events.slice(0, 10).map((event: CalendarEvent) => (
                      <div key={event.id} className="px-6 py-3 hover:bg-secondary/30 smooth">
                        <div className="flex items-start gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 mt-0.5">
                            {event.meet_link ? (
                              <VideoIcon className="h-4 w-4 text-primary" />
                            ) : (
                              <CalendarIcon className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{event.title}</p>
                            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                              <ClockIcon className="h-3 w-3" />
                              {formatDate(event.start_time)}
                            </div>
                          </div>
                          {event.html_link && (
                            <a 
                              href={event.html_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline"
                            >
                              Open
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center px-6">
                    <CalendarIcon className="h-8 w-8 text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">No meetings found</p>
                    <p className="text-xs text-muted-foreground mt-1">Sync your calendar to see meetings</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Emails Section */}
            <Card className="elevated">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                    Emails
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{email_threads.length}</span>
                    <button 
                      onClick={handleSync}
                      disabled={emailSyncing}
                      className="p-1 rounded hover:bg-secondary smooth"
                      title="Sync emails"
                    >
                      <RefreshIcon className={`h-3.5 w-3.5 text-muted-foreground ${emailSyncing ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {email_threads.length > 0 ? (
                  <div className="divide-y max-h-80 overflow-y-auto">
                    {email_threads.slice(0, 15).map((email: EmailThread) => {
                      const isExpanded = expandedEmails.has(email.id)
                      return (
                        <div 
                          key={email.id} 
                          className="hover:bg-secondary/30 smooth cursor-pointer"
                          onClick={() => toggleEmailExpand(email.id)}
                        >
                          <div className="px-6 py-3">
                            <div className="flex items-start gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary mt-0.5">
                                <MailIcon className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="font-medium text-sm truncate flex-1">
                                    {email.subject || "(No subject)"}
                                  </p>
                                  <ChevronDownIcon className={`h-4 w-4 text-muted-foreground smooth ${isExpanded ? 'rotate-180' : ''}`} />
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                  <span>{email.from_name || email.from_email}</span>
                                  <span>·</span>
                                  <span>{email.email_date ? formatRelative(email.email_date) : ""}</span>
                                </div>
                                {!isExpanded && email.snippet && (
                                  <p className="text-xs text-muted-foreground truncate mt-1">
                                    {email.snippet}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="px-6 pb-4 pt-0">
                              <div className="ml-11 p-3 bg-secondary/50 rounded-lg">
                                <div className="text-xs text-muted-foreground mb-2">
                                  <span className="font-medium">From:</span> {email.from_email}
                                </div>
                                <div className="text-xs text-muted-foreground mb-2">
                                  <span className="font-medium">To:</span> {email.to_email}
                                </div>
                                <p className="text-sm text-foreground whitespace-pre-wrap">
                                  {email.snippet}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center px-6">
                    <InboxIcon className="h-8 w-8 text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">No emails found</p>
                    <p className="text-xs text-muted-foreground mt-1">Sync your inbox to see emails</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Comments Section */}
            <Card className="elevated">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                    Activity
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">{comments.length} comments</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add Comment */}
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8 border">
                    <AvatarFallback className="bg-secondary text-xs font-medium">
                      {session?.user?.name?.split(' ').map(n => n[0]).join('') || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 flex gap-2">
                    <Input
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="flex-1"
                    />
                    <Button 
                      size="sm" 
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                    >
                      <SendIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Comment Timeline */}
                <div className="space-y-4 pt-2">
                  {comments.map((comment, index) => {
                    const author = (comment as any).author
                    const isLast = index === comments.length - 1
                    
                    return (
                      <div key={comment.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <Avatar className="h-8 w-8 border">
                            <AvatarFallback className="bg-secondary text-xs font-medium">
                              {author?.initials || author?.name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                            </AvatarFallback>
                          </Avatar>
                          {!isLast && (
                            <div className="w-px flex-1 bg-border mt-2" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{author?.name || 'Unknown'}</span>
                            {comment.comment_type === 'stage_change' && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                <ArrowRightIcon className="h-2.5 w-2.5 mr-0.5" />
                                Stage
                              </Badge>
                            )}
                            {comment.comment_type === 'meeting' && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                <CalendarIcon className="h-2.5 w-2.5 mr-0.5" />
                                Meeting
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatRelative(comment.created_at)}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                  
                  {comments.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <MessageIcon className="h-8 w-8 text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">No activity yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Add a comment to get started</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Right Column - Activity */}
          <div className="space-y-6">
            {/* Calendar Sync Card */}
            <Card className="elevated">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                    Google Calendar
                  </CardTitle>
                  {session && (
                    <div className="flex items-center gap-2">
                      <div className="sync-indicator" />
                      <span className="text-xs text-muted-foreground">Connected</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {session ? (
                  <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <GoogleCalendarIcon className="h-5 w-5" />
                      <div>
                        <p className="text-sm font-medium">{session.user?.email}</p>
                        {lastSyncTime && (
                          <p className="text-xs text-muted-foreground">
                            Synced {formatRelative(lastSyncTime.toISOString())}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => syncCalendar()}
                      disabled={syncing}
                    >
                      <RefreshIcon className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" className="w-full" onClick={() => signIn("google")}>
                    <GoogleCalendarIcon className="h-4 w-4 mr-2" />
                    Connect Calendar
                  </Button>
                )}
              </CardContent>
            </Card>
            
            {/* Owner */}
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
                        {owner.initials || owner.name.split(' ').map(n => n[0]).join('')}
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
            
            {/* Timeline */}
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
          </div>
        </div>
      </main>
    </div>
  )
}
