"use server"

/**
 * Server Actions for Onboarding
 * 
 * These actions handle saving and retrieving onboarding progress,
 * using Supabase Auth for authentication and Supabase for storage.
 */

import { createClient } from "@/lib/supabase/server"
import type { OnboardingData, OnboardingProgress } from "@/lib/types/onboarding"

/**
 * Get the current user's ID from Supabase Auth.
 * Throws an error if not authenticated.
 */
async function getCurrentUserId(): Promise<string> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    throw new Error("Not authenticated")
  }
  
  return user.id
}

/**
 * Get the current onboarding progress for the user.
 * Returns the current step and all saved data.
 * Creates user record if it doesn't exist.
 */
export async function getOnboardingProgress(): Promise<OnboardingProgress> {
  const supabase = await createClient()
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !authUser) {
    throw new Error("Not authenticated")
  }
  
  const userId = authUser.id
  
  const { data: user, error } = await supabase
    .from("users")
    .select(`
      onboarding_status,
      onboarding_step,
      role,
      user_location,
      signup_source,
      primary_goals,
      actively_investing,
      invested_before,
      check_size,
      deals_per_year,
      stage_focus,
      sector_focus,
      geo_focus,
      decision_factors,
      decision_speed,
      sourcing_channels,
      biggest_pain,
      discover_topics,
      ai_help_focus,
      ai_tone
    `)
    .eq("id", userId)
    .single()
  
  if (error && error.code === "PGRST116") {
    // User doesn't exist yet, create them
    const { error: insertError } = await supabase
      .from("users")
      .insert({
        id: userId,
        email: authUser.email!,
        name: authUser.user_metadata?.full_name || authUser.email!.split("@")[0],
        avatar_url: authUser.user_metadata?.avatar_url,
        initials: (authUser.user_metadata?.full_name || authUser.email!.split("@")[0])
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2),
        onboarding_status: "incomplete",
        onboarding_step: 0,
      })
    
    if (insertError) {
      console.error("Error creating user:", insertError)
    }
    
    // Return empty progress for new user
    return {
      currentStep: 0,
      data: {},
      status: "incomplete",
    }
  }
  
  if (error || !user) {
    // Other error, return empty progress
    return {
      currentStep: 0,
      data: {},
      status: "incomplete",
    }
  }
  
  return {
    currentStep: user.onboarding_step ?? 0,
    status: (user.onboarding_status as "incomplete" | "complete") ?? "incomplete",
    data: {
      role: user.role as any,
      user_location: user.user_location,
      signup_source: user.signup_source as any,
      primary_goals: (user.primary_goals ?? []) as any,
      actively_investing: user.actively_investing as any,
      invested_before: user.invested_before,
      check_size: user.check_size as any,
      deals_per_year: user.deals_per_year as any,
      stage_focus: (user.stage_focus ?? []) as any,
      sector_focus: (user.sector_focus ?? []) as any,
      geo_focus: (user.geo_focus ?? []) as any,
      decision_factors: (user.decision_factors ?? []) as any,
      decision_speed: user.decision_speed as any,
      sourcing_channels: (user.sourcing_channels ?? []) as any,
      biggest_pain: user.biggest_pain as any,
      discover_topics: (user.discover_topics ?? []) as any,
      ai_help_focus: (user.ai_help_focus ?? []) as any,
      ai_tone: user.ai_tone as any,
    },
  }
}

/**
 * Save progress for a specific onboarding step.
 * Auto-saves partial data and updates the current step.
 * Uses upsert to ensure user record exists.
 */
