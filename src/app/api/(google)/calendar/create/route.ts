import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createEvent } from "@/lib/integrations/google/calendar"

// POST /api/calendar/create - Create a new calendar event
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.accessToken) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      )
    }

    const body = await request.json()

    const { summary, description, startDateTime, endDateTime, timeZone, attendees, location } = body

    if (!summary || !startDateTime || !endDateTime) {
      return NextResponse.json(
        { error: "Missing required fields: summary, startDateTime, endDateTime" },
        { status: 400 }
      )
    }

    const event = await createEvent(session.accessToken, {
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

