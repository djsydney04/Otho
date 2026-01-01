"use client"

import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAppStore, syncCalendar, syncEmails } from "@/lib/store"
import { useAuth } from "@/lib/hooks/use-auth"
import {
  HomeIcon,
  OthoIcon,
  LayoutIcon,
  UsersIcon,
  DiscoverIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SettingsIcon,
  UserIcon,
  CreditCardIcon,
  ShieldIcon,
  PlugIcon,
  LogOutIcon,
} from "./icons"

// Team icon component
function TeamIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  )
}

type SidebarItemProps = {
  label: string
  icon: React.ReactNode
  active?: boolean
  href?: string
  collapsed?: boolean
}

function SidebarItem({ label, icon, active, href, collapsed }: SidebarItemProps) {
  const className = [
    "flex items-center rounded-lg text-left text-sm transition-all duration-200",
    collapsed ? "w-10 h-10 justify-center" : "w-full gap-2.5 px-3 py-2",
    active
      ? "bg-[rgba(212,168,83,0.1)] text-foreground font-medium border-l-2 border-[#d4a853] -ml-px pl-[calc(0.75rem+1px)]"
      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
  ].join(" ")

  if (href) {
    return (
      <Link href={href} className={className} title={collapsed ? label : undefined}>
        {icon}
        {!collapsed && label}
      </Link>
    )
  }

  return null
}

interface SidebarProps {
  activePage?: "home" | "otho" | "pipeline" | "founders" | "discover" | "reports"
  defaultCollapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}

export function Sidebar({ activePage = "home", defaultCollapsed = false, onCollapsedChange }: SidebarProps) {
  const { user, loading, signOut } = useAuth()
  const { sidebarCollapsed, setSidebarCollapsed } = useAppStore()

  // Use store state or prop default
  const isCollapsed = sidebarCollapsed ?? defaultCollapsed

  const toggleCollapsed = () => {
    const newValue = !isCollapsed
    setSidebarCollapsed(newValue)
    onCollapsedChange?.(newValue)
  }


  return (
    <aside 
      className={`flex flex-col h-screen sticky top-0 border-r bg-sidebar flex-shrink-0 transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Header */}
      <div className={`flex h-14 items-center border-b ${isCollapsed ? "justify-center px-2" : "justify-between px-4"}`}>
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#d4a853] text-white text-sm font-semibold flex-shrink-0">
            O
          </div>
          {!isCollapsed && (
          <span className="font-display text-lg font-semibold tracking-tight">
              Otho
          </span>
          )}
        </Link>
        {!isCollapsed && (
          <button
            onClick={toggleCollapsed}
            className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title="Collapse sidebar"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {isCollapsed && (
        <div className="px-3 py-3">
          <button
            onClick={toggleCollapsed}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title="Expand sidebar"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto ${isCollapsed ? "px-3 py-2" : "px-3 py-4"}`}>
        <div className={isCollapsed ? "space-y-2 flex flex-col items-center" : "space-y-0.5"}>
          <SidebarItem 
            label="Home" 
            icon={<HomeIcon className="h-4 w-4 flex-shrink-0" />} 
            active={activePage === "home"}
            href="/"
            collapsed={isCollapsed}
          />
          <SidebarItem 
            label="Otho" 
            icon={<OthoIcon className="h-4 w-4 flex-shrink-0" />} 
            active={activePage === "otho"}
            href="/otho"
            collapsed={isCollapsed}
          />
          <SidebarItem 
            label="Discover" 
            icon={<DiscoverIcon className="h-4 w-4 flex-shrink-0" />} 
            active={activePage === "discover"}
            href="/discover"
            collapsed={isCollapsed}
          />
          <SidebarItem 
            label="Pipeline" 
            icon={<LayoutIcon className="h-4 w-4 flex-shrink-0" />} 
            active={activePage === "pipeline"}
            href="/pipeline"
            collapsed={isCollapsed}
          />
          <SidebarItem 
            label="Founders" 
            icon={<UsersIcon className="h-4 w-4 flex-shrink-0" />}
            active={activePage === "founders"}
            href="/founders"
            collapsed={isCollapsed}
          />
          <SidebarItem 
            label="Reports" 
            icon={
              <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
            active={activePage === "reports"}
            href="/reports"
            collapsed={isCollapsed}
          />
        </div>
      </nav>

      {/* Footer */}
      <div className={`border-t flex-shrink-0 ${isCollapsed ? "p-2 flex justify-center" : "p-3"}`}>
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`w-full flex items-center ${isCollapsed ? "justify-center" : "gap-2.5 rounded-lg px-2 py-1.5 hover:bg-secondary/50 transition-colors"}`}>
                <Avatar className="h-8 w-8 border flex-shrink-0 cursor-pointer">
                  <AvatarImage src={user.user_metadata?.avatar_url || undefined} />
              <AvatarFallback className="bg-secondary text-xs font-medium">
                    {(user.user_metadata?.full_name || user.email || "?")
                      .split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
                {!isCollapsed && (
                  <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium leading-none truncate">
                      {user.user_metadata?.full_name || user.email?.split('@')[0]}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {user.email}
              </p>
            </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isCollapsed ? "center" : "end"} side={isCollapsed ? "right" : "top"} className="w-48">
              <DropdownMenuLabel>Account</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <UserIcon className="h-4 w-4 mr-2" />
                  Account
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings/billing" className="cursor-pointer">
                  <CreditCardIcon className="h-4 w-4 mr-2" />
                  Billing
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings/security" className="cursor-pointer">
                  <ShieldIcon className="h-4 w-4 mr-2" />
                  Security
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings/integrations" className="cursor-pointer">
                  <PlugIcon className="h-4 w-4 mr-2" />
                  Integrations
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings/team" className="cursor-pointer">
                  <TeamIcon className="h-4 w-4 mr-2" />
                  Team & Org
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings/ai-permissions" className="cursor-pointer">
                  <SettingsIcon className="h-4 w-4 mr-2" />
                  AI Permissions
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={signOut}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOutIcon className="h-4 w-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className={`flex items-center ${isCollapsed ? "" : "gap-2.5 rounded-lg px-2 py-1.5"}`}>
            <Avatar className="h-8 w-8 border flex-shrink-0">
              <AvatarFallback className="bg-secondary text-xs font-medium">
                ?
              </AvatarFallback>
            </Avatar>
            {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-none">
                Not signed in
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  Sign in to continue
              </p>
            </div>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
