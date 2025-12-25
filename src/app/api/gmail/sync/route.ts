import { NextRequest, NextResponse } from "next/server"
import { fetchEmails, matchEmailsWithFounders, matchEmailToFounder } from "@/lib/integrations/google/gmail"
import { createServerClient } from "@/lib/supabase/client"
import { requireGoogleAccessToken } from "@/lib/integrations/google/credentials"

// POST /api/gmail/sync - Sync emails with pipeline
export async function POST(request: NextRequest) {
  try {
    const credentials = await requireGoogleAccessToken()
    if (credentials.error) {
      return NextResponse.json({ error: credentials.error }, { status: 401 })
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

    // Get all founder emails for matching
    const founderEmails = Array.from(founderByEmail.keys())

    // Fetch recent emails (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const dateQuery = `after:${thirtyDaysAgo.toISOString().split('T')[0]}`

    const allEmails = await fetchEmails(credentials.accessToken, {
      maxResults: 100,
      q: dateQuery,
    })

    console.log(`[Gmail Sync] Fetched ${allEmails.length} emails`)

    // Match with founders using enhanced matching
    const matchedEmails = matchEmailsWithFounders(allEmails, founderEmails)

    console.log(`[Gmail Sync] Matched ${matchedEmails.length} emails with founders by email address`)

    // Also match by name for better coverage
    const nameMatchedEmails = allEmails.filter(email => {
      // Skip if already matched by email
      if (matchedEmails.some(m => m.id === email.id)) return false
      // Check if any founder name appears in from, to, or subject
      return founders.some(f => matchEmailToFounder(email, f))
    })

    console.log(`[Gmail Sync] Found ${nameMatchedEmails.length} additional emails matched by name`)

    const allMatchedEmails = [...matchedEmails, ...nameMatchedEmails]

    // Process and store emails
    const emailsByCompany: Record<string, any[]> = {}
    const emailsByFounder: Record<string, any[]> = {}
    const emailsToUpsert: any[] = []

    allMatchedEmails.forEach((email) => {
      // Find which founder this email is from/to using enhanced matching (check all emails)
      let founder = founderByEmail.get(email.fromEmail.toLowerCase())
      
      // Check 'to' field for any founder email
      if (!founder) {
        const toField = email.to.toLowerCase()
        for (const [founderEmail, f] of founderByEmail.entries()) {
          if (toField.includes(founderEmail)) {
            founder = f
            break
          }
        }
      }
      
      // Fall back to name matching
      if (!founder) {
        founder = founders.find(f => matchEmailToFounder(email, f))
      }

      if (founder) {
        // Track by founder
        if (!emailsByFounder[founder.id]) {
          emailsByFounder[founder.id] = []
        }
        emailsByFounder[founder.id].push(email)

        // Find company for this founder
        const company = companies.find((c) => c.founder_id === founder.id)
        if (company) {
          if (!emailsByCompany[company.id]) {
            emailsByCompany[company.id] = []
          }
          emailsByCompany[company.id].push(email)
        }

        // Prepare for database upsert
        emailsToUpsert.push({
          gmail_thread_id: email.threadId,
          gmail_message_id: email.id,
          founder_id: founder.id,
          company_id: company?.id || null,
          subject: email.subject || null,
          snippet: email.snippet || null,
          from_name: email.from || null,
          from_email: email.fromEmail || null,
          to_email: email.to || null,
          email_date: email.date || null,
          labels: email.labels || [],
        })
      }
    })

    // Upsert emails to database (use gmail_message_id as unique key)
    if (emailsToUpsert.length > 0) {
      // Delete existing and insert new (simpler than upsert for this case)
      for (const emailData of emailsToUpsert) {
        const { error } = await supabase
          .from("email_threads")
          .upsert(emailData, { 
            onConflict: 'gmail_thread_id',
            ignoreDuplicates: false 
          })
        
        if (error && error.code !== '23505') { // Ignore duplicate key errors
          console.error("Error upserting email:", error)
        }
      }
    }

    // Calculate last email for each company
    const lastEmailByCompany: Record<string, string> = {}
    Object.entries(emailsByCompany).forEach(([companyId, emails]) => {
      const sorted = emails.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )
      if (sorted[0]) {
        lastEmailByCompany[companyId] = sorted[0].date
      }
    })

    // Calculate last email for each founder
    const lastEmailByFounder: Record<string, string> = {}
    Object.entries(emailsByFounder).forEach(([founderId, emails]) => {
      const sorted = emails.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )
      if (sorted[0]) {
        lastEmailByFounder[founderId] = sorted[0].date
      }
    })

    return NextResponse.json({
      success: true,
      syncedAt: new Date().toISOString(),
      totalEmails: allEmails.length,
      matchedEmails: allMatchedEmails.length,
      emailsByCompany,
      emailsByFounder,
      lastEmailByCompany,
      lastEmailByFounder,
      storedEmails: emailsToUpsert.length,
    })
  } catch (error: any) {
    console.error("Gmail sync error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to sync emails" },
      { status: 500 }
    )
  }
}
