// Gmail API helper functions

interface GmailMessage {
  id: string
  threadId: string
  snippet: string
  payload?: {
    headers?: { name: string; value: string }[]
    body?: { data?: string }
    parts?: { body?: { data?: string }; mimeType?: string }[]
  }
  internalDate?: string
  labelIds?: string[]
}

interface ParsedEmail {
  id: string
  threadId: string
  subject: string
  from: string
  fromEmail: string
  to: string
  date: string
  snippet: string
  body?: string
  labels: string[]
}

// Decode base64url encoded string
function decodeBase64Url(data: string): string {
  try {
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/')
    return Buffer.from(base64, 'base64').toString('utf-8')
  } catch {
    return ''
  }
}

// Parse email headers
function getHeader(headers: { name: string; value: string }[] | undefined, name: string): string {
  if (!headers) return ''
  const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase())
  return header?.value || ''
}

// Extract email address from "Name <email>" format
function extractEmail(fromHeader: string): string {
  const match = fromHeader.match(/<([^>]+)>/)
  return match ? match[1] : fromHeader
}

// Extract name from "Name <email>" format
function extractName(fromHeader: string): string {
  const match = fromHeader.match(/^([^<]+)/)
  return match ? match[1].trim().replace(/"/g, '') : fromHeader
}

// Parse Gmail message into a clean format
export function parseGmailMessage(message: GmailMessage): ParsedEmail {
  const headers = message.payload?.headers
  const fromHeader = getHeader(headers, 'From')
  
  let body = ''
  if (message.payload?.body?.data) {
    body = decodeBase64Url(message.payload.body.data)
  } else if (message.payload?.parts) {
    // Get text/plain part
    const textPart = message.payload.parts.find(p => p.mimeType === 'text/plain')
    if (textPart?.body?.data) {
      body = decodeBase64Url(textPart.body.data)
    }
  }

  return {
    id: message.id,
    threadId: message.threadId,
    subject: getHeader(headers, 'Subject'),
    from: extractName(fromHeader),
    fromEmail: extractEmail(fromHeader),
    to: getHeader(headers, 'To'),
    date: message.internalDate 
      ? new Date(parseInt(message.internalDate)).toISOString()
      : '',
    snippet: message.snippet,
    body,
    labels: message.labelIds || [],
  }
}

// Fetch emails from Gmail API
export async function fetchEmails(
  accessToken: string,
  options: {
    maxResults?: number
    q?: string // Gmail search query
    labelIds?: string[]
  } = {}
): Promise<ParsedEmail[]> {
  const { maxResults = 20, q, labelIds } = options

  // Build query params
  const params = new URLSearchParams({
    maxResults: maxResults.toString(),
  })
  if (q) params.set('q', q)
  if (labelIds?.length) params.set('labelIds', labelIds.join(','))

  // List messages
  const listResponse = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  if (!listResponse.ok) {
    const error = await listResponse.json()
    throw new Error(error.error?.message || 'Failed to list emails')
  }

  const listData = await listResponse.json()
  const messageIds = listData.messages || []

  // Fetch full message details in parallel (batch)
  const messages = await Promise.all(
    messageIds.slice(0, maxResults).map(async ({ id }: { id: string }) => {
      const msgResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )
      if (!msgResponse.ok) return null
      return msgResponse.json()
    })
  )

  return messages
    .filter((m): m is GmailMessage => m !== null)
    .map(parseGmailMessage)
}

// Match emails with founders in the pipeline
export function matchEmailsWithFounders(
  emails: ParsedEmail[],
  founderEmails: string[]
): ParsedEmail[] {
  const founderEmailSet = new Set(founderEmails.map(e => e.toLowerCase()))
  
  return emails.filter(email => {
    // Check if email is from a founder
    if (founderEmailSet.has(email.fromEmail.toLowerCase())) return true
    
    // Check if email is to a founder (in To field)
    const toAddresses = email.to.toLowerCase().split(',')
    if (toAddresses.some(to => founderEmailSet.has(extractEmail(to.trim()).toLowerCase()))) return true
    
    return false
  })
}

// Enhanced matching for specific founder
export function matchEmailToFounder(
  email: ParsedEmail,
  founder: { email: string; name: string }
): boolean {
  const founderEmail = founder.email.toLowerCase()
  const founderName = founder.name.toLowerCase()
  const firstName = founderName.split(' ')[0]
  
  // Check from email
  if (email.fromEmail.toLowerCase() === founderEmail) return true
  
  // Check from name
  const fromName = email.from.toLowerCase()
  if (fromName.includes(firstName) || fromName.includes(founderName)) return true
  
  // Check to addresses
  const toField = email.to.toLowerCase()
  if (toField.includes(founderEmail)) return true
  if (toField.includes(firstName) || toField.includes(founderName)) return true
  
  // Check subject for name
  const subject = email.subject.toLowerCase()
  if (subject.includes(founderName) || subject.includes(firstName)) return true
  
  return false
}

// Get labels
export async function getLabels(accessToken: string) {
  const response = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/labels',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to fetch labels')
  }

  return response.json()
}

