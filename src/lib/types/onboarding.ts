/**
 * Onboarding Types
 * 
 * Type definitions for the onboarding flow and user preferences.
 */

// Onboarding step identifiers
export type OnboardingStep = 'basics' | 'investing' | 'decision' | 'preferences'

export const ONBOARDING_STEPS: OnboardingStep[] = ['basics', 'investing', 'decision', 'preferences']

// Section A: Basics
export type UserRole = 'Angel' | 'Aspiring' | 'Fund' | 'Operator' | 'Student' | 'Other'

export type PrimaryGoal = 'Pipeline' | 'Founder CRM' | 'Research' | 'Memos' | 'Learn'

export type SignupSource = 'Friend' | 'X' | 'Newsletter' | 'Exploring' | 'Other'

// Section B: Investing Context
export type InvestingStatus = 'Yes' | 'Occasionally' | 'Not yet' | 'Exploring'

export type CheckSize = 
  | 'Under $10k'
  | '$10k - $25k'
  | '$25k - $50k'
  | '$50k - $100k'
  | '$100k - $250k'
  | '$250k+'

export type DealsPerYear = 
  | 'None yet'
  | '1-2'
  | '3-5'
  | '6-10'
  | '10+'

export type StageFocus = 
  | 'Pre-seed'
  | 'Seed'
  | 'Series A'
  | 'Series B'
  | 'Growth'
  | 'Any'

export type SectorFocus = 
  | 'AI/ML'
  | 'Fintech'
  | 'Healthcare'
  | 'Consumer'
  | 'Enterprise'
  | 'Climate'
  | 'Crypto/Web3'
  | 'Defense'
  | 'Biotech'
  | 'Other'

export type GeoFocus = 
  | 'US - Bay Area'
  | 'US - NYC'
  | 'US - Other'
  | 'Europe'
  | 'Asia'
  | 'LATAM'
  | 'Global'

// Section C: Decision Style
export type DecisionFactor = 
  | 'Founder quality'
  | 'Market size'
  | 'Traction'
  | 'Product'
  | 'Competition'
  | 'Valuation'
  | 'Team'
  | 'Timing'

export type DecisionSpeed = 
  | 'Days'
  | '1-2 weeks'
  | '1 month+'
  | 'Opportunistic'

export type SourcingChannel = 
  | 'AngelList'
  | 'Twitter/X'
  | 'LinkedIn'
  | 'Referrals'
  | 'Cold inbound'
  | 'Demo days'
  | 'Accelerators'
  | 'VC co-invest'

export type BiggestPain = 
  | 'Finding deals'
  | 'Evaluating deals'
  | 'Tracking pipeline'
  | 'Founder communication'
  | 'Due diligence'
  | 'Portfolio management'

// Section D: Preferences
export type DiscoverTopic = 
  | 'Breaking Deals'
  | 'AI Frontier'
  | 'Market Signals'
  | 'Deep Dives'
  | 'Founder Intel'
  | 'Fund News'

export type AIHelpFocus = 
  | 'Deal analysis'
  | 'Research'
  | 'Writing memos'
  | 'Market research'
  | 'Competitor analysis'
  | 'Due diligence'

export type AITone = 'Concise' | 'Analytical' | 'Deep-dive'

// Full onboarding data structure
export interface OnboardingData {
  // Section A: Basics
  role: UserRole | null
  user_location: string | null
  primary_goals: PrimaryGoal[]
  signup_source: SignupSource | null
  
  // Section B: Investing Context
  actively_investing: InvestingStatus | null
  invested_before: boolean | null
  check_size: CheckSize | null
  deals_per_year: DealsPerYear | null
  stage_focus: StageFocus[]
  sector_focus: SectorFocus[]
  geo_focus: GeoFocus[]
  
  // Section C: Decision Style
  decision_factors: DecisionFactor[]
  decision_speed: DecisionSpeed | null
  sourcing_channels: SourcingChannel[]
  biggest_pain: BiggestPain | null
  
  // Section D: Preferences
  discover_topics: DiscoverTopic[]
  ai_help_focus: AIHelpFocus[]
  ai_tone: AITone | null
}

