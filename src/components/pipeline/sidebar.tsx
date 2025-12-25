"use client"

import { useClerk, useUser } from "@clerk/nextjs"
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
  GoogleDriveIcon,
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
  const { user } = useUser()
  const { signOut } = useClerk()
  const { lastSyncTime, syncing, emailSyncing, clearCalendarData, clearEmailData } = useAppStore()

  const handleConnectGoogle = () => {
    window.open("mailto:hello@angellead.com?subject=Connect%20Google%20Workspace", "_blank")
  }

  const handleDisconnect = () => {
    clearCalendarData()
    clearEmailData()
    signOut({ redirectUrl: "/sign-in" })
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
            href="/pipeline"
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
        
        <p className="mb-3 px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Integrations
        </p>
        
        {/* Integration Icons */}
        <div className="px-3 space-y-2">
          <button
            onClick={handleConnectGoogle}
            disabled={!user}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs smooth ${
              user
                ? "bg-green-500/10 border border-green-500/20 text-green-700" 
                : "border border-dashed hover:border-primary/50 hover:bg-primary/5 text-muted-foreground"
            }`}
            title={user ? "Google Calendar Connected" : "Connect Google Calendar"}
          >
            <GoogleCalendarIcon className="h-4 w-4 flex-shrink-0" />
            <span className="font-medium">Calendar</span>
            {user && <CheckIcon className="h-3 w-3 ml-auto" />}
          </button>
          
          <button
            onClick={handleConnectGoogle}
            disabled={!user}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs smooth ${
              user
                ? "bg-green-500/10 border border-green-500/20 text-green-700" 
                : "border border-dashed hover:border-primary/50 hover:bg-primary/5 text-muted-foreground"
            }`}
            title={user ? "Gmail Connected" : "Connect Gmail"}
          >
            <GmailIcon className="h-4 w-4 flex-shrink-0" />
            <span className="font-medium">Gmail</span>
            {user && <CheckIcon className="h-3 w-3 ml-auto" />}
          </button>
          
          <button
            onClick={handleConnectGoogle}
            disabled={!user}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs smooth ${
              user
                ? "bg-green-500/10 border border-green-500/20 text-green-700" 
                : "border border-dashed hover:border-primary/50 hover:bg-primary/5 text-muted-foreground"
            }`}
            title={user ? "Google Drive Connected" : "Connect Google Drive"}
          >
            <GoogleDriveIcon className="h-4 w-4 flex-shrink-0" />
            <span className="font-medium">Drive</span>
            {user && <CheckIcon className="h-3 w-3 ml-auto" />}
          </button>
        </div>
        
        {/* Sync Actions */}
        {user && (
          <div className="mt-3 px-3">
            <div className="flex gap-1">
              <button 
                onClick={handleSync}
                disabled={isSyncing}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground smooth rounded-lg border hover:bg-secondary/50"
              >
                <RefreshIcon className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync All'}
              </button>
              <button 
                onClick={handleDisconnect}
                className="flex items-center justify-center px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground smooth rounded-lg border hover:bg-secondary/50"
                title="Disconnect Google"
              >
                <LogOutIcon className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </nav>

      <div className="border-t p-3">
        {user ? (
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            <Avatar className="h-8 w-8 border">
              <AvatarImage src={user.imageUrl || undefined} />
              <AvatarFallback className="bg-secondary text-xs font-medium">
                {user.fullName?.split(" ").map(n => n[0]).join("") || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-none truncate">
                {user.fullName}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {user.primaryEmailAddress?.emailAddress}
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
