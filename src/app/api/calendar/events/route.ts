import { NextRequest, NextResponse } from "next/server"
import { listEvents, matchEventsWithFounders } from "@/lib/integrations/google/calendar"
import { MOCK_FOUNDERS } from "@/lib/mocks/pipeline"
import { requireGoogleAccessToken } from "@/lib/integrations/google/credentials"

// GET /api/calendar/events - List calendar events
export async function GET(request: NextRequest) {
  try {
    const credentials = await requireGoogleAccessToken()
    if (credentials.error) {
      return NextResponse.json({ error: credentials.error }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const timeMin = searchParams.get("timeMin") || undefined
    const timeMax = searchParams.get("timeMax") || undefined
    const companyId = searchParams.get("companyId") || undefined
    const matchFounders = searchParams.get("matchFounders") === "true"

    // Get events from Google Calendar
    const events = await listEvents(credentials.accessToken, {
      timeMin,
      timeMax,
      maxResults: 100,
    })

    // If we want to match with founders
    if (matchFounders) {
      const founderEmails = MOCK_FOUNDERS.filter(f => f.email).map((f) => f.email!.toLowerCase())
      const founderNames = MOCK_FOUNDERS.filter(f => f.name).map((f) => f.name!)
      const matchedEvents = matchEventsWithFounders(events, founderEmails, founderNames)
      
      return NextResponse.json({
        events: matchedEvents,
        total: matchedEvents.length,
      })
    }

    return NextResponse.json({
      events,
      total: events.length,
    })
  } catch (error: any) {
    console.error("Calendar events error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch events" },
      { status: 500 }
    )
  }
}
