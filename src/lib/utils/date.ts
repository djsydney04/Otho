/**
 * Date formatting utilities
 * 
 * Consistent date/time formatting across the application.
 */

/**
 * Format a date string to a readable format
 * @example formatDate("2024-01-15") => "Jan 15, 2024"
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

/**
 * Format a date to show relative time (e.g., "2h ago", "Yesterday")
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (minutes < 1) return "Just now"
  if (minutes === 1) return "1 min ago"
  if (minutes < 60) return `${minutes} mins ago`
  if (hours === 1) return "1h ago"
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

/**
 * Format a date for article/news cards
 */
export function formatArticleTime(dateString?: string): string {
  if (!dateString) return ""
  
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  
  if (hours < 1) return "Just now"
  if (hours === 1) return "1h ago"
  if (hours < 24) return `${hours}h ago`
  
  const days = Math.floor(hours / 24)
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days}d ago`
  
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

/**
 * Format date and time together
 * @example formatDateTime("2024-01-15T14:30:00") => "Jan 15, 2024 at 2:30 PM"
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }) + " at " + date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })
}

/**
 * Check if a date is today
 */
export function isToday(dateString: string): boolean {
  const date = new Date(dateString)
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

/**
 * Check if a date is in the past
 */
export function isPast(dateString: string): boolean {
  return new Date(dateString) < new Date()
}

/**
 * Get the start of today
 */
export function startOfToday(): Date {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

