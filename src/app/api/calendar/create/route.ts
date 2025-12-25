import { NextRequest, NextResponse } from "next/server"
import { createEvent } from "@/lib/integrations/google/calendar"
import { requireGoogleAccessToken } from "@/lib/integrations/google/credentials"

// POST /api/calendar/create - Create a new calendar event
export async function POST(request: NextRequest) {
  try {
    const credentials = await requireGoogleAccessToken()
    if (credentials.error) {
      return NextResponse.json({ error: credentials.error }, { status: 401 })
    }

    const body = await request.json()

    const { summary, description, startDateTime, endDateTime, timeZone, attendees, location } = body

    if (!summary || !startDateTime || !endDateTime) {
      return NextResponse.json(
        { error: "Missing required fields: summary, startDateTime, endDateTime" },
        { status: 400 }
      )
    }

    const event = await createEvent(credentials.accessToken, {
      summary,
      description,
      startDateTime,
      endDateTime,
      timeZone,
      attendees,
      location,
    })

    return NextResponse.json({
      success: true,
      event,
      meetLink: event.hangoutLink,
    })
  } catch (error: any) {
    console.error("Calendar create error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create event" },
      { status: 500 }
    )
  }
}
