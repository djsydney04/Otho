/**
 * Tier enforcement utilities
 * Check user subscription tier and enforce limits
 */

export type SubscriptionTier = "hobby" | "angel" | "fund"

export interface TierLimits {
  maxContacts: number | null // null = unlimited
  allowsMultiUser: boolean
  allowsGoogleIntegrations: boolean
  allowsPortfolioAwareAI: boolean
  allowsOrgFeatures: boolean
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  hobby: {
    maxContacts: 30,
    allowsMultiUser: false,
    allowsGoogleIntegrations: false,
    allowsPortfolioAwareAI: false,
    allowsOrgFeatures: false,
  },
  angel: {
    maxContacts: null, // unlimited
    allowsMultiUser: false,
    allowsGoogleIntegrations: true,
    allowsPortfolioAwareAI: true,
    allowsOrgFeatures: false,
  },
  fund: {
    maxContacts: null, // unlimited
    allowsMultiUser: true,
    allowsGoogleIntegrations: true,
    allowsPortfolioAwareAI: true,
    allowsOrgFeatures: true,
  },
}

/**
 * Get user's subscription tier from billing_info
 * Works with both server and client Supabase instances
 */
export async function getUserTier(userId: string, supabase: any): Promise<SubscriptionTier> {
  try {
    const { data: billing } = await supabase
      .from("billing_info")
      .select("plan, subscription_status")
      .eq("user_id", userId)
      .single()

    if (!billing) {
      return "hobby" // Default to hobby
    }

    // If subscription is active, use the plan; otherwise default to hobby
    if (billing.subscription_status === "active" || billing.subscription_status === "trialing") {
      return (billing.plan as SubscriptionTier) || "hobby"
    }

    return "hobby"
  } catch (error) {
    console.error("Error getting user tier:", error)
    return "hobby" // Default to hobby on error
  }
}

/**
 * Check if user can create another contact
 */
export async function canCreateContact(userId: string, supabase: any): Promise<{ allowed: boolean; reason?: string }> {
  const tier = await getUserTier(userId, supabase)
  const limits = TIER_LIMITS[tier]

  if (limits.maxContacts === null) {
    return { allowed: true }
  }

  // Count existing contacts (companies + founders)
  const [companiesResult, foundersResult] = await Promise.all([
    supabase.from("companies").select("id", { count: "exact", head: true }).eq("owner_id", userId),
    supabase.from("founders").select("id", { count: "exact", head: true }),
  ])

  const companyCount = companiesResult.count || 0
  const founderCount = foundersResult.count || 0
  const totalContacts = companyCount + founderCount

  if (totalContacts >= limits.maxContacts) {
    return {
      allowed: false,
      reason: `You've reached your limit of ${limits.maxContacts} contacts. Upgrade to Angel for unlimited contacts.`,
    }
  }

  return { allowed: true }
}

/**
 * Check if user can use multi-user/org features
 */
export async function canUseOrgFeatures(userId: string, supabase: any): Promise<{ allowed: boolean; reason?: string }> {
  const tier = await getUserTier(userId, supabase)
  const limits = TIER_LIMITS[tier]

  if (!limits.allowsOrgFeatures) {
    return {
      allowed: false,
      reason: "Organization features require a Fund plan. Contact us to upgrade.",
    }
  }

  return { allowed: true }
}

/**
 * Check if user can use Google integrations
 */
export async function canUseGoogleIntegrations(userId: string, supabase: any): Promise<{ allowed: boolean; reason?: string }> {
  const tier = await getUserTier(userId, supabase)
  const limits = TIER_LIMITS[tier]

  if (!limits.allowsGoogleIntegrations) {
    return {
      allowed: false,
      reason: "Google integrations require an Angel plan or higher. Upgrade to unlock this feature.",
    }
  }

  return { allowed: true }
}

/**
 * Check if user can use portfolio-aware AI
 */
export async function canUsePortfolioAwareAI(userId: string, supabase: any): Promise<{ allowed: boolean; reason?: string }> {
  const tier = await getUserTier(userId, supabase)
  const limits = TIER_LIMITS[tier]

  if (!limits.allowsPortfolioAwareAI) {
    return {
      allowed: false,
      reason: "Portfolio-aware AI requires an Angel plan or higher. Upgrade to unlock this feature.",
    }
  }

  return { allowed: true }
}

