import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { listEvents, matchEventsWithFounders } from "@/lib/integrations/google/calendar"
import { createClient } from "@/lib/supabase/server"

// GET /api/calendar/events - List calendar events
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.accessToken) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const timeMin = searchParams.get("timeMin") || undefined
    const timeMax = searchParams.get("timeMax") || undefined
    const matchFoundersParam = searchParams.get("matchFounders") === "true"

    // Get events from Google Calendar
    const events = await listEvents(session.accessToken, {
      timeMin,
      timeMax,
      maxResults: 100,
    })

    // If we want to match with founders
    if (matchFoundersParam) {
      // Get founders from database
      const supabase = await createClient()
      const { data: founders } = await supabase
        .from("founders")
        .select("name, email")
      
      const founderEmails = founders
        ?.filter(f => f.email)
        .map(f => f.email!.toLowerCase()) || []
      const founderNames = founders
        ?.filter(f => f.name)
        .map(f => f.name!) || []
      
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
      { error: error.message || "Failed to fetch calendar events" },
      { status: 500 }
    )
  }
}
