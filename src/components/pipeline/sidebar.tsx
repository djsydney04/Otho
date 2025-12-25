"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAppStore, syncCalendar, syncEmails } from "@/lib/store"
import {
  HomeIcon,
  OthoIcon,
  LayoutIcon,
  UsersIcon,
  GoogleCalendarIcon,
  GmailIcon,
  CheckIcon,
  RefreshIcon,
  LogOutIcon,
  GoogleDriveIcon,
  DiscoverIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "./icons"

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
      ? "sidebar-active"
      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
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
  activePage?: "home" | "otho" | "pipeline" | "founders" | "discover"
  defaultCollapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}

export function Sidebar({ activePage = "home", defaultCollapsed = false, onCollapsedChange }: SidebarProps) {
  const { data: session, status } = useSession()
  const { syncing, emailSyncing, clearCalendarData, clearEmailData, sidebarCollapsed, setSidebarCollapsed } = useAppStore()

  // Use store state or prop default
  const isCollapsed = sidebarCollapsed ?? defaultCollapsed

  const toggleCollapsed = () => {
    const newValue = !isCollapsed
    setSidebarCollapsed(newValue)
    onCollapsedChange?.(newValue)
  }

  const handleConnectGoogle = () => {
    signIn("google")
  }

  const handleDisconnect = () => {
    clearCalendarData()
    clearEmailData()
    signOut({ redirect: false })
  }

  const handleSync = async () => {
    await Promise.all([syncCalendar(), syncEmails()])
  }
  
  const isSyncing = syncing || emailSyncing

  return (
    <aside 
      className={`flex flex-col border-r bg-sidebar flex-shrink-0 transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Header */}
      <div className={`flex h-14 items-center border-b ${isCollapsed ? "justify-center px-2" : "justify-between px-4"}`}>
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex-shrink-0">
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
        </div>
        
        {!isCollapsed && (
          <>
            <div className="my-5 border-t" />
            
            <p className="mb-3 px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Integrations
            </p>
            
            {/* Integration Icons */}
            <div className="px-3 space-y-2">
              <button
                onClick={handleConnectGoogle}
                disabled={status === "loading"}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs transition-colors ${
                  session 
                    ? "bg-green-500/10 border border-green-500/20 text-green-700" 
                    : "border border-dashed hover:border-primary/50 hover:bg-primary/5 text-muted-foreground"
                }`}
                title={session ? "Google Calendar Connected" : "Connect Google Calendar"}
              >
                <GoogleCalendarIcon className="h-4 w-4 flex-shrink-0" />
                <span className="font-medium">Calendar</span>
                {session && <CheckIcon className="h-3 w-3 ml-auto" />}
              </button>
              
              <button
                onClick={handleConnectGoogle}
                disabled={status === "loading"}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs transition-colors ${
                  session 
                    ? "bg-green-500/10 border border-green-500/20 text-green-700" 
                    : "border border-dashed hover:border-primary/50 hover:bg-primary/5 text-muted-foreground"
                }`}
                title={session ? "Gmail Connected" : "Connect Gmail"}
              >
                <GmailIcon className="h-4 w-4 flex-shrink-0" />
                <span className="font-medium">Gmail</span>
                {session && <CheckIcon className="h-3 w-3 ml-auto" />}
              </button>
              
              <button
                onClick={handleConnectGoogle}
                disabled={status === "loading"}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs transition-colors ${
                  session 
                    ? "bg-green-500/10 border border-green-500/20 text-green-700" 
                    : "border border-dashed hover:border-primary/50 hover:bg-primary/5 text-muted-foreground"
                }`}
                title={session ? "Google Drive Connected" : "Connect Google Drive"}
              >
                <GoogleDriveIcon className="h-4 w-4 flex-shrink-0" />
                <span className="font-medium">Drive</span>
                {session && <CheckIcon className="h-3 w-3 ml-auto" />}
              </button>
            </div>
            
            {/* Sync Actions */}
            {session && (
              <div className="mt-3 px-3">
                <div className="flex gap-1">
                  <button 
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-lg border hover:bg-secondary/50"
                  >
                    <RefreshIcon className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing...' : 'Sync All'}
                  </button>
                  <button 
                    onClick={handleDisconnect}
                    className="flex items-center justify-center px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-lg border hover:bg-secondary/50"
                    title="Disconnect Google"
                  >
                    <LogOutIcon className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Collapsed integrations */}
        {isCollapsed && session && (
          <div className="mt-4 pt-4 border-t flex flex-col items-center space-y-2">
            <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-green-500/10 border border-green-500/20" title="Connected">
              <GoogleCalendarIcon className="h-4 w-4 text-green-600" />
            </div>
            <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-green-500/10 border border-green-500/20" title="Connected">
              <GmailIcon className="h-4 w-4 text-green-600" />
            </div>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className={`border-t flex-shrink-0 ${isCollapsed ? "p-2 flex justify-center" : "p-3"}`}>
        {session ? (
          <div className={`flex items-center ${isCollapsed ? "" : "gap-2.5 rounded-lg px-2 py-1.5"}`}>
            <Avatar className="h-8 w-8 border flex-shrink-0">
              <AvatarImage src={session.user?.image || undefined} />
              <AvatarFallback className="bg-secondary text-xs font-medium">
                {session.user?.name?.split(' ').map(n => n[0]).join('') || '?'}
              </AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-none truncate">
                  {session.user?.name}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {session.user?.email}
                </p>
              </div>
            )}
          </div>
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
                  Connect Google to sync
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