export async function saveOnboardingStep(
  step: number,
  data: Partial<OnboardingData>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { success: false, error: "Not authenticated" }
    }
    
    const userId = user.id
    
    // Build the update object with only non-undefined values
    const updateData: Record<string, any> = {
      id: userId,
      email: user.email!,
      name: user.user_metadata?.full_name || user.email!.split("@")[0],
      onboarding_step: step,
      updated_at: new Date().toISOString(),
    }
    
    // Map onboarding data fields to database columns
    if (data.role !== undefined) updateData.role = data.role
    if (data.user_location !== undefined) updateData.user_location = data.user_location
    if (data.signup_source !== undefined) updateData.signup_source = data.signup_source
    if (data.primary_goals !== undefined) updateData.primary_goals = data.primary_goals
    if (data.actively_investing !== undefined) updateData.actively_investing = data.actively_investing
    if (data.invested_before !== undefined) updateData.invested_before = data.invested_before
    if (data.check_size !== undefined) updateData.check_size = data.check_size
    if (data.deals_per_year !== undefined) updateData.deals_per_year = data.deals_per_year
    if (data.stage_focus !== undefined) updateData.stage_focus = data.stage_focus
    if (data.sector_focus !== undefined) updateData.sector_focus = data.sector_focus
    if (data.geo_focus !== undefined) updateData.geo_focus = data.geo_focus
    if (data.decision_factors !== undefined) updateData.decision_factors = data.decision_factors
    if (data.decision_speed !== undefined) updateData.decision_speed = data.decision_speed
    if (data.sourcing_channels !== undefined) updateData.sourcing_channels = data.sourcing_channels
    if (data.biggest_pain !== undefined) updateData.biggest_pain = data.biggest_pain
    if (data.discover_topics !== undefined) updateData.discover_topics = data.discover_topics
    if (data.ai_help_focus !== undefined) updateData.ai_help_focus = data.ai_help_focus
    if (data.ai_tone !== undefined) updateData.ai_tone = data.ai_tone
    
    const { error } = await supabase
      .from("users")
      .upsert(updateData, {
        onConflict: "id",
        ignoreDuplicates: false,
      })
    
    if (error) {
      console.error("Error saving onboarding step:", error)
      return { success: false, error: error.message }
    }
    
    return { success: true }
  } catch (err: any) {
    console.error("Error in saveOnboardingStep:", err)
    return { success: false, error: err.message }
  }
}

/**
 * Mark onboarding as complete.
 * Sets the status to "complete" and records the completion timestamp.
 * Uses upsert to ensure user record exists.
 */
export async function completeOnboarding(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { success: false, error: "Not authenticated" }
    }
    
    const userId = user.id
    
    const { error } = await supabase
      .from("users")
      .upsert({
        id: userId,
        email: user.email!,
        name: user.user_metadata?.full_name || user.email!.split("@")[0],
        onboarding_status: "complete",
        onboarding_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "id",
        ignoreDuplicates: false,
      })
    
    if (error) {
      console.error("Error completing onboarding:", error)
      return { success: false, error: error.message }
    }
    
    return { success: true }
  } catch (err: any) {
    console.error("Error in completeOnboarding:", err)
    return { success: false, error: err.message }
  }
}

/**
 * Reset onboarding to start over.
 * Useful for testing or if user wants to redo onboarding.
 */
export async function resetOnboarding(): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getCurrentUserId()
    const supabase = await createClient()
    
    const { error } = await supabase
      .from("users")
      .update({
        onboarding_status: "incomplete",
        onboarding_step: 0,
        onboarding_completed_at: null,
        role: null,
        user_location: null,
        signup_source: null,
        primary_goals: [],
        actively_investing: null,
        invested_before: null,
        check_size: null,
        deals_per_year: null,
        stage_focus: [],
        sector_focus: [],
        geo_focus: [],
        decision_factors: [],
        decision_speed: null,
        sourcing_channels: [],
        biggest_pain: null,
        discover_topics: [],
        ai_help_focus: [],
        ai_tone: "Concise",
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
    
    if (error) {
      console.error("Error resetting onboarding:", error)
      return { success: false, error: error.message }
    }
    
    return { success: true }
  } catch (err: any) {
    console.error("Error in resetOnboarding:", err)
    return { success: false, error: err.message }
  }
}
