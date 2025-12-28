import { NextRequest, NextResponse } from "next/server"
import { listEvents, matchEventsWithFounders, matchEventToFounder } from "@/lib/integrations/google/calendar"
import { createClient } from "@/lib/supabase/server"

// POST /api/calendar/sync - Sync calendar and match with pipeline
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      )
    }

    // Get Google access token from users table
    const { data: userData } = await supabase
      .from("users")
      .select("google_access_token, google_refresh_token, google_token_expires_at")
      .eq("id", user.id)
      .single()

    if (!userData?.google_access_token) {
      return NextResponse.json(
        { error: "Google Calendar not connected. Please connect your Google account in Settings." },
        { status: 400 }
      )
    }

    // Check if token is expired and refresh if needed
    let accessToken = userData.google_access_token
    if (userData.google_token_expires_at && new Date(userData.google_token_expires_at) < new Date()) {
      // Token expired - would need to refresh using refresh_token
      // For now, return error asking user to reconnect
      return NextResponse.json(
        { error: "Google token expired. Please reconnect your Google account in Settings." },
        { status: 401 }
      )
    }

    // SECURITY: Only get founders and companies owned by this user
    // Get user's companies first
    const { data: userCompanies } = await supabase
      .from("companies")
      .select("id, name, founder_id")
      .eq("owner_id", user.id)
    
    if (!userCompanies || userCompanies.length === 0) {
      return NextResponse.json({ error: "No companies found" }, { status: 404 })
    }
    
    // Get founder IDs from user's companies (filter out nulls)
    const founderIds = [...new Set(userCompanies.map(c => c.founder_id).filter((id): id is string => Boolean(id)))]
    
    if (founderIds.length === 0) {
      return NextResponse.json({ error: "No founders found" }, { status: 404 })
    }
    
    // Get founders from database (only those linked to user's companies)
    const { data: founders } = await supabase
      .from("founders")
      .select("id, name, email, additional_emails")
      .in("id", founderIds)
    
    // Use the user's companies
    const companies = userCompanies

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

    const events = await listEvents(accessToken, {
      timeMin: threeMonthsAgo.toISOString(),
      timeMax: now.toISOString(),
      maxResults: 250,
    })

    console.log(`[Calendar Sync] Fetched ${events.length} events from Google Calendar`)

    // Match events with founders
    const matchedEvents = matchEventsWithFounders(
      events,
      Array.from(emailToFounder.keys()),
      founders.map(f => f.name || "").filter(Boolean)
    )

    console.log(`[Calendar Sync] Matched ${matchedEvents.length} events with founders`)

    // Store calendar events in database
    const eventsToInsert = matchedEvents
      .map(event => {
        // Find matching founder by checking attendees
        let founder = null
        if (event.attendees) {
          for (const attendee of event.attendees) {
            const email = attendee.email?.toLowerCase()
            if (email && emailToFounder.has(email)) {
              founder = emailToFounder.get(email)
              break
            }
          }
        }
        
        const company = founder 
          ? companies.find(c => c.founder_id === founder.id)
          : null

        const startTime = event.start?.dateTime || event.start?.date
        const endTime = event.end?.dateTime || event.end?.date || startTime
        
        // Skip events without valid times
        if (!startTime || !endTime) return null
        
        return {
          user_id: user.id,
          company_id: company?.id || null,
          founder_id: founder?.id || null,
          title: event.summary || "Untitled Event",
          description: event.description || null,
          start_time: startTime,
          end_time: endTime,
          location: event.location || null,
          google_event_id: event.id || undefined,
          metadata: event as any,
        }
      })
      .filter((e): e is NonNullable<typeof e> => e !== null) // Remove null entries with type guard

    if (eventsToInsert.length > 0) {
      // Upsert events (update if exists, insert if not)
      const { error: insertError } = await supabase
        .from("calendar_events")
        .upsert(eventsToInsert, {
          onConflict: "google_event_id,user_id",
        })

      if (insertError) {
        console.error("[Calendar Sync] Error inserting events:", insertError)
        return NextResponse.json(
          { error: "Failed to save events", details: insertError.message },
          { status: 500 }
        )
      }
    }

    // Update last sync time in integrations table
    await supabase
      .from("integrations")
      .upsert({
        user_id: user.id,
        provider: "google_calendar",
        enabled: true,
        synced_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,provider"
      })

    return NextResponse.json({
      success: true,
      syncedAt: new Date().toISOString(),
      totalEvents: events.length,
      matchedEvents: matchedEvents.length,
      savedEvents: eventsToInsert.length,
    })
  } catch (error: any) {
    console.error("[Calendar Sync] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to sync calendar" },
      { status: 500 }
    )
  }
}
