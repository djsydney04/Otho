import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getOnboardingStatus } from "@/lib/data/onboarding"
import { getWorkspaceForUser } from "@/lib/data/workspaces"

function FundContactBlock() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12 text-center">
      <div className="max-w-xl space-y-4">
        <h1 className="text-3xl font-semibold">Your fund plan is pending</h1>
        <p className="text-muted-foreground">
          Thanks for choosing the Fund plan. We need to enable it before you can
          access the app. Our team will reach out shortly.
        </p>
        <p className="text-sm text-muted-foreground">
          Need help sooner? Email us at{" "}
          <a className="text-primary underline" href="mailto:hello@angellead.com">
            hello@angellead.com
          </a>
          .
        </p>
      </div>
    </main>
  )
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = auth()

  if (!userId) {
    redirect("/sign-in")
  }

  const onboarding = await getOnboardingStatus(userId)

  if (!onboarding || onboarding.status !== "complete") {
    redirect("/onboarding")
  }

  const workspace = await getWorkspaceForUser(userId)

  if (workspace?.plan === "fund" && !workspace.fund_enabled) {
    return <FundContactBlock />
  }

  return <>{children}</>
}
