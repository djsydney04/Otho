"use server"

import { auth, clerkClient } from "@clerk/nextjs/server"
import { createServerClient } from "@/lib/supabase/client"

const MONTHLY_AI_CREDITS = 500
const MONTHLY_ENRICHMENT_CREDITS = 200

export async function startOnboarding(formData: {
  workspaceName: string
  workspaceType: string
  plan: "hobby" | "angel" | "fund"
  fundContactEmail?: string
  fundContactNotes?: string
}) {
  const { userId } = auth()
  if (!userId) {
    throw new Error("Unauthorized")
  }

  const supabase = createServerClient()
  const user = await clerkClient.users.getUser(userId)
  const primaryEmail = user.emailAddresses?.[0]?.emailAddress

  const { data: existingOnboarding } = await supabase
    .from("onboarding")
    .select("workspace_id")
    .eq("clerk_user_id", userId)
    .maybeSingle()

  let workspaceId = existingOnboarding?.workspace_id ?? null

  if (!workspaceId) {
    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .insert({
        name: formData.workspaceName,
        owner_clerk_user_id: userId,
        plan: formData.plan,
        fund_enabled: false,
        workspace_type: formData.workspaceType,
      })
      .select("id")
      .single()

    if (workspaceError) {
      throw new Error(workspaceError.message)
    }

    workspaceId = workspace.id

    await supabase.from("workspace_members").insert({
      workspace_id: workspaceId,
      clerk_user_id: userId,
      role: "owner",
    })
  } else {
    await supabase
      .from("workspaces")
      .update({
        name: formData.workspaceName,
        plan: formData.plan,
        workspace_type: formData.workspaceType,
      })
      .eq("id", workspaceId)
  }

  await supabase.from("profiles").upsert({
    clerk_user_id: userId,
    default_workspace_id: workspaceId,
  })

  await supabase.from("onboarding").upsert({
    clerk_user_id: userId,
    workspace_id: workspaceId,
    status: "step1",
    selected_plan: formData.plan,
    fund_contact_email: formData.fundContactEmail ?? primaryEmail ?? null,
    fund_contact_notes: formData.fundContactNotes ?? null,
    monthly_ai_credits: MONTHLY_AI_CREDITS,
    monthly_enrichment_credits: MONTHLY_ENRICHMENT_CREDITS,
  })

  return { workspaceId }
}

export async function saveInvestorProfile(payload: {
  investor_type: string
  years_investing: string
  check_size: string
  deals_per_year: string
  stage_focus: string[]
  strategy: string[]
  core_sectors: string[]
  frontier_interests: string[]
  geography: string[]
}) {
  const { userId } = auth()
  if (!userId) {
    throw new Error("Unauthorized")
  }

  const supabase = createServerClient()

  await supabase
    .from("onboarding")
    .update({
      status: "step2",
      ...payload,
    })
    .eq("clerk_user_id", userId)
}

export async function saveDecisionWorkflow(payload: {
  decision_factors: string[]
  decision_speed: string
  deal_sourcing: string[]
  biggest_pain: string
}) {
  const { userId } = auth()
  if (!userId) {
    throw new Error("Unauthorized")
  }

  const supabase = createServerClient()

  await supabase
    .from("onboarding")
    .update({
      status: "step3",
      ...payload,
    })
    .eq("clerk_user_id", userId)
}

export async function saveIntegrations(payload: {
  integrations: string[]
}) {
  const { userId } = auth()
  if (!userId) {
    throw new Error("Unauthorized")
  }

  const supabase = createServerClient()

  await supabase
    .from("onboarding")
    .update({
      status: "step4",
      integrations: payload.integrations,
    })
    .eq("clerk_user_id", userId)
}

export async function savePreferences(payload: {
  discover_topics: string[]
  daily_digest: boolean
  ai_help: string[]
  ai_tone: string
}) {
  const { userId } = auth()
  if (!userId) {
    throw new Error("Unauthorized")
  }

  const supabase = createServerClient()

  await supabase
    .from("onboarding")
    .update({
      status: "step5",
      ...payload,
    })
    .eq("clerk_user_id", userId)
}

export async function completeOnboarding() {
  const { userId } = auth()
  if (!userId) {
    throw new Error("Unauthorized")
  }

  const supabase = createServerClient()

  const { data: onboarding } = await supabase
    .from("onboarding")
    .select("workspace_id")
    .eq("clerk_user_id", userId)
    .maybeSingle()

  await supabase
    .from("onboarding")
    .update({ status: "complete" })
    .eq("clerk_user_id", userId)

  if (onboarding?.workspace_id) {
    await supabase
      .from("profiles")
      .update({ default_workspace_id: onboarding.workspace_id })
      .eq("clerk_user_id", userId)
  }
}
