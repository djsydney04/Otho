"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAppStore, syncCalendar, syncEmails, formatRelative } from "@/lib/store"
import {
  LayoutIcon,
  BuildingIcon,
  UsersIcon,
  CheckSquareIcon,
  FileTextIcon,
  InboxIcon,
  GoogleCalendarIcon,
  GmailIcon,
  CheckIcon,
  RefreshIcon,
  LogOutIcon,
} from "./icons"

type SidebarItemProps = {
  label: string
  icon: React.ReactNode
  active?: boolean
  href?: string
}

function SidebarItem({ label, icon, active, href }: SidebarItemProps) {
  const className = [
    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm smooth",
    active
      ? "sidebar-active"
      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
  ].join(" ")

  if (href) {
    return (
      <Link href={href} className={className}>
        {icon}
        {label}
      </Link>
    )
  }

  return (
    <button className={className}>
      {icon}
      {label}
    </button>
  )
}

interface SidebarProps {
  activePage?: "pipeline" | "companies" | "founders" | "tasks" | "comments" | "inbox"
}

export function Sidebar({ activePage = "pipeline" }: SidebarProps) {
  const { data: session, status } = useSession()
  const { lastSyncTime, syncing, emailSyncing, lastEmailSyncTime, clearCalendarData, clearEmailData } = useAppStore()

  const handleConnectGoogle = () => {
    signIn("google")
  }

  const handleDisconnect = () => {
    clearCalendarData()
    clearEmailData()
    signOut({ redirect: false })
  }

  const handleSync = async () => {
    // Sync both calendar and email
    await Promise.all([syncCalendar(), syncEmails()])
  }
  
  const isSyncing = syncing || emailSyncing

  return (
    <aside className="flex w-60 flex-col border-r bg-sidebar">
      <div className="flex h-16 items-center border-b px-5">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
            A
          </div>
          <span className="font-display text-lg font-semibold tracking-tight">
            Angel Lead
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4">
        <div className="space-y-0.5">
          <SidebarItem 
            label="Pipeline" 
            icon={<LayoutIcon className="h-4 w-4" />} 
            active={activePage === "pipeline"}
            href="/"
          />
          <SidebarItem 
            label="Companies" 
            icon={<BuildingIcon className="h-4 w-4" />}
            active={activePage === "companies"}
          />
          <SidebarItem 
            label="Founders" 
            icon={<UsersIcon className="h-4 w-4" />}
            active={activePage === "founders"}
            href="/founders"
          />
          <SidebarItem 
            label="Tasks" 
            icon={<CheckSquareIcon className="h-4 w-4" />}
            active={activePage === "tasks"}
          />
          <SidebarItem 
            label="Comments" 
            icon={<FileTextIcon className="h-4 w-4" />}
            active={activePage === "comments"}
          />
          <SidebarItem 
            label="Inbox" 
            icon={<InboxIcon className="h-4 w-4" />}
            active={activePage === "inbox"}
            href="/inbox"
          />
        </div>
        
        <div className="my-5 border-t" />
        
        <p className="mb-2 px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Integrations
        </p>
        
        {session ? (
          <div className="space-y-3">
            {/* Calendar Connected */}
            <div className="space-y-2">
              <div className="connected flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm">
                <GoogleCalendarIcon className="h-4 w-4 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium block text-xs">Calendar</span>
                  {lastSyncTime && (
                    <span className="text-[10px] text-muted-foreground">
                      {formatRelative(lastSyncTime.toISOString())}
                    </span>
                  )}
                </div>
                <CheckIcon className="h-3 w-3 flex-shrink-0" />
              </div>
            </div>
            
            {/* Gmail Connected */}
            <div className="connected flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm">
              <GmailIcon className="h-4 w-4 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-medium block text-xs">Gmail</span>
                <span className="text-[10px] text-muted-foreground truncate block">
                  {session.user?.email}
                </span>
              </div>
              <CheckIcon className="h-3 w-3 flex-shrink-0" />
            </div>
            
            {/* Actions */}
            <div className="flex gap-1 px-1">
              <button 
                onClick={handleSync}
                disabled={isSyncing}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground smooth rounded hover:bg-secondary/50"
              >
                <RefreshIcon className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync'}
              </button>
              <button 
                onClick={handleDisconnect}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground smooth rounded hover:bg-secondary/50"
              >
                <LogOutIcon className="h-3 w-3" />
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={handleConnectGoogle}
            disabled={status === "loading"}
            className="flex w-full items-center gap-2.5 rounded-lg border border-dashed px-3 py-2.5 text-left text-sm text-muted-foreground hover:border-primary/50 hover:bg-primary/5 smooth"
          >
            <GoogleCalendarIcon className="h-4 w-4" />
            <span>{status === "loading" ? "Loading..." : "Connect Google"}</span>
          </button>
        )}
      </nav>

      <div className="border-t p-3">
        {session ? (
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            <Avatar className="h-8 w-8 border">
              <AvatarImage src={session.user?.image || undefined} />
              <AvatarFallback className="bg-secondary text-xs font-medium">
                {session.user?.name?.split(' ').map(n => n[0]).join('') || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-none truncate">
                {session.user?.name}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {session.user?.email}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            <Avatar className="h-8 w-8 border">
              <AvatarFallback className="bg-secondary text-xs font-medium">
                ?
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-none">
                Not signed in
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                Connect Google to sync
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
