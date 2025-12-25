import { auth } from "@clerk/nextjs/server"
import { createServerClient } from "@/lib/supabase/client"
import OnboardingStepper from "./stepper"

export default async function OnboardingPage() {
  const { userId } = auth()
  const supabase = createServerClient()

  const { data: onboarding } = await supabase
    .from("onboarding")
    .select("*, workspaces(name, workspace_type)")
    .eq("clerk_user_id", userId)
    .maybeSingle()

  const initialData = onboarding
    ? {
        ...onboarding,
        workspace_name: onboarding.workspaces?.name ?? null,
        workspace_type: onboarding.workspaces?.workspace_type ?? null,
      }
    : null

  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto w-full max-w-4xl space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">Welcome to Angel Lead</h1>
          <p className="text-muted-foreground">
            Tell us about your workspace and investing style so we can tailor
            your experience.
          </p>
        </div>
        <OnboardingStepper initialData={initialData} />
      </div>
    </main>
  )
}
