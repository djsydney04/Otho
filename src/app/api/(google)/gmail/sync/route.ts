import { NextRequest, NextResponse } from "next/server"
import { fetchEmails, matchEmailsWithFounders } from "@/lib/integrations/google/gmail"
import { createClient } from "@/lib/supabase/server"

// Helper to extract email from "Name <email>" format
function extractEmail(fromHeader: string): string {
  const match = fromHeader.match(/<([^>]+)>/)
  return match ? match[1] : fromHeader
}

// POST /api/gmail/sync - Sync emails with pipeline
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
        { error: "Gmail not connected. Please connect your Google account in Settings." },
        { status: 400 }
      )
    }

    // Check if token is expired
    let accessToken = userData.google_access_token
    if (userData.google_token_expires_at && new Date(userData.google_token_expires_at) < new Date()) {
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
    const founderByEmail = new Map<string, typeof founders[0]>()
    founders.forEach(f => {
      founderByEmail.set(f.email.toLowerCase(), f)
      if (f.additional_emails) {
        f.additional_emails.forEach((email: string) => {
          founderByEmail.set(email.toLowerCase(), f)
        })
      }
    })

    console.log(`[Gmail Sync] Found ${founders.length} founders with ${founderByEmail.size} total email addresses`)

    // Fetch emails from Gmail
    const emails = await fetchEmails(accessToken, {
      maxResults: 50,
    })

    console.log(`[Gmail Sync] Fetched ${emails.length} emails from Gmail`)

    // Match emails with founders
    const matchedEmails = matchEmailsWithFounders(
      emails,
      Array.from(founderByEmail.keys())
    )

    console.log(`[Gmail Sync] Matched ${matchedEmails.length} emails with founders`)

    // Store email threads in database
    const threadsToInsert = matchedEmails.map(email => {
      // Find matching founder by checking fromEmail or to addresses
      let founder = null
      if (email.fromEmail && founderByEmail.has(email.fromEmail.toLowerCase())) {
        founder = founderByEmail.get(email.fromEmail.toLowerCase())
      } else {
        // Check to addresses
        const toAddresses = email.to.split(',').map(e => extractEmail(e.trim()).toLowerCase())
        for (const toEmail of toAddresses) {
          if (founderByEmail.has(toEmail)) {
            founder = founderByEmail.get(toEmail)
            break
          }
        }
      }
      
      const company = founder 
        ? companies.find(c => c.founder_id === founder.id)
        : null

      return {
        user_id: user.id,
        company_id: company?.id || null,
        founder_id: founder?.id || null,
        subject: email.subject || "No Subject",
        snippet: email.snippet || null,
        date: email.date || new Date().toISOString(),
        gmail_thread_id: email.threadId,
        gmail_message_id: email.id,
        from_email: email.fromEmail || null,
        metadata: email,
      }
    })

    if (threadsToInsert.length > 0) {
      // Upsert email threads
      const { error: insertError } = await supabase
        .from("email_threads")
        .upsert(threadsToInsert, {
          onConflict: "gmail_thread_id,user_id",
        })

      if (insertError) {
        console.error("[Gmail Sync] Error inserting threads:", insertError)
        return NextResponse.json(
          { error: "Failed to save emails", details: insertError.message },
          { status: 500 }
        )
      }
    }

    // Update last sync time in integrations table
    await supabase
      .from("integrations")
      .upsert({
        user_id: user.id,
        provider: "gmail",
        enabled: true,
        synced_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,provider"
      })

    return NextResponse.json({
      success: true,
      syncedAt: new Date().toISOString(),
      totalEmails: emails.length,
      matchedEmails: matchedEmails.length,
      savedThreads: threadsToInsert.length,
    })
  } catch (error: any) {
    console.error("[Gmail Sync] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to sync emails" },
      { status: 500 }
    )
  }
}
