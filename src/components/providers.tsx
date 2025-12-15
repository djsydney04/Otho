"use client"

import { SessionProvider } from "next-auth/react"
import { OthoProvider } from "@/components/otho/otho-provider"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <OthoProvider>{children}</OthoProvider>
    </SessionProvider>
  )
}

