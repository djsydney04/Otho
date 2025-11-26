import { google, calendar_v3 } from "googleapis"

// Create an OAuth2 client from access token
export function createOAuth2Client(accessToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_AUTH_CLIENT_ID,
    process.env.GOOGLE_AUTH_SECRET
  )
  oauth2Client.setCredentials({ access_token: accessToken })
  return oauth2Client
}

// Get calendar instance
export function getCalendar(accessToken: string) {
  const auth = createOAuth2Client(accessToken)
  return google.calendar({ version: "v3", auth })
}

// List upcoming events
export async function listEvents(
  accessToken: string,
  options: {
    timeMin?: string
    timeMax?: string
    maxResults?: number
    q?: string // Search query for matching founders/companies
  } = {}
): Promise<calendar_v3.Schema$Event[]> {
  const calendar = getCalendar(accessToken)
  
  const response = await calendar.events.list({
    calendarId: "primary",
    timeMin: options.timeMin || new Date().toISOString(),
    timeMax: options.timeMax,
    maxResults: options.maxResults || 50,
    singleEvents: true,
    orderBy: "startTime",
    q: options.q,
  })

  return response.data.items || []
}

// Create a new event
export async function createEvent(
  accessToken: string,
  event: {
    summary: string
    description?: string
    startDateTime: string
    endDateTime: string
    timeZone?: string
    attendees?: { email: string }[]
    location?: string
  }
): Promise<calendar_v3.Schema$Event> {
  const calendar = getCalendar(accessToken)

  const response = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: event.summary,
      description: event.description,
      location: event.location,
      start: {
        dateTime: event.startDateTime,
        timeZone: event.timeZone || "America/Los_Angeles",
      },
      end: {
        dateTime: event.endDateTime,
        timeZone: event.timeZone || "America/Los_Angeles",
      },
      attendees: event.attendees,
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    },
    conferenceDataVersion: 1,
    sendUpdates: "all",
  })

  return response.data
}

// Get free/busy information
export async function getFreeBusy(
  accessToken: string,
  timeMin: string,
  timeMax: string
) {
  const calendar = getCalendar(accessToken)

  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin,
      timeMax,
      items: [{ id: "primary" }],
    },
  })

  return response.data.calendars?.primary?.busy || []
}

// Match events with founders (by email or name in summary/description/attendee name)
export function matchEventsWithFounders(
  events: calendar_v3.Schema$Event[],
  founderEmails: string[],
  founderNames: string[]
): calendar_v3.Schema$Event[] {
  const emailSet = new Set(founderEmails.map(e => e.toLowerCase()))
  const nameSet = founderNames.map(n => n.toLowerCase())
  
  return events.filter((event) => {
    // Check attendee emails
    const attendeeEmailMatch = event.attendees?.some((attendee) =>
      emailSet.has(attendee.email?.toLowerCase() || "")
    )
    if (attendeeEmailMatch) return true

    // Check attendee display names
    const attendeeNameMatch = event.attendees?.some((attendee) => {
      const displayName = attendee.displayName?.toLowerCase() || ""
      return nameSet.some(name => 
        displayName.includes(name) || name.includes(displayName.split(' ')[0])
      )
    })
    if (attendeeNameMatch) return true

    // Check summary/title for name matches
    const summary = event.summary?.toLowerCase() || ""
    const summaryMatch = nameSet.some((name) => {
      const firstName = name.split(' ')[0]
      return summary.includes(name) || summary.includes(firstName)
    })
    if (summaryMatch) return true

    // Check description for name or email matches
    const description = event.description?.toLowerCase() || ""
    const descriptionMatch = nameSet.some(name => description.includes(name)) ||
      Array.from(emailSet).some(email => description.includes(email))
    if (descriptionMatch) return true

    return false
  })
}

// Enhanced matching for specific founder
export function matchEventToFounder(
  event: calendar_v3.Schema$Event,
  founder: { email: string; name: string }
): boolean {
  const email = founder.email.toLowerCase()
  const name = founder.name.toLowerCase()
  const firstName = name.split(' ')[0]
  const lastName = name.split(' ').slice(-1)[0]
  
  // Check attendee emails
  if (event.attendees?.some(a => a.email?.toLowerCase() === email)) return true
  
  // Check attendee display names (partial match)
  if (event.attendees?.some(a => {
    const display = a.displayName?.toLowerCase() || ""
    return display.includes(firstName) || display.includes(lastName) || display.includes(name)
  })) return true
  
  // Check title
  const summary = event.summary?.toLowerCase() || ""
  if (summary.includes(firstName) || summary.includes(name)) return true
  
  // Check description
  const desc = event.description?.toLowerCase() || ""
  if (desc.includes(email) || desc.includes(name)) return true
  
  return false
}

