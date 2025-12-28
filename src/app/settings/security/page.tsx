"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/hooks/use-auth"

export default function SecurityPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [security, setSecurity] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadSecurity() {
      if (!user) return
      
      const supabase = createBrowserSupabaseClient()
      const { data } = await supabase
        .from("security_settings")
        .select("*")
        .eq("user_id", user.id)
        .single()
      
      if (data) {
        setSecurity(data)
      } else {
        // Create default security settings
        const { data: newSecurity } = await supabase
          .from("security_settings")
          .insert({ user_id: user.id })
          .select()
          .single()
        
        if (newSecurity) {
          setSecurity(newSecurity)
        }
      }
      
      setLoading(false)
    }
    
    loadSecurity()
  }, [user])

  const handleToggle2FA = async () => {
    if (!user || !security) return
    setSaving(true)
    
    try {
      const supabase = createBrowserSupabaseClient()
      await supabase
        .from("security_settings")
        .update({
          two_factor_enabled: !security.two_factor_enabled,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
      
      setSecurity({ ...security, two_factor_enabled: !security.two_factor_enabled })
    } catch (error) {
      console.error("Error updating 2FA:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleLoginAlerts = async () => {
    if (!user || !security) return
    setSaving(true)
    
    try {
      const supabase = createBrowserSupabaseClient()
      await supabase
        .from("security_settings")
        .update({
          login_alerts: !security.login_alerts,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
      
      setSecurity({ ...security, login_alerts: !security.login_alerts })
    } catch (error) {
      console.error("Error updating login alerts:", error)
    } finally {
      setSaving(false)
    }
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
        <h1 className="font-display text-2xl font-semibold mb-2">Security</h1>
        <p className="text-muted-foreground">Manage your account security settings</p>
      </div>

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription>Add an extra layer of security to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">2FA Status</p>
              <p className="text-sm text-muted-foreground">
                {security?.two_factor_enabled
                  ? "Two-factor authentication is enabled"
                  : "Two-factor authentication is disabled"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={security?.two_factor_enabled ? "default" : "secondary"}>
                {security?.two_factor_enabled ? "Enabled" : "Disabled"}
              </Badge>
              <Button
                variant={security?.two_factor_enabled ? "destructive" : "default"}
                onClick={handleToggle2FA}
                disabled={saving}
              >
                {security?.two_factor_enabled ? "Disable" : "Enable"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Login Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Login Alerts</CardTitle>
          <CardDescription>Get notified when someone logs into your account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Email login alerts</p>
              <p className="text-sm text-muted-foreground">
                Receive an email when a new device logs into your account
              </p>
            </div>
            <Checkbox
              checked={security?.login_alerts ?? true}
              onCheckedChange={handleToggleLoginAlerts}
              disabled={saving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>Manage devices that are currently signed in</CardDescription>
        </CardHeader>
        <CardContent>
          {security?.active_sessions?.length > 0 ? (
            <div className="space-y-3">
              {JSON.parse(JSON.stringify(security.active_sessions || [])).map((session: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{session.device || "Unknown Device"}</p>
                    <p className="text-sm text-muted-foreground">{session.location || "Unknown Location"}</p>
                    <p className="text-xs text-muted-foreground">
                      Last active: {session.last_active ? new Date(session.last_active).toLocaleString() : "Unknown"}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No active sessions found
            </p>
          )}
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline">Change Password</Button>
          {security?.last_password_change && (
            <p className="text-xs text-muted-foreground mt-2">
              Last changed: {new Date(security.last_password_change).toLocaleDateString()}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

