import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { listEvents, matchEventsWithFounders, matchEventToFounder } from "@/lib/integrations/google/calendar"
import { createServerClient } from "@/lib/supabase/client"

// POST /api/calendar/sync - Sync calendar and match with pipeline
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.accessToken) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      )
    }

    const supabase = createServerClient()

    // Get founders from database (including additional emails)
    const { data: founders } = await supabase
      .from("founders")
      .select("id, name, email, additional_emails")
    
    // Get companies from database
    const { data: companies } = await supabase
      .from("companies")
      .select("id, name, founder_id")

    if (!founders || !companies) {
      return NextResponse.json(
        { error: "Failed to fetch data" },
        { status: 500 }
      )
    }

    // Build a map of all emails to founder
    const emailToFounder = new Map<string, typeof founders[0]>()
    founders.forEach(f => {
      emailToFounder.set(f.email.toLowerCase(), f)
      if (f.additional_emails) {
        f.additional_emails.forEach((email: string) => {
          emailToFounder.set(email.toLowerCase(), f)
        })
      }
    })

    console.log(`[Calendar Sync] Found ${founders.length} founders with ${emailToFounder.size} total email addresses`)

    // Get events from the last 90 days
    const now = new Date()
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

    const events = await listEvents(session.accessToken, {
      timeMin: threeMonthsAgo.toISOString(),
      timeMax: now.toISOString(),
      maxResults: 250,
    })

    console.log(`[Calendar Sync] Fetched ${events.length} calendar events`)

    // Match events with founders using enhanced matching (including all emails)
    const allFounderEmails = Array.from(emailToFounder.keys())
    const founderNames = founders.map((f) => f.name)
    const matchedEvents = matchEventsWithFounders(events, allFounderEmails, founderNames)

    console.log(`[Calendar Sync] Matched ${matchedEvents.length} events with founders`)

    // Process and store events
    const eventsByCompany: Record<string, any[]> = {}
    const eventsByFounder: Record<string, any[]> = {}
    const eventsToUpsert: any[] = []

    matchedEvents.forEach((event) => {
      // Find which founder this event is with using enhanced matching (check all emails)
      let matchedFounder = null
      
      // First check by attendee email (most reliable)
      for (const attendee of event.attendees || []) {
        const email = attendee.email?.toLowerCase()
        if (email && emailToFounder.has(email)) {
          matchedFounder = emailToFounder.get(email)
          break
        }
      }
      
      // Fall back to name matching
      if (!matchedFounder) {
        matchedFounder = founders.find((founder) => matchEventToFounder(event, founder))
      }

      if (matchedFounder) {
        // Track by founder
        if (!eventsByFounder[matchedFounder.id]) {
          eventsByFounder[matchedFounder.id] = []
        }
        eventsByFounder[matchedFounder.id].push(event)

        // Find the company for this founder
        const company = companies.find((c) => c.founder_id === matchedFounder.id)
        if (company) {
          if (!eventsByCompany[company.id]) {
            eventsByCompany[company.id] = []
          }
          eventsByCompany[company.id].push(event)
        }

        // Prepare for database upsert
        eventsToUpsert.push({
          google_event_id: event.id,
          founder_id: matchedFounder.id,
          company_id: company?.id || null,
          title: event.summary || 'Untitled',
          description: event.description || null,
          start_time: event.start?.dateTime || event.start?.date,
          end_time: event.end?.dateTime || event.end?.date,
          attendees: event.attendees || [],
          html_link: event.htmlLink || null,
          meet_link: event.hangoutLink || null,
        })
      }
    })

    // Upsert events to database
    if (eventsToUpsert.length > 0) {
      const { error: upsertError } = await supabase
        .from("calendar_events")
        .upsert(eventsToUpsert, { 
          onConflict: 'google_event_id',
          ignoreDuplicates: false 
        })
      
      if (upsertError) {
        console.error("Error upserting events:", upsertError)
      }
    }

    // Calculate last contact for each company
    const lastContactByCompany: Record<string, string> = {}
    Object.entries(eventsByCompany).forEach(([companyId, companyEvents]) => {
      const sorted = companyEvents.sort((a, b) => {
        const dateA = new Date(a.start?.dateTime || a.start?.date || 0).getTime()
        const dateB = new Date(b.start?.dateTime || b.start?.date || 0).getTime()
        return dateB - dateA
      })
      if (sorted[0]) {
        lastContactByCompany[companyId] = sorted[0].start?.dateTime || sorted[0].start?.date || ""
      }
    })

    // Calculate last contact for each founder
    const lastContactByFounder: Record<string, string> = {}
    Object.entries(eventsByFounder).forEach(([founderId, founderEvents]) => {
      const sorted = founderEvents.sort((a, b) => {
        const dateA = new Date(a.start?.dateTime || a.start?.date || 0).getTime()
        const dateB = new Date(b.start?.dateTime || b.start?.date || 0).getTime()
        return dateB - dateA
      })
      if (sorted[0]) {
        lastContactByFounder[founderId] = sorted[0].start?.dateTime || sorted[0].start?.date || ""
      }
    })

    return NextResponse.json({
      success: true,
      syncedAt: new Date().toISOString(),
      totalEvents: events.length,
      matchedEvents: matchedEvents.length,
      eventsByCompany,
      eventsByFounder,
      lastContactByCompany,
      lastContactByFounder,
      storedEvents: eventsToUpsert.length,
    })
  } catch (error: any) {
    console.error("Calendar sync error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to sync calendar" },
      { status: 500 }
    )
  }
}
