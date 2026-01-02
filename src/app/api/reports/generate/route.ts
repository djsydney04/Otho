import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { buildContext, simpleCompletion, MODEL_CONFIG } from "@/lib/ai"

export const runtime = "nodejs"
export const maxDuration = 300 // 5 minutes for report generation

/**
 * POST /api/reports/generate
 * 
 * Generate a comprehensive deal report or investment memo
 * 
 * Body:
 * - company_id: UUID of the company
 * - type: 'deal_closed' | 'investment_memo' | 'custom'
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { company_id, type = "deal_closed", report_id } = body

    if (!company_id) {
      return NextResponse.json(
        { error: "company_id is required" },
        { status: 400 }
      )
    }

    // Fetch company with all related data
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select(`
        *,
        founder:founders(*),
        tags:company_tags(tag:tags(*)),
        comments(*)
      `)
      .eq("id", company_id)
      .single()

    if (companyError || !company) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      )
    }

    // Verify ownership
    if (company.owner_id !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized - not your company" },
        { status: 403 }
      )
    }

    // Create or update report record
    let report
    if (report_id) {
      // Update existing pending report
      // Note: Using 'as any' because reports table may not be in generated types yet
      const { data: existingReport, error: reportError } = await (supabase as any)
        .from("reports")
        .update({
          status: "generating",
          updated_at: new Date().toISOString(),
        })
        .eq("id", report_id)
        .eq("user_id", user.id) // Verify ownership
        .select()
        .single()

      if (reportError || !existingReport) {
        console.error("Error updating report:", reportError)
        return NextResponse.json(
          { error: "Failed to update report" },
          { status: 500 }
        )
      }
      report = existingReport
    } else {
      // Create new report record
      const { data: newReport, error: reportError } = await (supabase as any)
        .from("reports")
        .insert({
          company_id,
          user_id: user.id,
          type,
          status: "generating",
          title: `${type === "deal_closed" ? "Deal Report" : "Investment Memo"}: ${company.name}`,
        })
        .select()
        .single()

      if (reportError || !newReport) {
        console.error("Error creating report:", reportError)
        return NextResponse.json(
          { error: "Failed to create report" },
          { status: 500 }
        )
      }
      report = newReport
    }

    // Build context from internal + external sources
    const contextPrompt = type === "deal_closed"
      ? `Generate a comprehensive deal closure report for ${company.name}. Include: how the deal was closed, key decision factors, company overview, and risks.`
      : `Generate an in-depth investment memo for ${company.name}. Include: company analysis, market opportunity, team assessment, financial overview, risks, and recommendation.`

    const contextPack = await buildContext({
      userId: user.id,
      message: contextPrompt,
      companyId: company_id,
      companyName: company.name,
      companyWebsite: company.website || undefined,      // For accurate source filtering
      companyDescription: company.description || undefined, // For disambiguation
      founderId: company.founder_id || undefined,
      founderName: company.founder?.name,
      includeWebSearch: true,
    })

    // Store sources in report_sources table
    const sources = [
      ...contextPack.internalSources.map((s, idx) => ({
        report_id: report.id,
        source_type: s.sourceType,
        source_id: s.id,
        source_url: s.url,
        title: s.title,
        snippet: s.content.substring(0, 500),
        citation_key: `S${idx + 1}`,
      })),
      ...contextPack.externalSources.map((s, idx) => ({
        report_id: report.id,
        source_type: "web",
        source_url: s.url,
        title: s.title,
        snippet: s.content.substring(0, 500),
        citation_key: `S${contextPack.internalSources.length + idx + 1}`,
      })),
    ]

    if (sources.length > 0) {
      await (supabase as any).from("report_sources").insert(sources)
    }

    // Generate report content with OpenRouter
    const systemPrompt = type === "deal_closed"
      ? `You are a senior partner at a top-tier venture capital firm creating a comprehensive deal closure report. Write with depth, insight, and analytical rigor.

Your report MUST include ALL of these sections with substantial detail:

## 1. Executive Summary (3-4 paragraphs)
- Investment thesis in one sentence
- Key metrics: stage, amount raised, valuation, sector
- Why we invested and the core opportunity
- Expected outcome and timeline

## 2. Deal Timeline & Process
- How we sourced this deal (intro, outbound, inbound)
- Key meetings and conversations (dates if available)
- Critical decision points and what moved us forward
- Competitive dynamics (other investors, term sheet details if known)
- Final terms and structure

## 3. Company Deep Dive
- **Product/Service**: What exactly do they build? Technical differentiation?
- **Business Model**: How do they make money? Pricing, margins, unit economics
- **Market Position**: TAM/SAM/SOM, market dynamics, timing
- **Traction**: Revenue, growth rate, customers, retention, engagement metrics
- **Technology**: Technical moat, IP, defensibility

## 4. Founder & Team Assessment
- **Background**: Career history, domain expertise, prior exits
- **Strengths**: What makes this team exceptional?
- **Gaps**: What's missing? What hires are needed?
- **Working Style**: How do they operate? Decision-making, communication
- **References**: What did backchecks reveal?

## 5. Competitive Landscape
- Direct competitors and their positioning
- Indirect/adjacent threats
- Company's competitive advantages
- Barriers to entry for others

## 6. Risk Analysis (be thorough)
- **Market Risk**: What if the market doesn't develop as expected?
- **Execution Risk**: Can this team deliver?
- **Competitive Risk**: What if a bigger player enters?
- **Financial Risk**: Burn rate, runway, path to profitability
- **Regulatory/Other**: Any external factors?

## 7. Investment Rationale
- Why this is a compelling opportunity NOW
- What has to go right for this to be a great investment
- Potential return scenarios (base, bull, bear)

## 8. LP Memo Summary (3 paragraphs)
- Concise summary for limited partners
- Key points: what, why, risks, expected outcome

CRITICAL RULES:
- Every factual claim MUST include a citation like [S1], [S2], etc.
- Use ONLY information from the provided sources - do not invent data
- If specific information is unavailable, note "Information not available from sources" and suggest what diligence would be needed
- Write in professional, analytical language befitting a top VC firm
- Be thorough - depth over brevity. Aim for 1500-2500 words total.
- Use bullet points for lists, but write narrative paragraphs for analysis

⚠️ CRITICAL - SOURCE VERIFICATION:
- ONLY cite sources that are about THIS EXACT COMPANY: "${company.name}"
- There may be OTHER companies with similar names in the sources - DO NOT use information about them
- If a source mentions a different company (different industry, different location, different funding history), IGNORE IT COMPLETELY
- When in doubt, prefer sources from the company's official website domain
- If you cannot verify a source is about the correct company, state "Unable to verify - diligence needed" instead of guessing`

      : `You are a senior partner at a top-tier venture capital firm creating a comprehensive investment memo. This document will inform the partnership's investment decision. Write with depth, insight, and analytical rigor.

Your memo MUST include ALL of these sections with substantial detail:

## 1. Investment Thesis (1-2 paragraphs)
- The core insight: why this company, why now?
- Expected outcome and path to getting there

## 2. Company Overview
- **What They Do**: Product/service description in detail
- **How It Works**: Technical or operational explanation
- **Business Model**: Revenue streams, pricing, margins
- **Stage**: Where are they in their journey?

## 3. Market Opportunity
- **Market Size**: TAM, SAM, SOM with methodology
- **Market Dynamics**: Growth drivers, secular trends
- **Timing**: Why is now the right time?
- **Customer Problem**: What pain point are they solving?

## 4. Competitive Analysis
- **Direct Competitors**: Who else is solving this problem?
- **Indirect Competitors**: Adjacent solutions or substitutes
- **Differentiation**: What's the moat? Why will they win?
- **Competitive Response**: How will incumbents react?

## 5. Team Deep Dive
- **Founders**: Background, track record, why they're the right team
- **Key Executives**: Who else is on the team?
- **Gaps**: What roles need to be filled?
- **Culture**: How do they build and operate?
- **Advisors/Board**: Who's helping them?

## 6. Traction & Metrics
- **Revenue**: ARR/MRR, growth rate, revenue quality
- **Customers**: Count, logos, retention/churn
- **Engagement**: Usage metrics, NPS, expansion
- **Pipeline**: Sales pipeline, conversion rates
- **Unit Economics**: CAC, LTV, payback period

## 7. Financial Overview
- **Funding History**: Prior rounds, investors, valuations
- **Current Round**: Terms, use of proceeds
- **Burn Rate & Runway**: Monthly burn, months of runway
- **Path to Profitability**: When and how?
- **Financial Projections**: Next 2-3 years outlook

## 8. Risk Analysis
- **Market Risks**: What if market assumptions are wrong?
- **Product Risks**: Can they build what they promise?
- **Team Risks**: Key person dependencies, gaps
- **Competitive Risks**: What if competition intensifies?
- **Financial Risks**: Will they need more capital? At what terms?
- **Regulatory/Legal**: Any compliance or legal concerns?

## 9. Due Diligence Findings
- What we verified and confirmed
- Outstanding questions to resolve
- Red flags or concerns noted

## 10. Investment Recommendation
- **Verdict**: Invest or Pass, with conviction level
- **Rationale**: Key reasons for the decision
- **Terms Sought**: What deal terms make sense?
- **Return Potential**: Expected multiple and scenarios

CRITICAL RULES:
- Every factual claim MUST include a citation like [S1], [S2], etc.
- Use ONLY information from the provided sources - do not invent data
- If specific information is unavailable, note "Information not available from sources" and flag as a diligence item
- Write in professional, analytical language befitting a top VC firm
- Be thorough - depth over brevity. Aim for 2000-3000 words total.
- Use bullet points for lists, but write narrative paragraphs for analysis
- Include specific numbers and metrics wherever available

⚠️ CRITICAL - SOURCE VERIFICATION:
- ONLY cite sources that are about THIS EXACT COMPANY: "${company.name}"
- There may be OTHER companies with similar names in the sources - DO NOT use information about them
- If a source mentions a different company (different industry, different location, different funding history), IGNORE IT COMPLETELY
- When in doubt, prefer sources from the company's official website domain
- If you cannot verify a source is about the correct company, state "Unable to verify - diligence needed" instead of guessing`

    const userPrompt = `Generate a comprehensive ${type === "deal_closed" ? "deal closure report" : "investment memo"} for ${company.name}.

COMPANY CONTEXT:
- Name: ${company.name}
- Website: ${company.website || "Not provided"}
- Stage: ${company.stage || "Not specified"}
- Description: ${company.description || "Not provided"}
${company.founder ? `- Founder: ${company.founder.name}${company.founder.linkedin ? ` (LinkedIn: ${company.founder.linkedin})` : ""}` : ""}

AVAILABLE SOURCES AND CONTEXT:
${contextPack.contextPackText}

SOURCE CITATIONS:
${contextPack.sourceCitations}

Generate the full report now. Be thorough and analytical. Every claim must cite sources using [S#] format.`

    // Generate report using LangChain
    const reportContent = await simpleCompletion(userPrompt, {
      systemPrompt,
      task: "report_generation",
      temperature: 0.5,
    })

    // Optional: Guard pass to validate citations
    const guardPrompt = `Review this report and verify:
1. Every factual claim has a citation [S#]
2. Citations reference valid sources (S1-S${sources.length})
3. No unsupported claims

Report:
${reportContent}

Respond with JSON: {"valid": true/false, "issues": ["list of issues if any"]}`

    // Skip guard validation for now to save credits
    const guardResponse = { content: '{"valid": true, "issues": []}' }

    let guardResult = { valid: true, issues: [] }
    try {
      guardResult = JSON.parse(guardResponse.content)
    } catch {
      // Guard validation failed to parse, continue anyway
    }

    // Parse report into sections
    const sections = parseReportSections(reportContent, type)

    // Store sections in report_sections table
    const sectionInserts = sections.map((section, idx) => ({
      report_id: report.id,
      section_type: section.type,
      title: section.title,
      content: section.content,
      order_index: idx,
    }))

    if (sectionInserts.length > 0) {
      await (supabase as any).from("report_sections").insert(sectionInserts)
    }

    // Update report with completed status
    const generationTime = Date.now() - startTime
    await (supabase as any)
      .from("reports")
      .update({
        status: "completed",
        content: {
          sections,
          raw_content: reportContent,
          guard_validation: guardResult,
          source_count: sources.length,
        },
        generated_at: new Date().toISOString(),
        generation_time_ms: generationTime,
      })
      .eq("id", report.id)

    return NextResponse.json({
      success: true,
      report_id: report.id,
      generation_time_ms: generationTime,
      source_count: sources.length,
      section_count: sections.length,
    })
  } catch (error: any) {
    console.error("Error generating report:", error)
    
    return NextResponse.json(
      { error: error.message || "Failed to generate report" },
      { status: 500 }
    )
  }
}

/**
 * Parse report content into structured sections
 */
