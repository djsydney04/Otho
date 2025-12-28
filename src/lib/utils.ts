/**
 * Main utilities file
 * 
 * Re-exports all utilities from the utils folder for backwards compatibility.
 * Import from '@/lib/utils' for all utility functions.
 */

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Re-export date utilities
export {
  formatDate,
  formatRelativeTime,
  formatArticleTime,
  formatDateTime,
  isToday,
  isPast,
  startOfToday,
} from "./utils/date"

// Re-export URL utilities
export {
  getDomain,
  cleanUrl,
  ensureProtocol,
  getFaviconUrl,
  getLinkedInUrl,
  getTwitterUrl,
  getTwitterHandle,
  isValidUrl,
} from "./utils/url"

// Re-export general utilities
export {
  truncate,
  getInitials,
  sleep,
  safeJsonParse,
  debounce,
  throttle,
  groupBy,
  uniqueBy,
} from "./utils/index"
