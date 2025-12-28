"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckIcon, RefreshIcon, GoogleCalendarIcon, GmailIcon, GoogleDriveIcon } from "@/components/pipeline/icons"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/hooks/use-auth"
import { syncCalendar, syncEmails } from "@/lib/store"

const GOOGLE_INTEGRATIONS = [
  {
    id: "google_calendar",
    name: "Google Calendar",
    description: "Sync calendar events and match with founders in your pipeline",
    icon: GoogleCalendarIcon,
    syncEndpoint: "/api/calendar/sync",
  },
  {
    id: "gmail",
    name: "Gmail",
    description: "Sync emails and link them to companies and founders",
    icon: GmailIcon,
    syncEndpoint: "/api/gmail/sync",
  },
  {
    id: "google_drive",
    name: "Google Drive",
    description: "Attach Drive files to companies and founders",
    icon: GoogleDriveIcon,
    syncEndpoint: null,
  },
]

export default function IntegrationsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<Record<string, boolean>>({})
  const [lastSyncTimes, setLastSyncTimes] = useState<Record<string, Date | null>>({})
  
  // Check if user has Google OAuth tokens in users table
  const [hasGoogleAuth, setHasGoogleAuth] = useState(false)
  const [integrations, setIntegrations] = useState<any[]>([])

  useEffect(() => {
    async function loadIntegrations() {
      if (!user) return
      
      const supabase = createBrowserSupabaseClient()
      
      // Check for Google tokens in users table
      const { data: userData } = await supabase
        .from("users")
        .select("google_access_token, google_refresh_token")
        .eq("id", user.id)
        .single()
      
      const hasTokens = !!(userData?.google_access_token || userData?.google_refresh_token)
      setHasGoogleAuth(hasTokens)
      
      // Load integrations from integrations table
      const { data } = await supabase
        .from("integrations")
        .select("*")
        .eq("user_id", user.id)
      
      if (data) {
        setIntegrations(data)
      }
      
      setLoading(false)
    }
    
    loadIntegrations()
  }, [user])

  const handleConnectGoogle = async () => {
    if (!user) return
    
    const supabase = createBrowserSupabaseClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?provider=google`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
          scope: [
            "email",
            "profile",
            "https://www.googleapis.com/auth/calendar.readonly",
            "https://www.googleapis.com/auth/calendar.events",
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/gmail.labels",
            "https://www.googleapis.com/auth/drive.readonly",
            "https://www.googleapis.com/auth/drive.file",
          ].join(" "),
        },
      },
    })
    
    if (error) {
      console.error("Error connecting Google:", error)
    }
  }

  const handleDisconnectGoogle = async () => {
    if (!user) return
    
    const supabase = createBrowserSupabaseClient()
    
    // Clear tokens from users table
    await supabase
      .from("users")
      .update({
        google_access_token: null,
        google_refresh_token: null,
        google_token_expires_at: null,
      })
      .eq("id", user.id)
    
    // Remove integrations
    await supabase
      .from("integrations")
      .delete()
      .eq("user_id", user.id)
      .eq("provider", "google")
    
    setHasGoogleAuth(false)
    setIntegrations(integrations.filter((i) => i.provider !== "google"))
  }

  const handleSync = async (integrationId: string, syncEndpoint: string | null) => {
    if (!syncEndpoint) return
    
    setSyncing({ ...syncing, [integrationId]: true })
    
    try {
      if (integrationId === "google_calendar") {
        const result = await syncCalendar()
        if (result) {
          setLastSyncTimes({ ...lastSyncTimes, [integrationId]: new Date(result.syncedAt) })
        }
      } else if (integrationId === "gmail") {
        const result = await syncEmails()
        if (result) {
          setLastSyncTimes({ ...lastSyncTimes, [integrationId]: new Date(result.syncedAt) })
        }
      }
    } catch (error) {
      console.error(`Error syncing ${integrationId}:`, error)
    } finally {
      setSyncing({ ...syncing, [integrationId]: false })
    }
  }

  const isConnected = (integrationId: string) => {
    if (!hasGoogleAuth) return false
    // All Google services use the same OAuth connection
    return integrationId.startsWith("google_")
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold mb-2">Integrations</h1>
        <p className="text-muted-foreground">Connect your tools to enhance your workflow</p>
      </div>

      {/* Google Integration Card */}
      {!hasGoogleAuth && (
        <Card>
          <CardHeader>
            <CardTitle>Google Workspace</CardTitle>
            <CardDescription>Connect your Google account to sync Calendar, Gmail, and Drive</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleConnectGoogle} className="w-full sm:w-auto">
              Connect Google Account
            </Button>
            <p className="text-xs text-muted-foreground mt-3">
              This will allow Otho to sync your calendar events, emails, and Drive files with your pipeline.
            </p>
          </CardContent>
        </Card>
      )}

      {hasGoogleAuth && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Google Workspace</CardTitle>
                  <CardDescription>Connected to your Google account</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleDisconnectGoogle}>
                  Disconnect
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Manage individual Google services below. Disconnecting will remove access to all Google services.
              </p>
            </CardContent>
          </Card>

          {/* Individual Google Services */}
          <div className="space-y-4">
            {GOOGLE_INTEGRATIONS.map((integration) => {
              const Icon = integration.icon
              const connected = isConnected(integration.id)
              const isSyncing = syncing[integration.id] || false
              const lastSync = lastSyncTimes[integration.id]
              
              return (
                <Card key={integration.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{integration.name}</h3>
                            {connected && (
                              <Badge variant="default" className="flex items-center gap-1">
                                <CheckIcon className="h-3 w-3" />
                                Connected
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {integration.description}
                          </p>
                          {connected && lastSync && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Last synced: {lastSync.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {connected && integration.syncEndpoint ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSync(integration.id, integration.syncEndpoint)}
                            disabled={isSyncing}
                          >
                            <RefreshIcon className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                            {isSyncing ? "Syncing..." : "Sync"}
                          </Button>
                        ) : connected ? (
                          <Badge variant="secondary">Active</Badge>
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

