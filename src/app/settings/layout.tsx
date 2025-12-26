"use client"

import { ReactNode } from "react"
import { Sidebar } from "@/components/pipeline/sidebar"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface SettingsLayoutProps {
  children: ReactNode
}

const settingsNav = [
  { href: "/settings", label: "Account" },
  { href: "/settings/billing", label: "Billing" },
  { href: "/settings/security", label: "Security" },
  { href: "/settings/integrations", label: "Integrations" },
  { href: "/settings/team", label: "Team & Org" },
]

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar activePage="home" />
      <div className="flex-1 flex overflow-hidden">
        {/* Settings Sidebar */}
        <aside className="w-64 border-r bg-card/30 overflow-y-auto">
          <div className="p-6">
            <h2 className="font-display text-lg font-semibold mb-6">Settings</h2>
            <nav className="space-y-1">
              {settingsNav.map((item) => (
                <SettingsNavLink key={item.href} href={item.href}>
                  {item.label}
                </SettingsNavLink>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

function SettingsNavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname()
  const isActive = pathname === href
  
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? "bg-primary/10 text-primary font-semibold"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
      }`}
    >
      <span>{children}</span>
    </Link>
  )
}

