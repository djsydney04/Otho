import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateCompanyAnalysis, isGeminiConfigured, type CompanyContext } from "@/lib/integrations/agent"

// POST /api/ai/analyze - Generate AI analysis for a company or founder
export async function POST(request: NextRequest) {
  if (!isGeminiConfigured()) {
    return NextResponse.json(
      { error: "AI is not configured. Add OPEN_ROUTER_API to your environment." },
      { status: 500 }
    )
  }

  const supabase = await createClient()
  
  // Verify authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  try {
    const { companyId, founderId } = await request.json()

    if (!companyId && !founderId) {
      return NextResponse.json(
        { error: "companyId or founderId is required" },
        { status: 400 }
      )
    }

    let context: CompanyContext
    let entityId: string
    let entityType: "company" | "founder"

    if (companyId) {
      entityId = companyId
      entityType = "company"
      
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
        console.error("Company fetch error:", companyError)
        return NextResponse.json(
          { error: "Company not found" },
          { status: 404 }
        )
      }

      // Build the context for analysis
      context = {
        id: company.id,
        name: company.name,
        description: company.description,
        website: company.website,
        stage: company.stage,
        founderName: company.founder?.name,
        founderEmail: company.founder?.email,
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
    } else {
      entityId = founderId
      entityType = "founder"
      
      // Fetch founder with relations
      const { data: founder, error: founderError } = await supabase
        .from("founders")
        .select(`
          *,
          companies(id, name, website, description, stage),
          founder_comments(*)
        `)
        .eq("id", founderId)
        .single()

      if (founderError || !founder) {
        console.error("Founder fetch error:", founderError)
        return NextResponse.json(
          { error: "Founder not found" },
          { status: 404 }
        )
      }

      // Build founder-focused context
      context = {
        id: founder.id,
        name: founder.name,
        founderName: founder.name,
        founderEmail: founder.email,
        founderLinkedIn: founder.linkedin,
        founderTwitter: founder.twitter,
        founderBio: founder.bio,
        founderPreviousCompanies: founder.previous_companies,
        founderEducation: founder.education,
        tags: founder.domain_expertise || [],
        comments: founder.founder_comments?.map((c: any) => ({
          content: c.content,
          type: c.comment_type,
          createdAt: c.created_at,
        })) || [],
      }
    }

    // Generate the analysis
    const analysis = await generateCompanyAnalysis(context)

    // Save the analysis to the database
    if (entityType === "company") {
      const { error: updateError } = await supabase
        .from("companies")
        .update({
          ai_analysis: analysis,
          ai_analysis_updated_at: new Date().toISOString(),
        })
        .eq("id", entityId)

      if (updateError) {
        console.error("Error saving company analysis:", updateError)
      }
    } else {
      // For founders, we might want to store analysis differently
      // For now, just return it without saving
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
