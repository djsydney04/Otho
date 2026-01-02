/**
 * Pipeline Constants
 * 
 * Stage definitions and utilities for the deal pipeline.
 * Used across the application for consistent stage handling.
 */

import type { Stage } from "@/lib/types"

// Pipeline stages in order
export const STAGES: Stage[] = [
  "Inbound",
  "Qualified",
  "Diligence",
  "Committed",
  "Passed",
]

// CSS class names for stage styling
export const STAGE_CLASSES: Record<Stage, string> = {
  Inbound: "stage-inbound",
  Qualified: "stage-qualified",
  Diligence: "stage-diligence",
  Committed: "stage-committed",
  Passed: "stage-passed",
}

/**
 * Format a date as relative time (e.g., "2 days ago")
 */
export function formatRelative(dateIso: string): string {
  const then = new Date(dateIso).getTime()
  const now = Date.now()
  const diffMs = now - then
  const dayMs = 24 * 60 * 60 * 1000

  const days = Math.round(diffMs / dayMs)
  if (days <= 0) return "Today"
  if (days === 1) return "1 day ago"
  if (days < 7) return `${days} days ago`
  const weeks = Math.round(days / 7)
  if (weeks < 4) return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`
  const months = Math.round(days / 30)
  return months === 1 ? "1 month ago" : `${months} months ago`
}

