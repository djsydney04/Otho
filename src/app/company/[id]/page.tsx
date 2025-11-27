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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import { useAppStore, syncCalendar, syncEmails, fetchCompanyWithRelations, STAGES, STAGE_CLASSES, formatRelative, type Stage, type CompanyWithRelations } from "@/lib/store"
import type { CalendarEvent, EmailThread } from "@/lib/supabase/types"

// Types for Drive
interface DriveFile {
  id: string
  name: string
  mimeType: string
  iconLink?: string
  webViewLink?: string
  thumbnailLink?: string
  size?: string
  modifiedTime?: string
}

interface DriveAttachment {
  id: string
  google_file_id: string
  name: string
  mime_type?: string
  icon_link?: string
  web_view_link?: string
  thumbnail_link?: string
}

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

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  )
}

function SearchCheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
      <path d="M8 11l2 2 4-4" />
    </svg>
  )
}

function StarIcon({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
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
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
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

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
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
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  
  // Drive state
  const [driveAttachments, setDriveAttachments] = useState<DriveAttachment[]>([])
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([])
  const [driveSearchQuery, setDriveSearchQuery] = useState("")
  const [loadingDrive, setLoadingDrive] = useState(false)
  const [driveDialogOpen, setDriveDialogOpen] = useState(false)
  
  // Fetch logo from website
  useEffect(() => {
    if (company?.website) {
      fetch(`/api/logo?url=${encodeURIComponent(company.website)}`)
        .then(res => res.json())
        .then(data => {
          if (data.logoUrl) setLogoUrl(data.logoUrl)
        })
        .catch(() => {})
    }
  }, [company?.website])
  
  // Fetch Drive attachments
  useEffect(() => {
    if (!companyId) return
    
    fetch(`/api/companies/${companyId}`)
      .then(res => res.json())
      .then(data => {
        if (data.drive_documents) setDriveAttachments(data.drive_documents)
      })
      .catch(() => {})
  }, [companyId])
  
  // Search Drive files
  const searchDriveFiles = async (query?: string) => {
    if (!session?.accessToken) return
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
        body: JSON.stringify({ fileId: file.id, companyId }),
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
    if (driveDialogOpen && session?.accessToken) {
      searchDriveFiles()
    }
  }, [driveDialogOpen, session?.accessToken])
  
  const toggleFlag = async (flag: 'needs_followup' | 'needs_diligence' | 'is_priority') => {
    if (!company) return
    const newValue = !(company as any)[flag]
    
    await fetch(`/api/companies/${companyId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [flag]: newValue }),
    })
    
    const data = await fetchCompanyWithRelations(companyId)
    setCompany(data)
  }
  
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
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Action Buttons with descriptive tooltips */}
            <button
              onClick={() => toggleFlag('is_priority')}
              className={`group relative flex h-9 w-9 items-center justify-center rounded-lg border smooth ${
                (company as any).is_priority 
                  ? 'bg-amber-50 border-amber-200 text-amber-600' 
                  : 'hover:bg-secondary text-muted-foreground'
              }`}
              title={(company as any).is_priority 
                ? "Priority: This company is marked as high priority. Click to remove." 
                : "Priority: Mark this company as high priority for quick access and focus."}
            >
              <StarIcon className="h-4 w-4" filled={(company as any).is_priority} />
            </button>
            <button
              onClick={() => toggleFlag('needs_followup')}
              className={`group relative flex h-9 w-9 items-center justify-center rounded-lg border smooth ${
                (company as any).needs_followup 
                  ? 'bg-blue-50 border-blue-200 text-blue-600' 
                  : 'hover:bg-secondary text-muted-foreground'
              }`}
              title={(company as any).needs_followup 
                ? "Follow-up: You need to follow up with this company. Click to clear reminder." 
                : "Follow-up: Set a reminder to follow up with this company later."}
            >
              <BellIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => toggleFlag('needs_diligence')}
              className={`group relative flex h-9 w-9 items-center justify-center rounded-lg border smooth ${
                (company as any).needs_diligence 
                  ? 'bg-purple-50 border-purple-200 text-purple-600' 
                  : 'hover:bg-secondary text-muted-foreground'
              }`}
              title={(company as any).needs_diligence 
                ? "Diligence: This company needs more research/diligence. Click to mark complete." 
                : "Diligence: Mark this company as needing more research and due diligence."}
            >
              <SearchCheckIcon className="h-4 w-4" />
            </button>
            
            <div className="h-6 w-px bg-border mx-1" />
            
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
                            href={founder.linkedin.startsWith('http') ? founder.linkedin : `https://${founder.linkedin}`}
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
                            href={founder.twitter.startsWith('http') ? founder.twitter : `https://x.com/${founder.twitter.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground smooth"
                          >
                            <TwitterIcon className="h-4 w-4" />
                            @{founder.twitter.replace('@', '').replace('https://x.com/', '').replace('https://twitter.com/', '')}
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
                            {company.website.replace('https://', '').replace('http://', '')}
                          </a>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
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
                      {founder.linkedin && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={founder.linkedin.startsWith('http') ? founder.linkedin : `https://${founder.linkedin}`} target="_blank" rel="noopener noreferrer">
                            <LinkedInIcon className="h-4 w-4 mr-1.5 text-[#0A66C2]" />
                            LinkedIn
                          </a>
                        </Button>
                      )}
                      {founder.twitter && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={founder.twitter.startsWith('http') ? founder.twitter : `https://x.com/${founder.twitter.replace('@', '')}`} target="_blank" rel="noopener noreferrer">
                            <TwitterIcon className="h-4 w-4 mr-1.5" />
                            X Profile
                          </a>
                        </Button>
                      )}
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
            
            {/* Google Drive Card */}
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
                        disabled={!session}
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
                              {session ? "No files found" : "Connect Google to see files"}
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
