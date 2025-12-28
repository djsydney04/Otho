"use client"

import { useState } from "react"
import { MailIcon, InboxIcon, ChevronDownIcon, RefreshIcon } from "@/components/icons"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatRelativeTime } from "@/lib/utils"
import type { EmailThread } from "@/lib/supabase/types"

interface EmailListProps {
  /** Email threads to display */
  emails: EmailThread[]
  /** Whether sync is in progress */
  syncing?: boolean
  /** Sync handler */
  onSync?: () => void
  /** Maximum emails to show */
  maxItems?: number
  /** Title for the section */
  title?: string
  /** Show as card wrapper */
  asCard?: boolean
  /** Enable expandable emails */
  expandable?: boolean
}

/**
 * Shared email list component for displaying email threads
 * Used in both company and founder detail pages.
 */
export function EmailList({
  emails,
  syncing = false,
  onSync,
  maxItems = 15,
  title = "Emails",
  asCard = true,
  expandable = true,
}: EmailListProps) {
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set())

  const toggleExpand = (emailId: string) => {
    if (!expandable) return
    setExpandedEmails((prev) => {
      const next = new Set(prev)
      if (next.has(emailId)) {
        next.delete(emailId)
      } else {
        next.add(emailId)
      }
      return next
    })
  }

  const displayedEmails = emails.slice(0, maxItems)

  const content = (
    <>
      {displayedEmails.length > 0 ? (
        <div className="divide-y max-h-80 overflow-y-auto">
          {displayedEmails.map((email) => {
            const isExpanded = expandedEmails.has(email.id)
            return (
              <div
                key={email.id}
                className={`hover:bg-secondary/30 smooth ${expandable ? "cursor-pointer" : ""}`}
                onClick={() => toggleExpand(email.id)}
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
                        {expandable && (
                          <ChevronDownIcon
                            className={`h-4 w-4 text-muted-foreground smooth ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{email.from_name || email.from_email}</span>
                        <span>·</span>
                        <span>
                          {email.email_date ? formatRelativeTime(email.email_date) : ""}
                        </span>
                      </div>
                      {!isExpanded && email.snippet && (
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {email.snippet}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                {isExpanded && expandable && (
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
          <p className="text-xs text-muted-foreground mt-1">
            Sync your inbox to see emails
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
            <span className="text-xs text-muted-foreground">{emails.length}</span>
            {onSync && (
              <button
                onClick={onSync}
                disabled={syncing}
                className="p-1 rounded hover:bg-secondary smooth"
                title="Sync emails"
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

