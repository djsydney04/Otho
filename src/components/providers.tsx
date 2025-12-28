"use client"

import { OthoProvider } from "@/components/otho/otho-provider"
import { OnboardingGate } from "@/components/onboarding-gate"
import { ScrollToTop } from "@/components/scroll-to-top"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <OnboardingGate>
      <OthoProvider>
        <ScrollToTop />
        {children}
      </OthoProvider>
    </OnboardingGate>
  )
}
