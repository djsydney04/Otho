// Application constants

import type { Stage } from './supabase/types'

export const STAGES: Stage[] = ["Inbound", "Qualified", "Diligence", "Committed", "Passed"]

export const STAGE_CLASSES: Record<Stage, string> = {
  Inbound: "stage-inbound",
  Qualified: "stage-qualified",
  Diligence: "stage-diligence",
  Committed: "stage-committed",
  Passed: "stage-passed",
}

export function formatRelative(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    if (diffHours === 0) {
      const diffMins = Math.floor(diffMs / (1000 * 60))
      return diffMins <= 1 ? 'just now' : `${diffMins}m ago`
    }
    return `${diffHours}h ago`
  }
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
  return `${Math.floor(diffDays / 365)}y ago`
}

