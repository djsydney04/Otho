"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/hooks/use-auth"
import {
  type OnboardingData,
  ROLE_OPTIONS,
  PRIMARY_GOAL_OPTIONS,
  SIGNUP_SOURCE_OPTIONS,
  INVESTING_STATUS_OPTIONS,
  CHECK_SIZE_OPTIONS,
  DEALS_PER_YEAR_OPTIONS,
  STAGE_FOCUS_OPTIONS,
  SECTOR_FOCUS_OPTIONS,
  GEO_FOCUS_OPTIONS,
  DECISION_FACTOR_OPTIONS,
  DECISION_SPEED_OPTIONS,
  SOURCING_CHANNEL_OPTIONS,
  BIGGEST_PAIN_OPTIONS,
  DISCOVER_TOPIC_OPTIONS,
  AI_HELP_FOCUS_OPTIONS,
  AI_TONE_OPTIONS,
} from "@/lib/types/onboarding"
import { saveOnboardingStep } from "@/lib/actions/onboarding"

const TIMEZONES = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
]

const DATE_FORMATS = [
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
]

export default function AccountSettingsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    avatar_url: "",
  })
  
  const [preferences, setPreferences] = useState({
    timezone: "UTC",
    language: "en",
    date_format: "MM/DD/YYYY",
    theme: "system",
    email_notifications: true,
    push_notifications: false,
  })

  const [onboardingData, setOnboardingData] = useState<Partial<OnboardingData>>({})

  useEffect(() => {
    async function loadData() {
      if (!user) return
      
      const supabase = createBrowserSupabaseClient()
      
      // Load user profile
      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single()
      
      if (userData) {
        setProfileData({
          name: userData.name || user.user_metadata?.full_name || "",
          email: userData.email || user.email || "",
          avatar_url: userData.avatar_url || user.user_metadata?.avatar_url || "",
        })
        
        // Load onboarding data
        setOnboardingData({
          role: userData.role as any,
          user_location: userData.user_location,
          primary_goals: userData.primary_goals as any,
          signup_source: userData.signup_source as any,
          actively_investing: userData.actively_investing as any,
          invested_before: userData.invested_before,
          check_size: userData.check_size as any,
          deals_per_year: userData.deals_per_year as any,
          stage_focus: userData.stage_focus as any,
          sector_focus: userData.sector_focus as any,
          geo_focus: userData.geo_focus as any,
          decision_factors: userData.decision_factors as any,
          decision_speed: userData.decision_speed as any,
          sourcing_channels: userData.sourcing_channels as any,
          biggest_pain: userData.biggest_pain as any,
          discover_topics: userData.discover_topics as any,
          ai_help_focus: userData.ai_help_focus as any,
          ai_tone: userData.ai_tone as any,
        })
      }
      
      // Load preferences
      const { data: prefs } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single()
      
      if (prefs) {
        setPreferences({
          timezone: prefs.timezone || "UTC",
          language: prefs.language || "en",
          date_format: prefs.date_format || "MM/DD/YYYY",
          theme: prefs.theme || "system",
          email_notifications: prefs.email_notifications ?? true,
          push_notifications: prefs.push_notifications ?? false,
        })
      }
      
      setLoading(false)
    }
    
    loadData()
  }, [user])

  const handleSaveProfile = async () => {
    if (!user) return
    setSaving(true)
    setSaveSuccess(false)
    
    try {
      const supabase = createBrowserSupabaseClient()
      
      await supabase
        .from("users")
        .update({
          name: profileData.name,
          avatar_url: profileData.avatar_url,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
      
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      console.error("Error saving profile:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleSavePreferences = async () => {
    if (!user) return
    setSaving(true)
    setSaveSuccess(false)
    
    try {
      const supabase = createBrowserSupabaseClient()
      
      const { error } = await supabase
        .from("user_preferences")
        .upsert({
          user_id: user.id,
          ...preferences,
          updated_at: new Date().toISOString(),
        })
      
      if (error) throw error
      
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      console.error("Error saving preferences:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveOnboarding = async () => {
    if (!user) return
    setSaving(true)
    setSaveSuccess(false)
    
    try {
      await saveOnboardingStep(3, onboardingData)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      console.error("Error saving onboarding data:", error)
    } finally {
      setSaving(false)
    }
  }

  const toggleArrayValue = <T extends string>(
    key: keyof OnboardingData,
    value: T,
    maxItems?: number
  ) => {
    const current = (onboardingData[key] as T[]) || []
    if (current.includes(value)) {
      setOnboardingData({ ...onboardingData, [key]: current.filter((v) => v !== value) })
    } else if (!maxItems || current.length < maxItems) {
      setOnboardingData({ ...onboardingData, [key]: [...current, value] })
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
        <h1 className="font-display text-2xl font-semibold mb-2">Account Settings</h1>
        <p className="text-muted-foreground">Manage your account information and preferences</p>
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Your public profile information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={profileData.name}
              onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={profileData.email}
              disabled
              className="h-11 bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed. Contact support if you need to update it.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatar">Avatar</Label>
            <div className="flex items-center gap-4">
              {profileData.avatar_url && (
                <img
                  src={profileData.avatar_url}
                  alt="Avatar"
                  className="h-16 w-16 rounded-full object-cover border"
                />
              )}
              <div className="flex-1">
                <Input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file || !user) return
                    
                    setSaving(true)
                    try {
                      const supabase = createBrowserSupabaseClient()
                      
                      // Upload to Supabase Storage
                      const fileExt = file.name.split('.').pop()
                      const fileName = `${user.id}-${Date.now()}.${fileExt}`
                      const filePath = `${user.id}/${fileName}`
                      
                      // Delete old avatar if exists
                      const { data: oldFiles } = await supabase.storage
                        .from('avatars')
                        .list(`${user.id}/`)
                      
                      if (oldFiles && oldFiles.length > 0) {
                        const oldPaths = oldFiles.map(f => `${user.id}/${f.name}`)
                        await supabase.storage
                          .from('avatars')
                          .remove(oldPaths)
                      }
                      
                      const { error: uploadError } = await supabase.storage
                        .from('avatars')
                        .upload(filePath, file, {
                          cacheControl: '3600',
                          upsert: false
                        })
                      
                      if (uploadError) throw uploadError
                      
                      // Get public URL
                      const { data: { publicUrl } } = supabase.storage
                        .from('avatars')
                        .getPublicUrl(filePath)
                      
                      setProfileData({ ...profileData, avatar_url: publicUrl })
                      
                      // Save to database
                      await supabase
                        .from("users")
                        .update({
                          avatar_url: publicUrl,
                          updated_at: new Date().toISOString(),
                        })
                        .eq("id", user.id)
                      
                      setSaveSuccess(true)
                      setTimeout(() => setSaveSuccess(false), 3000)
                    } catch (error) {
                      console.error("Error uploading avatar:", error)
                    } finally {
                      setSaving(false)
                    }
                  }}
                  className="h-11"
                  disabled={saving}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Upload an image file (JPG, PNG, etc.)
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Onboarding Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Investment Profile</CardTitle>
          <CardDescription>Update your onboarding preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Role</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ROLE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setOnboardingData({ ...onboardingData, role: option.value })}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-all border ${
                    onboardingData.role === option.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-secondary/50 border-border"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="user_location">Location</Label>
            <Input
              id="user_location"
              value={onboardingData.user_location || ""}
              onChange={(e) =>
                setOnboardingData({ ...onboardingData, user_location: e.target.value || null })
              }
              placeholder="San Francisco, CA"
              className="h-11"
            />
          </div>

          <div className="space-y-3">
            <Label>Primary Goals (pick up to 2)</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRIMARY_GOAL_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleArrayValue("primary_goals", option.value, 2)}
                  className={`px-4 py-3 rounded-lg text-sm text-left transition-all border ${
                    onboardingData.primary_goals?.includes(option.value)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-secondary/50 border-border"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Stage Focus</Label>
            <div className="flex flex-wrap gap-2">
              {STAGE_FOCUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleArrayValue("stage_focus", option.value)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                    onboardingData.stage_focus?.includes(option.value)
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Sector Focus</Label>
            <div className="flex flex-wrap gap-2">
              {SECTOR_FOCUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleArrayValue("sector_focus", option.value)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                    onboardingData.sector_focus?.includes(option.value)
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label>AI Tone</Label>
            <div className="grid grid-cols-3 gap-2">
              {AI_TONE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setOnboardingData({ ...onboardingData, ai_tone: option.value })}
                  className={`px-4 py-4 rounded-lg text-center transition-all border ${
                    onboardingData.ai_tone === option.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-secondary/50 border-border"
                  }`}
                >
                  <p className="font-medium text-sm">{option.label}</p>
                  <p className="text-xs mt-1 opacity-80">{option.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            {saveSuccess && (
              <span className="text-sm text-green-600 flex items-center">
                Saved successfully
              </span>
            )}
            <Button onClick={handleSaveOnboarding} disabled={saving}>
              {saving ? "Saving..." : "Save Investment Profile"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>Customize your experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={preferences.timezone}
                onValueChange={(v) => setPreferences({ ...preferences, timezone: v })}
              >
                <SelectTrigger id="timezone" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date_format">Date Format</Label>
              <Select
                value={preferences.date_format}
                onValueChange={(v) => setPreferences({ ...preferences, date_format: v })}
              >
                <SelectTrigger id="date_format" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_FORMATS.map((fmt) => (
                    <SelectItem key={fmt.value} value={fmt.value}>
                      {fmt.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="theme">Theme</Label>
            <Select
              value={preferences.theme}
              onValueChange={(v) => setPreferences({ ...preferences, theme: v })}
            >
              <SelectTrigger id="theme" className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <Label>Notifications</Label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Email Notifications</p>
                  <p className="text-xs text-muted-foreground">
                    Receive email updates about your account
                  </p>
                </div>
                <Checkbox
                  checked={preferences.email_notifications}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, email_notifications: checked as boolean })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Push Notifications</p>
                  <p className="text-xs text-muted-foreground">
                    Receive browser push notifications
                  </p>
                </div>
                <Checkbox
                  checked={preferences.push_notifications}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, push_notifications: checked as boolean })
                  }
                />
              </div>

            </div>
          </div>

          <div className="flex justify-end gap-3">
            {saveSuccess && (
              <span className="text-sm text-green-600 flex items-center">
                Saved successfully
              </span>
            )}
            <Button onClick={handleSavePreferences} disabled={saving}>
              {saving ? "Saving..." : "Save Preferences"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
