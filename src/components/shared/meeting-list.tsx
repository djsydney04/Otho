"use client"

import { CalendarIcon, VideoIcon, ClockIcon, RefreshIcon } from "@/components/icons"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate } from "@/lib/utils"
import type { CalendarEvent } from "@/lib/supabase/types"

interface MeetingListProps {
  /** Calendar events to display */
  events: CalendarEvent[]
  /** Whether sync is in progress */
  syncing?: boolean
  /** Sync handler */
  onSync?: () => void
  /** Maximum events to show */
  maxItems?: number
  /** Title for the section */
  title?: string
  /** Show as card wrapper */
  asCard?: boolean
}

/**
 * Shared meeting list component for displaying calendar events
 * Used in both company and founder detail pages.
 */
export function MeetingList({
  events,
  syncing = false,
  onSync,
  maxItems = 10,
  title = "Meetings",
  asCard = true,
}: MeetingListProps) {
  const displayedEvents = events.slice(0, maxItems)

  const content = (
    <>
      {displayedEvents.length > 0 ? (
        <div className="divide-y max-h-64 overflow-y-auto">
          {displayedEvents.map((event) => (
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
          <p className="text-xs text-muted-foreground mt-1">
            Sync your calendar to see meetings
          </p>
        </div>
      )}
    </>
  )

  if (!asCard) {
    return content
  }

  return (
    <Card className="elevated">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{events.length}</span>
            {onSync && (
              <button
                onClick={onSync}
                disabled={syncing}
                className="p-1 rounded hover:bg-secondary smooth"
                title="Sync calendar"
              >
                <RefreshIcon
                  className={`h-3.5 w-3.5 text-muted-foreground ${syncing ? "animate-spin" : ""}`}
                />
              </button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">{content}</CardContent>
    </Card>
  )
}