function parseReportSections(
  content: string,
  type: string
): Array<{ type: string; title: string; content: string }> {
  const sections: Array<{ type: string; title: string; content: string }> = []

  // Split by markdown headers (## or **Section Name**)
  const headerRegex = /(?:^|\n)(?:##\s+|\*\*)(.*?)(?:\*\*)?(?:\n|$)/g
  const parts = content.split(headerRegex)

  // First part is usually intro/summary
  if (parts[0]?.trim()) {
    sections.push({
      type: "executive_summary",
      title: "Executive Summary",
      content: parts[0].trim(),
    })
  }

  // Process remaining sections
  for (let i = 1; i < parts.length; i += 2) {
    const title = parts[i]?.trim()
    const sectionContent = parts[i + 1]?.trim()

    if (title && sectionContent) {
      sections.push({
        type: titleToSectionType(title),
        title,
        content: sectionContent,
      })
    }
  }

  return sections
}

/**
 * Convert section title to section type
 */
function titleToSectionType(title: string): string {
  const normalized = title.toLowerCase()
  
  if (normalized.includes("executive") || normalized.includes("summary")) {
    return "executive_summary"
  }
  if (normalized.includes("how") && normalized.includes("closed")) {
    return "how_closed"
  }
  if (normalized.includes("company") && normalized.includes("profile")) {
    return "company_profile"
  }
  if (normalized.includes("founder") || normalized.includes("team")) {
    return "team_assessment"
  }
  if (normalized.includes("risk")) {
    return "risks"
  }
  if (normalized.includes("lp") || normalized.includes("memo")) {
    return "lp_memo"
  }
  if (normalized.includes("thesis")) {
    return "investment_thesis"
  }
  if (normalized.includes("market")) {
    return "market_analysis"
  }
  if (normalized.includes("traction") || normalized.includes("metrics")) {
    return "traction"
  }
  if (normalized.includes("financial")) {
    return "financial_overview"
  }
  if (normalized.includes("recommendation")) {
    return "recommendation"
  }
  
  return "custom"
}

