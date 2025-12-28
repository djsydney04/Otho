"use client"

/**
 * Pipeline Kanban View Component
 * 
 * Displays companies in a kanban board organized by pipeline stage.
 * 
 * Features:
 * - Drag and drop to move companies between stages (TODO: implement)
 * - Company cards with logo, founder, tags, and last contact
 * - Collapsible columns to focus on specific stages
 * - Click to navigate to company detail page
 * 
 * Stages:
 * - Inbound: Initial contact/application
 * - Qualified: Passed initial screening  
 * - Diligence: Deep dive analysis
 * - Committed: Deal closed
 * - Passed: Decided not to invest
 * 
 * Props:
 * - companies: Array of companies with relations (founder, tags, etc.)
 * - onStageChange: Callback when company stage is changed
 */

import { useState, useEffect } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { STAGES, STAGE_CLASSES, formatRelative, type Stage, type Tag } from "@/lib/store"
import { MaximizeIcon, MinimizeIcon } from "./icons"

/**
 * Company data for display in kanban card
 */
interface CompanyDisplay {
  id: string
  name: string
  description?: string | null
  website?: string | null
  stage: Stage
}

/**
 * Founder data for display in kanban card
 */
interface FounderDisplay {
  name: string
  email?: string
}

/**
 * Owner (user) data for display in kanban card
 */
interface OwnerDisplay {
  name: string
  initials: string
}

/**
 * Complete company data with all relations
 */
interface CompanyWithRelations {
  company: CompanyDisplay
  founder: FounderDisplay | undefined
  owner: OwnerDisplay | undefined
  tags: Tag[]
  lastContact: string | undefined
}

/**
 * Company Logo Component
 * 
 * Fetches company logo from Clearbit Logo API using website domain.
 * Falls back to first letter of company name if logo unavailable.
 * 
 * @param company - Company data with website URL
 * @param size - Logo size ('sm' or 'md')
 */
function CompanyLogo({ company, size = 'sm' }: { company: CompanyDisplay; size?: 'sm' | 'md' }) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [hasError, setHasError] = useState(false)
  
  useEffect(() => {
    if (!company.website) return
    try {
      const domain = new URL(company.website.startsWith('http') ? company.website : `https://${company.website}`).hostname
      setLogoUrl(`https://logo.clearbit.com/${domain}`)
    } catch {
      setLogoUrl(null)
    }
  }, [company.website])
  
  const sizeClass = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9'
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'
  
  if (logoUrl && !hasError) {
    return (
      <img 
        src={logoUrl}
        alt={company.name}
        className={`${sizeClass} rounded-md object-contain bg-white border`}
        onError={() => setHasError(true)}
      />
    )
  }
  
  return (
    <div className={`flex ${sizeClass} items-center justify-center rounded-md bg-primary/10 text-primary ${textSize} font-medium`}>
      {company.name.charAt(0)}
    </div>
  )
}

interface PipelineKanbanProps {
  companies: CompanyWithRelations[]
}

export function PipelineKanban({ companies }: PipelineKanbanProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  const getItemsForStage = (stage: Stage) => 
    companies.filter(({ company }) => company.stage === stage)

  const kanbanContent = (
    <div className={`flex gap-4 overflow-x-auto ${isFullscreen ? 'h-[calc(100vh-80px)]' : 'h-[calc(100vh-280px)]'}`}>
      {STAGES.map((stage) => {
        const items = getItemsForStage(stage)

        return (
          <div
            key={stage}
            className="flex w-72 flex-shrink-0 flex-col rounded-xl border bg-card/50"
          >
            <div className="flex items-center justify-between border-b px-4 py-3 flex-shrink-0">
              <Badge variant="outline" className={`${STAGE_CLASSES[stage]} border`}>
                {stage}
              </Badge>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-xs text-muted-foreground">
                {items.length}
              </span>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {items.map(({ company, founder, owner, lastContact }) => (
                <Link
                  key={company.id}
                  href={`/company/${company.id}`}
                  className="block space-y-2.5 rounded-lg border bg-background p-3.5 smooth hover:border-primary/30 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CompanyLogo company={company} size="sm" />
                      <span className="font-medium text-sm">
                        {company.name}
                      </span>
                    </div>
                    {owner && (
                      <Avatar className="h-5 w-5 border">
                        <AvatarFallback className="text-[9px] bg-secondary">
                          {owner.initials}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                  
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {company.description}
                  </p>
                  
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{founder?.name || "—"}</span>
                      {lastContact && (
                        <div className="flex items-center gap-1.5">
                          <div className="sync-indicator" />
                          <span>{formatRelative(lastContact)}</span>
                        </div>
                      )}
                    </div>
                    {founder?.email && (
                      <div className="text-xs text-muted-foreground/70 truncate">
                        {founder.email}
                      </div>
                    )}
                  </div>
                </Link>
              ))}

              {items.length === 0 && (
                <div className="flex h-24 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
                  No companies
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="font-display text-lg font-semibold">Pipeline Board</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen(false)}
          >
            <MinimizeIcon className="h-4 w-4 mr-1.5" />
            Exit Fullscreen
          </Button>
        </div>
        <div className="p-6">
          {kanbanContent}
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="absolute right-0 -top-12">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsFullscreen(true)}
          className="text-muted-foreground"
        >
          <MaximizeIcon className="h-4 w-4 mr-1.5" />
          Fullscreen
        </Button>
      </div>
      {kanbanContent}
    </div>
  )
}
