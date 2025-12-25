import { auth, clerkClient } from "@clerk/nextjs/server"

export async function getAuthenticatedUser() {
  const { userId } = auth()
  if (!userId) return null
  return clerkClient.users.getUser(userId)
}

export function getAuthenticatedUserId() {
  const { userId } = auth()
  return userId ?? null
}
