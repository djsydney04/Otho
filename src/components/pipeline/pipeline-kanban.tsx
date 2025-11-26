"use client"

import { useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { STAGES, STAGE_CLASSES, formatRelative, type Stage, type Tag } from "@/lib/store"
import { MaximizeIcon, MinimizeIcon } from "./icons"

interface CompanyDisplay {
  id: string
  name: string
  description?: string | null
  stage: Stage
}

interface FounderDisplay {
  name: string
  email?: string
}

interface OwnerDisplay {
  name: string
  initials: string
}

interface CompanyWithRelations {
  company: CompanyDisplay
  founder: FounderDisplay | undefined
  owner: OwnerDisplay | undefined
  tags: Tag[]
  lastContact: string | undefined
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
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary text-xs font-medium">
                        {company.name.charAt(0)}
                      </div>
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
