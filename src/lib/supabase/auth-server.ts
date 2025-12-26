/**
 * Server-side authentication utilities
 * 
 * Provides helpers for getting the current user and their onboarding status.
 * Uses Supabase Auth for authentication.
 */

import { createClient, getUser as getAuthUser } from "./server"
import type { User } from "./types"

export interface AuthUser {
  id: string
  email: string
  name: string
  image?: string | null
}

export interface UserWithOnboarding extends User {
  onboarding_status: string | null
  onboarding_step: number | null
}

/**
 * Get the current authenticated user from Supabase Auth session.
 * Returns null if not authenticated.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const user = await getAuthUser()
  
  if (!user) {
    return null
  }
  
  return {
    id: user.id,
    email: user.email || "",
    name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
    image: user.user_metadata?.avatar_url,
  }
}

/**
 * Get or create the user in Supabase database.
 * Ensures the user exists in the users table.
 */
export async function getOrCreateUser(): Promise<User | null> {
  const authUser = await getAuthUser()
  
  if (!authUser) {
    return null
  }
  
  const supabase = await createClient()
  
  // Try to find existing user
  const { data: existingUser, error: findError } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single()
  
  if (existingUser) {
    return existingUser
  }
  
  // Create new user if not found
  if (findError?.code === "PGRST116") { // No rows found
    const { data: newUser, error: createError } = await supabase
      .from("users")
      .insert({
        id: authUser.id,
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
      .select("*")
      .single()
    
    if (createError) {
      console.error("Error creating user:", createError)
      return null
    }
    
    return newUser
  }
  
  console.error("Error finding user:", findError)
  return null
}

/**
 * Get the current user's onboarding status.
 * Returns the user with onboarding fields, or null if not authenticated.
 */
export async function getOnboardingStatus(): Promise<UserWithOnboarding | null> {
  const user = await getOrCreateUser()
  
  if (!user) {
    return null
  }
  
  return user as UserWithOnboarding
}

/**
 * Check if user has completed onboarding.
 */
export async function hasCompletedOnboarding(): Promise<boolean> {
  const user = await getOnboardingStatus()
  return user?.onboarding_status === "complete"
}

/**
 * Get the user's current onboarding step (0-indexed).
 */
export async function getCurrentOnboardingStep(): Promise<number> {
  const user = await getOnboardingStatus()
  return user?.onboarding_step ?? 0
}
