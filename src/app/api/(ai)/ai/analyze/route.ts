import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/client"
import { generateCompanyAnalysis, isGeminiConfigured, type CompanyContext } from "@/lib/integrations/gemini"

// POST /api/ai/analyze - Generate AI analysis for a company
export async function POST(request: NextRequest) {
  if (!isGeminiConfigured()) {
    return NextResponse.json(
      { error: "Gemini API is not configured. Add GEMINI_API_KEY to your environment." },
      { status: 500 }
    )
  }

  const supabase = createServerClient()

  try {
    const { companyId } = await request.json()

    if (!companyId) {
      return NextResponse.json(
        { error: "companyId is required" },
        { status: 400 }
      )
    }

    // Fetch company with all relations
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select(`
        *,
        founder:founders(*),
        tags:company_tags(tag:tags(*)),
        comments(*),
        calendar_events(*),
        email_threads(*)
      `)
      .eq("id", companyId)
      .single()

    if (companyError || !company) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      )
    }

    // Build the context for analysis
    const context: CompanyContext = {
      name: company.name,
      description: company.description,
      website: company.website,
      stage: company.stage,
      founderName: company.founder?.name || company.founder_name,
      founderEmail: company.founder?.email || company.founder_email,
      founderLinkedIn: company.founder?.linkedin,
      founderTwitter: company.founder?.twitter,
      founderBio: company.founder?.bio,
      founderPreviousCompanies: company.founder?.previous_companies,
      founderEducation: company.founder?.education,
      tags: company.tags?.map((t: any) => t.tag?.label).filter(Boolean) || [],
      comments: company.comments?.map((c: any) => ({
        content: c.content,
        type: c.comment_type,
        createdAt: c.created_at,
      })) || [],
      calendarEvents: company.calendar_events?.map((e: any) => ({
        title: e.title,
        startTime: e.start_time,
        description: e.description,
      })) || [],
      emailThreads: company.email_threads?.map((e: any) => ({
        subject: e.subject || "",
        snippet: e.snippet,
        date: e.email_date || e.created_at,
      })) || [],
    }

    // Generate the analysis
    const analysis = await generateCompanyAnalysis(context)

    // Save the analysis to the database
    const { error: updateError } = await supabase
      .from("companies")
      .update({
        ai_analysis: analysis,
        ai_analysis_updated_at: new Date().toISOString(),
      })
      .eq("id", companyId)

    if (updateError) {
      console.error("Error saving analysis:", updateError)
      // Still return the analysis even if save fails
    }

    return NextResponse.json({
      success: true,
      analysis,
      updatedAt: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("Error generating analysis:", error)
    return NextResponse.json(
      { error: error.message || "Failed to generate analysis" },
      { status: 500 }
    )
  }
}

