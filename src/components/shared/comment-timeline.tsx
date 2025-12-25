"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { MessageIcon, SendIcon, ArrowRightIcon, CalendarIcon } from "@/components/icons"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatRelativeTime, getInitials } from "@/lib/utils"

interface Comment {
  id: string
  content: string
  comment_type?: "note" | "stage_change" | "meeting" | "call"
  created_at: string
  author?: {
    id?: string
    name?: string
    email?: string
    initials?: string
  }
}

interface CommentTimelineProps {
  /** Comments to display */
  comments: Comment[]
  /** Handler for adding new comments */
  onAddComment?: (content: string) => Promise<void>
  /** Title for the section */
  title?: string
  /** Placeholder text for input */
  placeholder?: string
  /** Whether to show as a card */
  asCard?: boolean
  /** Entity name for empty state */
  entityName?: string
}

/**
 * Shared comment/activity timeline component
 * Used in both company and founder detail pages.
 */
export function CommentTimeline({
  comments,
  onAddComment,
  title = "Activity",
  placeholder = "Add a comment...",
  asCard = true,
  entityName = "item",
}: CommentTimelineProps) {
  const { data: session } = useSession()
  const [newComment, setNewComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!newComment.trim() || !onAddComment) return

    setIsSubmitting(true)
    try {
      await onAddComment(newComment.trim())
      setNewComment("")
    } catch (error) {
      console.error("Error adding comment:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const getCommentIcon = (type?: string) => {
    switch (type) {
      case "stage_change":
        return (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            <ArrowRightIcon className="h-2.5 w-2.5 mr-0.5" />
            Stage
          </Badge>
        )
      case "meeting":
        return (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            <CalendarIcon className="h-2.5 w-2.5 mr-0.5" />
            Meeting
          </Badge>
        )
      default:
        return null
    }
  }

  const content = (
    <div className="space-y-4">
      {/* Add Comment Input */}
      {onAddComment && (
        <div className="flex gap-3">
          <Avatar className="h-8 w-8 border">
            <AvatarFallback className="bg-secondary text-xs font-medium">
              {session?.user?.name ? getInitials(session.user.name) : "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 flex gap-2">
            <Input
              placeholder={placeholder}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
              disabled={isSubmitting}
            />
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!newComment.trim() || isSubmitting}
            >
              <SendIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Comment Timeline */}
      <div className="space-y-4 pt-2">
        {comments.map((comment, index) => {
          const author = comment.author
          const isLast = index === comments.length - 1

          return (
            <div key={comment.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <Avatar className="h-8 w-8 border">
                  <AvatarFallback className="bg-secondary text-xs font-medium">
                    {author?.initials ||
                      (author?.name ? getInitials(author.name) : "?")}
                  </AvatarFallback>
                </Avatar>
                {!isLast && <div className="w-px flex-1 bg-border mt-2" />}
              </div>
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {author?.name || "Unknown"}
                  </span>
                  {getCommentIcon(comment.comment_type)}
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(comment.created_at)}
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
            <p className="text-xs text-muted-foreground mt-1">
              Add a comment to get started
            </p>
          </div>
        )}
      </div>
    </div>
  )

  if (!asCard) {
    return content
  }

  return (
    <Card className="elevated">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {comments.length} comments
          </span>
        </div>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  )
}

