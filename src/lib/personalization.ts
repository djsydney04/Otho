/**
 * Personalization Logic
 * 
 * Applies user preferences from onboarding to customize the app experience.
 * This includes setting defaults for pipeline stages, AI tone, and Discover feed ranking.
 */

import type { OnboardingData, StageFocus, SectorFocus, AITone, DiscoverTopic } from "@/lib/types/onboarding"

// Map stage focus to pipeline stage defaults
const STAGE_FOCUS_TO_PIPELINE: Record<StageFocus, string[]> = {
  "Pre-seed": ["Inbound", "Qualified", "Diligence", "Committed", "Passed"],
  "Seed": ["Inbound", "Qualified", "Diligence", "Committed", "Passed"],
  "Series A": ["Inbound", "Qualified", "Diligence", "Committed", "Passed"],
  "Series B": ["Inbound", "Qualified", "Diligence", "Committed", "Passed"],
  "Growth": ["Inbound", "Qualified", "Diligence", "Committed", "Passed"],
  "Any": ["Inbound", "Qualified", "Diligence", "Committed", "Passed"],
}

// Map sector focus to Discover topic weights
const SECTOR_TO_DISCOVER_TOPICS: Record<SectorFocus, DiscoverTopic[]> = {
  "AI/ML": ["AI Frontier", "Breaking Deals", "Deep Dives"],
  "Fintech": ["Breaking Deals", "Market Signals", "Fund News"],
  "Healthcare": ["Breaking Deals", "Deep Dives", "Founder Intel"],
  "Consumer": ["Breaking Deals", "Founder Intel", "Market Signals"],
  "Enterprise": ["Breaking Deals", "Market Signals", "Deep Dives"],
  "Climate": ["Breaking Deals", "Deep Dives", "Market Signals"],
  "Crypto/Web3": ["Breaking Deals", "Market Signals", "AI Frontier"],
  "Defense": ["Breaking Deals", "Deep Dives", "Fund News"],
  "Biotech": ["Breaking Deals", "Deep Dives", "Founder Intel"],
  "Other": ["Breaking Deals", "Market Signals", "Deep Dives"],
}

// AI tone configurations
const AI_TONE_CONFIGS: Record<AITone, { maxTokens: number; temperature: number; style: string }> = {
  "Concise": {
    maxTokens: 256,
    temperature: 0.5,
    style: "Be brief and actionable. Give direct answers.",
  },
  "Analytical": {
    maxTokens: 512,
    temperature: 0.6,
    style: "Provide balanced analysis with key insights. Include relevant data points.",
  },
  "Deep-dive": {
    maxTokens: 1024,
    temperature: 0.7,
    style: "Provide comprehensive analysis with full context. Cover multiple angles and implications.",
  },
}

/**
 * Get personalized AI configuration based on user preferences.
 */
export function getAIConfig(aiTone: AITone | null): typeof AI_TONE_CONFIGS["Concise"] {
  return AI_TONE_CONFIGS[aiTone || "Concise"]
}

/**
 * Get personalized Discover feed topics based on user preferences.
 * Returns topics weighted by user's sector focus and explicit preferences.
 */
export function getDiscoverTopicRanking(
  sectorFocus: SectorFocus[],
  explicitTopics: DiscoverTopic[]
): DiscoverTopic[] {
  // Start with explicit preferences
  const topicsSet = new Set<DiscoverTopic>(explicitTopics)
  
  // Add implied topics from sector focus
  for (const sector of sectorFocus) {
    const implied = SECTOR_TO_DISCOVER_TOPICS[sector] || []
    for (const topic of implied) {
      topicsSet.add(topic)
    }
  }
  
  // Default topics if nothing selected
  if (topicsSet.size === 0) {
    return ["Breaking Deals", "AI Frontier", "Market Signals", "Deep Dives", "Founder Intel", "Fund News"]
  }
  
  return Array.from(topicsSet)
}

/**
 * Get personalized system prompt addition for Otho based on user profile.
 */
export function getPersonalizedPrompt(onboardingData: Partial<OnboardingData>): string {
  const parts: string[] = []
  
  // Role context
  if (onboardingData.role) {
    const roleContext: Record<string, string> = {
      "Angel": "an experienced angel investor",
      "Aspiring": "someone learning about angel investing",
      "Fund": "a venture capital fund professional",
      "Operator": "an operator and startup advisor",
      "Student": "someone learning about venture capital",
      "Other": "a professional in the startup ecosystem",
    }
    parts.push(`You are assisting ${roleContext[onboardingData.role] || "an investor"}.`)
  }
  
  // Investment context
  if (onboardingData.stage_focus?.length) {
    parts.push(`They focus on ${onboardingData.stage_focus.join(", ")} stage companies.`)
  }
  
  if (onboardingData.sector_focus?.length) {
    parts.push(`Their sector interests include: ${onboardingData.sector_focus.join(", ")}.`)
  }
  
  // Decision style
  if (onboardingData.decision_factors?.length) {
    parts.push(`Key factors they prioritize: ${onboardingData.decision_factors.join(", ")}.`)
  }
  
  // AI help focus
  if (onboardingData.ai_help_focus?.length) {
    parts.push(`They want help with: ${onboardingData.ai_help_focus.join(", ")}.`)
  }
  
  // AI tone
  const toneConfig = getAIConfig(onboardingData.ai_tone as AITone)
  parts.push(toneConfig.style)
  
  return parts.join(" ")
}

/**
 * Calculate Discover feed score for an article based on user preferences.
 * Higher score = more relevant to user.
 */
export function calculateArticleRelevance(
  articleTopics: string[],
  articleSectors: string[],
  userTopics: DiscoverTopic[],
  userSectors: SectorFocus[]
): number {
  let score = 0
  
  // Topic match
  for (const topic of articleTopics) {
    if (userTopics.includes(topic as DiscoverTopic)) {
      score += 10
    }
  }
  
  // Sector match
  for (const sector of articleSectors) {
    if (userSectors.includes(sector as SectorFocus)) {
      score += 5
    }
  }
  
  return score
}

/**
 * Get default notification settings based on onboarding.
 */
export function getNotificationDefaults(onboardingData: Partial<OnboardingData>) {
  return {
    emailAlerts: true,
    pushNotifications: false,
  }
}

/**
 * Export all personalization utilities.
 */
export const personalization = {
  getAIConfig,
  getDiscoverTopicRanking,
  getPersonalizedPrompt,
  calculateArticleRelevance,
  getNotificationDefaults,
}
