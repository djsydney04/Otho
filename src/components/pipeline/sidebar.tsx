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

  return null // Don't render items without href
}

interface SidebarProps {
  activePage?: "home" | "otho" | "pipeline" | "founders"
}

export function Sidebar({ activePage = "home" }: SidebarProps) {
  const { data: session, status } = useSession()
  const { syncing, emailSyncing, clearCalendarData, clearEmailData } = useAppStore()

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
    <aside className="flex w-60 flex-col border-r bg-sidebar flex-shrink-0">
      <div className="flex h-16 items-center border-b px-5">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
            O
          </div>
          <span className="font-display text-lg font-semibold tracking-tight">
            Otho
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-0.5">
          <SidebarItem 
            label="Home" 
            icon={<HomeIcon className="h-4 w-4" />} 
            active={activePage === "home"}
            href="/"
          />
          <SidebarItem 
            label="Otho" 
            icon={<OthoIcon className="h-4 w-4" />} 
            active={activePage === "otho"}
            href="/otho"
          />
          <SidebarItem 
            label="Pipeline" 
            icon={<LayoutIcon className="h-4 w-4" />} 
            active={activePage === "pipeline"}
            href="/pipeline"
          />
          <SidebarItem 
            label="Founders" 
            icon={<UsersIcon className="h-4 w-4" />}
            active={activePage === "founders"}
            href="/founders"
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
            disabled={status === "loading"}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs smooth ${
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
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs smooth ${
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
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs smooth ${
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

      <div className="border-t p-3 flex-shrink-0">
        {session ? (
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            <Avatar className="h-8 w-8 border flex-shrink-0">
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
            <Avatar className="h-8 w-8 border flex-shrink-0">
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
