"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { formatRelative, syncCalendar, syncEmails, useAppStore } from "@/lib/store"
import type { FounderWithRelations, Company, FounderComment, CalendarEvent, EmailThread } from "@/lib/supabase/types"

// Types for Drive
interface DriveFile {
  id: string
  name: string
  mimeType: string
  iconLink?: string
  webViewLink?: string
  thumbnailLink?: string
  modifiedTime?: string
}

interface DriveAttachment {
  id: string
  google_file_id: string
  name: string
  mime_type?: string
  icon_link?: string
  web_view_link?: string
}

// Icons
function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 12H5M12 19l-7-7 7-7" />
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

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01" />
    </svg>
  )
}

function GraduationCapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
    </svg>
  )
}

function BriefcaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
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

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  )
}

function UserCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
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

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
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

function GoogleDriveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 87.3 78" fill="none">
      <path d="M6.6 66.85L3.3 61.35l26.4-45.6h26.4l-26.4 45.6H6.6z" fill="#0066DA"/>
      <path d="M29.7 61.35l26.4-45.6h26.4L56.1 61.35H29.7z" fill="#00AC47"/>
      <path d="L56.1 61.35l13.2 22.95H-3l13.2-22.95H56.1z" fill="#EA4335"/>
      <path d="M87.3 61.35L74.1 78H43.65l13.2-22.95L69.9 78l17.4-16.65z" fill="#00832D"/>
      <path d="M29.7 61.35L43.65 78H12.9L-0.3 61.35H29.7z" fill="#2684FC"/>
      <path d="M56.1 15.75l-26.4 45.6L16.5 78H43.65l26.25-45.6L56.1 15.75z" fill="#FFBA00"/>
    </svg>
  )
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  )
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
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

async function fetchFounder(id: string): Promise<FounderWithRelations | null> {
  try {
    const response = await fetch(`/api/founders/${id}`)
    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error('Failed to fetch founder')
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching founder:', error)
    return null
  }
}