// Form state for each step
export interface BasicsFormData {
  role: UserRole | null
  user_location: string
  primary_goals: PrimaryGoal[]
  signup_source: SignupSource | null
}

export interface InvestingFormData {
  actively_investing: InvestingStatus | null
  invested_before: boolean | null
  check_size: CheckSize | null
  deals_per_year: DealsPerYear | null
  stage_focus: StageFocus[]
  sector_focus: SectorFocus[]
  geo_focus: GeoFocus[]
}

export interface DecisionFormData {
  decision_factors: DecisionFactor[]
  decision_speed: DecisionSpeed | null
  sourcing_channels: SourcingChannel[]
  biggest_pain: BiggestPain | null
}

export interface PreferencesFormData {
  discover_topics: DiscoverTopic[]
  ai_help_focus: AIHelpFocus[]
  ai_tone: AITone | null
}

// Onboarding progress state
export interface OnboardingProgress {
  currentStep: number
  data: Partial<OnboardingData>
  status: 'incomplete' | 'complete'
}

// Option configurations for UI
export const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'Angel', label: 'Angel Investor' },
  { value: 'Aspiring', label: 'Aspiring Investor' },
  { value: 'Fund', label: 'Fund / VC' },
  { value: 'Operator', label: 'Operator / Advisor' },
  { value: 'Student', label: 'Student' },
  { value: 'Other', label: 'Other' },
]

export const PRIMARY_GOAL_OPTIONS: { value: PrimaryGoal; label: string }[] = [
  { value: 'Pipeline', label: 'Track my deal pipeline' },
  { value: 'Founder CRM', label: 'Manage founder relationships' },
  { value: 'Research', label: 'Research companies & markets' },
  { value: 'Memos', label: 'Write investment memos' },
  { value: 'Learn', label: 'Learn about investing' },
]

export const SIGNUP_SOURCE_OPTIONS: { value: SignupSource; label: string }[] = [
  { value: 'Friend', label: 'Friend / Referral' },
  { value: 'X', label: 'X (Twitter)' },
  { value: 'Newsletter', label: 'Newsletter' },
  { value: 'Exploring', label: 'Just exploring' },
  { value: 'Other', label: 'Other' },
]

export const INVESTING_STATUS_OPTIONS: { value: InvestingStatus; label: string }[] = [
  { value: 'Yes', label: 'Yes, actively investing' },
  { value: 'Occasionally', label: 'Occasionally' },
  { value: 'Not yet', label: 'Not yet, but planning to' },
  { value: 'Exploring', label: 'Just exploring' },
]

export const CHECK_SIZE_OPTIONS: { value: CheckSize; label: string }[] = [
  { value: 'Under $10k', label: 'Under $10k' },
  { value: '$10k - $25k', label: '$10k - $25k' },
  { value: '$25k - $50k', label: '$25k - $50k' },
  { value: '$50k - $100k', label: '$50k - $100k' },
  { value: '$100k - $250k', label: '$100k - $250k' },
  { value: '$250k+', label: '$250k+' },
]

export const DEALS_PER_YEAR_OPTIONS: { value: DealsPerYear; label: string }[] = [
  { value: 'None yet', label: 'None yet' },
  { value: '1-2', label: '1-2 deals' },
  { value: '3-5', label: '3-5 deals' },
  { value: '6-10', label: '6-10 deals' },
  { value: '10+', label: '10+ deals' },
]

export const STAGE_FOCUS_OPTIONS: { value: StageFocus; label: string }[] = [
  { value: 'Pre-seed', label: 'Pre-seed' },
  { value: 'Seed', label: 'Seed' },
  { value: 'Series A', label: 'Series A' },
  { value: 'Series B', label: 'Series B' },
  { value: 'Growth', label: 'Growth' },
  { value: 'Any', label: 'Stage agnostic' },
]

export const SECTOR_FOCUS_OPTIONS: { value: SectorFocus; label: string }[] = [
  { value: 'AI/ML', label: 'AI / Machine Learning' },
  { value: 'Fintech', label: 'Fintech' },
  { value: 'Healthcare', label: 'Healthcare' },
  { value: 'Consumer', label: 'Consumer' },
  { value: 'Enterprise', label: 'Enterprise / B2B' },
  { value: 'Climate', label: 'Climate / Cleantech' },
  { value: 'Crypto/Web3', label: 'Crypto / Web3' },
  { value: 'Defense', label: 'Defense Tech' },
  { value: 'Biotech', label: 'Biotech' },
  { value: 'Other', label: 'Other / Generalist' },
]

