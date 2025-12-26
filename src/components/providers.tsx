"use client"

import { OthoProvider } from "@/components/otho/otho-provider"
import { OnboardingGate } from "@/components/onboarding-gate"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <OnboardingGate>
      <OthoProvider>{children}</OthoProvider>
    </OnboardingGate>
  )
}
