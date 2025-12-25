import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getOnboardingStatus } from "@/lib/data/onboarding"

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = auth()

  if (!userId) {
    redirect("/sign-in")
  }

  const onboarding = await getOnboardingStatus(userId)

  if (onboarding?.status === "complete") {
    redirect("/pipeline")
  }

  return <>{children}</>
}
