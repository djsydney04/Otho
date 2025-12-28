/**
 * URL utilities
 * 
 * Functions for working with URLs and domains.
 */

/**
 * Extract domain from a URL
 * @example getDomain("https://www.techcrunch.com/article") => "techcrunch.com"
 */
export function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "")
  } catch {
    return url
  }
}

/**
 * Clean a URL by removing protocol for display
 * @example cleanUrl("https://www.example.com/page") => "example.com/page"
 */
export function cleanUrl(url: string): string {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
}

/**
 * Ensure a URL has a protocol
 * @example ensureProtocol("example.com") => "https://example.com"
 */
export function ensureProtocol(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url
  }
  return `https://${url}`
}

/**
 * Get favicon URL for a domain
 */
export function getFaviconUrl(url: string, size: number = 32): string {
  const domain = getDomain(url)
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`
}

/**
 * Create a LinkedIn profile URL from a handle or URL
 */
export function getLinkedInUrl(handleOrUrl: string): string {
  if (handleOrUrl.startsWith("http")) {
    return handleOrUrl
  }
  const handle = handleOrUrl.replace(/^@/, "").replace(/^linkedin\.com\/in\//, "")
  return `https://linkedin.com/in/${handle}`
}

/**
 * Create a Twitter/X profile URL from a handle or URL
 */
export function getTwitterUrl(handleOrUrl: string): string {
  if (handleOrUrl.startsWith("http")) {
    return handleOrUrl
  }
  const handle = handleOrUrl
    .replace(/^@/, "")
    .replace(/^twitter\.com\//, "")
    .replace(/^x\.com\//, "")
  return `https://x.com/${handle}`
}

/**
 * Extract Twitter handle from URL or handle string
 * @example getTwitterHandle("https://x.com/elonmusk") => "elonmusk"
 */
export function getTwitterHandle(handleOrUrl: string): string {
  return handleOrUrl
    .replace(/^https?:\/\/(www\.)?(twitter|x)\.com\//, "")
    .replace(/^@/, "")
    .split("/")[0]
}

/**
 * Check if a string is a valid URL
 */
export function isValidUrl(str: string): boolean {
  try {
    new URL(str.startsWith("http") ? str : `https://${str}`)
    return true
  } catch {
    return false
  }
}

