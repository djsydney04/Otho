"use client"

import { useState, useCallback } from "react"
import { useAuth } from "./use-auth"

/**
 * Types for Google Drive integration
 */
export interface DriveFile {
  id: string
  name: string
  mimeType: string
  iconLink?: string
  webViewLink?: string
  thumbnailLink?: string
  size?: string
  modifiedTime?: string
}

export interface DriveAttachment {
  id: string
  google_file_id: string
  name: string
  mime_type?: string
  icon_link?: string
  web_view_link?: string
  thumbnail_link?: string
}

interface UseDriveOptions {
  /** Company ID to attach files to */
  companyId?: string
  /** Founder ID to attach files to */
  founderId?: string
  /** Initial attachments */
  initialAttachments?: DriveAttachment[]
}

interface UseDriveReturn {
  /** List of attached files */
  attachments: DriveAttachment[]
  /** List of search results */
  files: DriveFile[]
  /** Loading state for Drive operations */
  loading: boolean
  /** Error message if any */
  error: string | null
  /** Whether Drive is connected */
  isConnected: boolean
  /** Search Drive files */
  searchFiles: (query?: string) => Promise<void>
  /** Attach a file */
  attachFile: (file: DriveFile) => Promise<void>
  /** Remove an attachment */
  removeAttachment: (attachmentId: string) => Promise<void>
  /** Set attachments directly */
  setAttachments: (attachments: DriveAttachment[]) => void
  /** Clear search results */
  clearFiles: () => void
}

/**
 * Hook for managing Google Drive file operations
 * 
 * @example
 * const { attachments, files, loading, searchFiles, attachFile, removeAttachment } = useDrive({
 *   companyId: company.id,
 *   initialAttachments: company.drive_documents
 * })
 */
export function useDrive(options: UseDriveOptions = {}): UseDriveReturn {
  const { companyId, founderId, initialAttachments = [] } = options
  const { user } = useAuth()
  
  const [attachments, setAttachments] = useState<DriveAttachment[]>(initialAttachments)
  const [files, setFiles] = useState<DriveFile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if Google Drive is connected (has access token)
  // For now, just check if user exists - we'll enhance this later
  const isConnected = !!user

  const searchFiles = useCallback(async (query?: string) => {
    if (!user) {
      setError("Please sign in to use Drive")
      return
    }
    
    if (!isConnected) {
      setError("Please connect your Google account in Settings")
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const url = query
        ? `/api/drive/files?query=${encodeURIComponent(query)}`
        : `/api/drive/files?type=recent`
      
      const res = await fetch(url)
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to search files")
      }
      
      setFiles(data.files || [])
    } catch (err) {
      console.error("Error searching Drive:", err)
      setError(err instanceof Error ? err.message : "Failed to search files")
      setFiles([])
    } finally {
      setLoading(false)
    }
  }, [user, isConnected])

  const attachFile = useCallback(async (file: DriveFile) => {
    if (!companyId && !founderId) {
      setError("No company or founder ID provided")
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const res = await fetch("/api/drive/attach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: file.id,
          companyId,
          founderId,
        }),
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to attach file")
      }
      
      const attachment = await res.json()
      setAttachments(prev => [...prev, attachment])
    } catch (err) {
      console.error("Error attaching Drive file:", err)
      setError(err instanceof Error ? err.message : "Failed to attach file")
    } finally {
      setLoading(false)
    }
  }, [companyId, founderId])

  const removeAttachment = useCallback(async (attachmentId: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const res = await fetch(`/api/drive/attach?id=${attachmentId}`, { 
        method: "DELETE" 
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to remove attachment")
      }
      
      setAttachments(prev => prev.filter(a => a.id !== attachmentId))
    } catch (err) {
      console.error("Error removing Drive attachment:", err)
      setError(err instanceof Error ? err.message : "Failed to remove attachment")
    } finally {
      setLoading(false)
    }
  }, [])

  const clearFiles = useCallback(() => {
    setFiles([])
    setError(null)
  }, [])

  return {
    attachments,
    files,
    loading,
    error,
    isConnected,
    searchFiles,
    attachFile,
    removeAttachment,
    setAttachments,
    clearFiles,
  }
}

