"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  PlusIcon,
  SearchIcon,
  FileIcon,
  ExternalLinkIcon,
  TrashIcon,
} from "@/components/icons"
import { useDrive, type DriveFile, type DriveAttachment } from "@/lib/hooks"
import { formatRelativeTime } from "@/lib/utils"

interface DrivePickerProps {
  /** Company ID to attach files to */
  companyId?: string
  /** Founder ID to attach files to */
  founderId?: string
  /** Initial attachments */
  initialAttachments?: DriveAttachment[]
  /** Title for the section */
  title?: string
  /** Show as card */
  asCard?: boolean
  /** Callback when attachments change */
  onAttachmentsChange?: (attachments: DriveAttachment[]) => void
}

/**
 * Shared Google Drive file picker component
 * Allows browsing, searching, attaching, and removing Drive files.
 */
export function DrivePicker({
  companyId,
  founderId,
  initialAttachments = [],
  title = "Google Drive",
  asCard = true,
  onAttachmentsChange,
}: DrivePickerProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const {
    attachments,
    files,
    loading,
    isConnected,
    searchFiles,
    attachFile,
    removeAttachment,
    setAttachments,
  } = useDrive({
    companyId,
    founderId,
    initialAttachments,
  })

  // Update initial attachments when they change
  useEffect(() => {
    setAttachments(initialAttachments)
  }, [initialAttachments, setAttachments])

  // Notify parent of attachment changes
  useEffect(() => {
    onAttachmentsChange?.(attachments)
  }, [attachments, onAttachmentsChange])

  // Load recent files when dialog opens
  useEffect(() => {
    if (dialogOpen && isConnected) {
      searchFiles()
    }
  }, [dialogOpen, isConnected, searchFiles])

  const handleSearch = () => {
    searchFiles(searchQuery || undefined)
  }

  const handleAttach = async (file: DriveFile) => {
    await attachFile(file)
    setDialogOpen(false)
  }

  const content = (
    <>
      {attachments.length > 0 ? (
        <div className="space-y-2">
          {attachments.map((attachment) => (
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
                  onClick={() => removeAttachment(attachment.id)}
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
    </>
  )

  const picker = (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <button
          className="p-1 rounded hover:bg-secondary smooth"
          title="Attach file"
          disabled={!isConnected}
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={loading}>
              <SearchIcon className="h-4 w-4" />
            </Button>
          </div>
          <div className="max-h-72 overflow-y-auto divide-y">
            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Loading...
              </p>
            ) : files.length > 0 ? (
              files.map((file) => (
                <button
                  key={file.id}
                  onClick={() => handleAttach(file)}
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
                        Modified {formatRelativeTime(file.modifiedTime)}
                      </p>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {isConnected ? "No files found" : "Connect Google to see files"}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )

  if (!asCard) {
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">{title}</span>
          {picker}
        </div>
        {content}
      </div>
    )
  }

  return (
    <Card className="elevated">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </CardTitle>
          {picker}
        </div>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  )
}

