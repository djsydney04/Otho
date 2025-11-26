import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { fetchEmails, matchEmailsWithFounders } from "@/lib/integrations/google/gmail"
import { MOCK_FOUNDERS } from "@/lib/mocks/pipeline"

// GET /api/gmail/messages - Fetch emails
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.accessToken) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const maxResults = parseInt(searchParams.get("maxResults") || "20")
    const q = searchParams.get("q") || undefined
    const matchFounders = searchParams.get("matchFounders") === "true"

    const emails = await fetchEmails(session.accessToken, {
      maxResults,
      q,
    })

    if (matchFounders) {
      const founderEmails = MOCK_FOUNDERS.map((f) => f.email)
      const matched = matchEmailsWithFounders(emails, founderEmails)
      return NextResponse.json({
        emails: matched,
        total: matched.length,
        matchedWithFounders: true,
      })
    }

    return NextResponse.json({
      emails,
      total: emails.length,
    })
  } catch (error: any) {
    console.error("Gmail fetch error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch emails" },
      { status: 500 }
    )
  }
}

