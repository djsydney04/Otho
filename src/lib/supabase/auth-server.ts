/**
 * Server-Side Authentication Utilities
 * 
 * This module provides server-side authentication helpers for Next.js Server Components and API Routes.
 * 
 * Key Features:
 * - Get authenticated user from Supabase Auth session
 * - Auto-create user records in the database
 * - Check onboarding status
 * - Sync auth.users with public.users table
 * 
 * Usage:
 * ```tsx
 * // In a Server Component or API Route
 * import { getCurrentUser, getOnboardingStatus } from '@/lib/supabase/auth-server'
 * 
 * const user = await getCurrentUser()
 * if (!user) redirect('/sign-in')
 * ```
 * 
 * Note: This uses Supabase's server client which handles cookies automatically.
 */

import { createClient, getUser as getAuthUser } from "./server"
import type { User } from "./types"

/**
 * Simplified auth user for display purposes
 * Contains only the essential fields needed for UI
 */
export interface AuthUser {
  id: string
  email: string
  name: string
  image?: string | null
}

/**
 * User with onboarding fields
 * Extends the full User type with onboarding-specific fields
 */
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
 * Get or Create User in Database
 * 
 * This function ensures that every authenticated user has a corresponding record
 * in the public.users table. This is important because:
 * 
 * 1. Supabase Auth stores users in auth.users (system table)
 * 2. We need user data in public.users for:
 *    - Onboarding status tracking
 *    - User preferences and settings
 *    - Relationships with companies/founders
 * 
 * Flow:
 * 1. Check if user exists in public.users
 * 2. If yes, return existing user
 * 3. If no, create new user record with default values
 * 4. Set onboarding_status to "incomplete" for new users
 * 
 * Note: There's also a database trigger (005_sync_auth_users.sql) that
 * automatically creates users, but this provides a fallback.
 * 
 * @returns User record from public.users table or null if not authenticated
 */
export async function getOrCreateUser(): Promise<User | null> {
  const authUser = await getAuthUser()
  
  if (!authUser) {
    return null
  }
  
  const supabase = await createClient()
  
  // Try to find existing user in public.users table
  const { data: existingUser, error: findError } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single()
  
  if (existingUser) {
    return existingUser
  }
  
  // Create new user if not found (PGRST116 = no rows returned)
  if (findError?.code === "PGRST116") {
    const { data: newUser, error: createError } = await supabase
      .from("users")
      .insert({
        id: authUser.id,
        email: authUser.email!,
        name: authUser.user_metadata?.full_name || authUser.email!.split("@")[0],
        avatar_url: authUser.user_metadata?.avatar_url,
        // Generate initials from name (e.g., "John Doe" → "JD")
        initials: (authUser.user_metadata?.full_name || authUser.email!.split("@")[0])
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2),
        onboarding_status: "incomplete", // New users need to complete onboarding
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