export default function FounderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const founderId = params.id as string
  const { user } = useUser()
  const { syncing, emailSyncing } = useAppStore()
  
  const [founder, setFounder] = useState<FounderWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState("")
  const [addingComment, setAddingComment] = useState(false)
  
  // Drive state
  const [driveAttachments, setDriveAttachments] = useState<DriveAttachment[]>([])
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([])
  const [driveSearchQuery, setDriveSearchQuery] = useState("")
  const [loadingDrive, setLoadingDrive] = useState(false)
  const [driveDialogOpen, setDriveDialogOpen] = useState(false)
  
  useEffect(() => {
    async function loadFounder() {
      setLoading(true)
      const data = await fetchFounder(founderId)
      setFounder(data)
      setLoading(false)
    }
    loadFounder()
  }, [founderId])
  
  // Fetch Drive attachments for founder
  useEffect(() => {
    if (!founderId) return
    
    fetch(`/api/founders/${founderId}`)
      .then(res => res.json())
      .then(data => {
        if (data.drive_documents) setDriveAttachments(data.drive_documents)
      })
      .catch(() => {})
  }, [founderId])
  
  // Search Drive files
  const searchDriveFiles = async (query?: string) => {
    if (!user) return
    setLoadingDrive(true)
    try {
      const url = query 
        ? `/api/drive/files?query=${encodeURIComponent(query)}`
        : `/api/drive/files?type=recent`
      const res = await fetch(url)
      const data = await res.json()
      setDriveFiles(data.files || [])
    } catch (error) {
      console.error("Error searching Drive:", error)
    } finally {
      setLoadingDrive(false)
    }
  }
  
  // Attach Drive file
  const attachDriveFile = async (file: DriveFile) => {
    try {
      const res = await fetch("/api/drive/attach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: file.id, founderId }),
      })
      if (res.ok) {
        const attachment = await res.json()
        setDriveAttachments(prev => [...prev, attachment])
        setDriveDialogOpen(false)
      }
    } catch (error) {
      console.error("Error attaching Drive file:", error)
    }
  }
  
  // Remove Drive attachment
  const removeDriveAttachment = async (attachmentId: string) => {
    try {
      await fetch(`/api/drive/attach?id=${attachmentId}`, { method: "DELETE" })
      setDriveAttachments(prev => prev.filter(a => a.id !== attachmentId))
    } catch (error) {
      console.error("Error removing Drive attachment:", error)
    }
  }
  
  // Load Drive files when dialog opens
  useEffect(() => {
    if (driveDialogOpen && user) {
      searchDriveFiles()
    }
  }, [driveDialogOpen, user])
  
  const handleAddComment = async () => {
    if (!newComment.trim()) return
    setAddingComment(true)
    
    try {
      const response = await fetch(`/api/founders/${founderId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim() }),
      })
      
      if (response.ok) {
        setNewComment("")
        // Refresh founder data
        const data = await fetchFounder(founderId)
        setFounder(data)
      }
    } catch (error) {
      console.error('Error adding comment:', error)
    }
    
    setAddingComment(false)
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
  
  const handleSync = async () => {
    await Promise.all([syncCalendar(), syncEmails()])
    // Refresh founder data
    const data = await fetchFounder(founderId)
    setFounder(data)
  }
  
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
            <Link href="/founders" className="text-sm text-muted-foreground hover:text-foreground smooth">
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
        <div className="mb-8 flex items-start gap-6">
          <Avatar className="h-20 w-20 border-2">
            <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
              {founder.name.split(' ').map(n => n[0]).join('')}
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
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <a 
                href={`mailto:${founder.email}`}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground smooth"
              >
                <MailIcon className="h-4 w-4" />
                {founder.email}
              </a>
              {founder.linkedin && (
                <a 
                  href={founder.linkedin.startsWith('http') ? founder.linkedin : `https://${founder.linkedin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground smooth"
                >
                  <LinkedInIcon className="h-4 w-4" />
                  LinkedIn
                </a>
              )}
              {founder.twitter && (
                <a 
                  href={founder.twitter.startsWith('@') ? `https://twitter.com/${founder.twitter.slice(1)}` : `https://twitter.com/${founder.twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground smooth"
                >
                  <TwitterIcon className="h-4 w-4" />
                  {founder.twitter}
                </a>
              )}
              {founder.location && (
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPinIcon className="h-4 w-4" />
                  {founder.location}
                </span>
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
            {companies.length === 0 && (
              <Button size="sm" asChild>
                <Link href={`/add-company?founder_id=${founder.id}&founder_name=${encodeURIComponent(founder.name)}&founder_email=${encodeURIComponent(founder.email)}`}>
                  <BuildingIcon className="h-4 w-4 mr-1.5" />
                  Add Company
                </Link>
              </Button>
            )}
          </div>
        </div>
        
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column - Details & Activity */}
          <div className="lg:col-span-2 space-y-8">
            {/* Background Info */}
            {(founder.previous_companies || founder.education || founder.domain_expertise?.length) && (
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
                        <p className="text-sm text-muted-foreground">{founder.previous_companies}</p>
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
            )}
            
          

              {/* Meetings */}
              <Card className="elevated">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                      Meetings
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{calendarEvents.length}</span>
                      <button 
                        onClick={handleSync}
                        className="p-1 rounded hover:bg-secondary smooth"
                        title="Sync calendar"
                      >
                        <RefreshIcon className={`h-3.5 w-3.5 text-muted-foreground ${syncing ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {calendarEvents.length > 0 ? (
                    <div className="divide-y max-h-64 overflow-y-auto">
                      {calendarEvents.slice(0, 10).map((event: CalendarEvent) => (
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

              {/* Emails */}
              <Card className="elevated">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                      Emails
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{emailThreads.length}</span>
                      <button 
                        onClick={handleSync}
                        className="p-1 rounded hover:bg-secondary smooth"
                        title="Sync inbox"
                      >
                        <RefreshIcon className={`h-3.5 w-3.5 text-muted-foreground ${emailSyncing ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {emailThreads.length > 0 ? (
                    <div className="divide-y max-h-80 overflow-y-auto">
                      {emailThreads.slice(0, 10).map((email: EmailThread) => (
                        <div 
                          key={email.id} 
                          className="px-6 py-3 hover:bg-secondary/30 smooth"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary mt-0.5">
                              <MailIcon className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-medium text-sm truncate">
                                  {email.subject || "(No subject)"}
                                </p>
                                <ChevronDownIcon className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 smooth" />
                              </div>
                              <p className="text-xs text-muted-foreground truncate mt-1">
                                {email.snippet}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {email.email_date ? formatRelative(email.email_date) : ""}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
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

              
              {/* Activity / Comments */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                  Activity
                </h2>
                <span className="text-xs text-muted-foreground">{comments.length} notes</span>
              </div>
              
              {/* Add Comment */}
              <div className="flex gap-3">
                <Avatar className="h-8 w-8 border">
                  <AvatarFallback className="bg-secondary text-xs font-medium">
                    {user?.fullName?.split(" ").map(n => n[0]).join("") || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 flex gap-2">
                  <Input
                    placeholder="Add a note..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1"
                    disabled={addingComment}
                  />
                  <Button 
                    size="sm" 
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || addingComment}
                  >
                    <SendIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {/* Comments Timeline */}
              <div className="space-y-4 pt-2">
                {comments.map((comment: any, index: number) => {
                  const author = comment.author
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
                    <p className="text-sm text-muted-foreground">No notes yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Add a note to track your interactions</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Right Column - Companies & Meta */}
          <div className="space-y-6">
            {/* Companies */}
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
                    {companies.map((company: Company) => (
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
                      <Link href={`/add-company?founder_id=${founder.id}&founder_name=${encodeURIComponent(founder.name)}&founder_email=${encodeURIComponent(founder.email)}`}>
                        Add a company
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Source & Intro Path */}
            {(founder.source || founder.warm_intro_path) && (
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
            )}
            
            {/* Notes */}
            {founder.notes && (
              <Card className="elevated">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                    Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {founder.notes}
                  </p>
                </CardContent>
              </Card>
            )}
            
            {/* Google Drive */}
            <Card className="elevated">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                    Google Drive
                  </CardTitle>
                  <Dialog open={driveDialogOpen} onOpenChange={setDriveDialogOpen}>
                    <DialogTrigger asChild>
                      <button 
                        className="p-1 rounded hover:bg-secondary smooth"
                        title="Attach file"
                        disabled={!user}
                      >
                        <PlusIcon className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Attach Google Drive File</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Search files..."
                            value={driveSearchQuery}
                            onChange={(e) => setDriveSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && searchDriveFiles(driveSearchQuery)}
                          />
                          <Button onClick={() => searchDriveFiles(driveSearchQuery)} disabled={loadingDrive}>
                            <SearchIcon className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="max-h-72 overflow-y-auto divide-y">
                          {loadingDrive ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
                          ) : driveFiles.length > 0 ? (
                            driveFiles.map((file) => (
                              <button
                                key={file.id}
                                onClick={() => attachDriveFile(file)}
                                className="w-full flex items-center gap-3 p-3 hover:bg-secondary/50 smooth text-left"
                              >
                                {file.iconLink ? (
                                  <img src={file.iconLink} alt="" className="h-5 w-5" />
                                ) : (
                                  <FileIcon className="h-5 w-5 text-muted-foreground" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{file.name}</p>
                                  {file.modifiedTime && (
                                    <p className="text-xs text-muted-foreground">
                                      Modified {formatRelative(file.modifiedTime)}
                                    </p>
                                  )}
                                </div>
                              </button>
                            ))
                          ) : (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                              {user ? "No files found" : "Connect Google to see files"}
                            </p>
                          )}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {driveAttachments.length > 0 ? (
                  <div className="space-y-2">
                    {driveAttachments.map((attachment) => (
                      <div 
                        key={attachment.id}
                        className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50 group"
                      >
                        {attachment.icon_link ? (
                          <img src={attachment.icon_link} alt="" className="h-4 w-4" />
                        ) : (
                          <FileIcon className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="flex-1 text-sm truncate">{attachment.name}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 smooth">
                          {attachment.web_view_link && (
                            <a 
                              href={attachment.web_view_link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-1 rounded hover:bg-secondary"
                            >
                              <ExternalLinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            </a>
                          )}
                          <button 
                            onClick={() => removeDriveAttachment(attachment.id)}
                            className="p-1 rounded hover:bg-destructive/10"
                          >
                            <TrashIcon className="h-3.5 w-3.5 text-destructive" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    No files attached
                  </p>
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
          </div>
        </div>
      </main>
    </div>
  )
}