export const GEO_FOCUS_OPTIONS: { value: GeoFocus; label: string }[] = [
  { value: 'US - Bay Area', label: 'US - Bay Area' },
  { value: 'US - NYC', label: 'US - NYC' },
  { value: 'US - Other', label: 'US - Other' },
  { value: 'Europe', label: 'Europe' },
  { value: 'Asia', label: 'Asia' },
  { value: 'LATAM', label: 'Latin America' },
  { value: 'Global', label: 'Global / No preference' },
]

export const DECISION_FACTOR_OPTIONS: { value: DecisionFactor; label: string }[] = [
  { value: 'Founder quality', label: 'Founder quality' },
  { value: 'Market size', label: 'Market size' },
  { value: 'Traction', label: 'Traction / Revenue' },
  { value: 'Product', label: 'Product quality' },
  { value: 'Competition', label: 'Competitive landscape' },
  { value: 'Valuation', label: 'Valuation' },
  { value: 'Team', label: 'Team composition' },
  { value: 'Timing', label: 'Market timing' },
]

export const DECISION_SPEED_OPTIONS: { value: DecisionSpeed; label: string }[] = [
  { value: 'Days', label: 'A few days' },
  { value: '1-2 weeks', label: '1-2 weeks' },
  { value: '1 month+', label: 'A month or more' },
  { value: 'Opportunistic', label: 'Depends on the deal' },
]

export const SOURCING_CHANNEL_OPTIONS: { value: SourcingChannel; label: string }[] = [
  { value: 'AngelList', label: 'AngelList' },
  { value: 'Twitter/X', label: 'Twitter / X' },
  { value: 'LinkedIn', label: 'LinkedIn' },
  { value: 'Referrals', label: 'Personal referrals' },
  { value: 'Cold inbound', label: 'Cold inbound' },
  { value: 'Demo days', label: 'Demo days' },
  { value: 'Accelerators', label: 'Accelerators' },
  { value: 'VC co-invest', label: 'VC co-invest' },
]

export const BIGGEST_PAIN_OPTIONS: { value: BiggestPain; label: string }[] = [
  { value: 'Finding deals', label: 'Finding quality deals' },
  { value: 'Evaluating deals', label: 'Evaluating deals quickly' },
  { value: 'Tracking pipeline', label: 'Keeping track of pipeline' },
  { value: 'Founder communication', label: 'Staying in touch with founders' },
  { value: 'Due diligence', label: 'Doing thorough diligence' },
  { value: 'Portfolio management', label: 'Managing portfolio' },
]

export const DISCOVER_TOPIC_OPTIONS: { value: DiscoverTopic; label: string }[] = [
  { value: 'Breaking Deals', label: 'Breaking Deals' },
  { value: 'AI Frontier', label: 'AI Frontier' },
  { value: 'Market Signals', label: 'Market Signals' },
  { value: 'Deep Dives', label: 'Deep Dives' },
  { value: 'Founder Intel', label: 'Founder Intel' },
  { value: 'Fund News', label: 'Fund News' },
]

export const AI_HELP_FOCUS_OPTIONS: { value: AIHelpFocus; label: string }[] = [
  { value: 'Deal analysis', label: 'Analyzing deals' },
  { value: 'Research', label: 'Research assistance' },
  { value: 'Writing memos', label: 'Writing memos' },
  { value: 'Market research', label: 'Market research' },
  { value: 'Competitor analysis', label: 'Competitor analysis' },
  { value: 'Due diligence', label: 'Due diligence help' },
]

export const AI_TONE_OPTIONS: { value: AITone; label: string; description: string }[] = [
  { value: 'Concise', label: 'Concise', description: 'Short, actionable responses' },
  { value: 'Analytical', label: 'Analytical', description: 'Balanced detail with analysis' },
  { value: 'Deep-dive', label: 'Deep-dive', description: 'Comprehensive, thorough responses' },
]
