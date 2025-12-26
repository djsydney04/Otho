"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuth } from "@/lib/hooks/use-auth"
import { TrashIcon, ClockIcon } from "@/components/icons"

interface AIGrant {
  id: string
  name: string | null
  description: string | null
  can_add_comments: boolean
  can_update_fields: string[] | null
  can_create_companies: boolean
  can_create_founders: boolean
  can_add_tags: boolean
  expires_at: string | null
  created_at: string
  is_active: boolean
}

export default function AIPermissionsPage() {
  const { user } = useAuth()
  const [grants, setGrants] = useState<AIGrant[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [grantName, setGrantName] = useState("")
  const [grantDescription, setGrantDescription] = useState("")
  const [canAddComments, setCanAddComments] = useState(true)
  const [canUpdateFields, setCanUpdateFields] = useState<string[]>(['stage', 'is_priority', 'needs_followup', 'description'])
  const [expiresIn, setExpiresIn] = useState<"never" | "1h" | "24h" | "7d">("never")

  useEffect(() => {
    if (user) {
      loadGrants()
    }
  }, [user])

  const loadGrants = async () => {
    try {
      const res = await fetch("/api/ai/grants")
      const data = await res.json()
      setGrants(data.grants || [])
    } catch (error) {
      console.error("Failed to load grants:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGrant = async () => {
    if (!user) return
    
    setCreating(true)
    try {
      let expiresAt = null
      if (expiresIn !== "never") {
        const hours = expiresIn === "1h" ? 1 : expiresIn === "24h" ? 24 : 168
        expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
      }

      const res = await fetch("/api/ai/grants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: grantName || "AI Assistant Grant",
          description: grantDescription || null,
          canAddComments,
          canUpdateFields,
          canCreateCompanies: false,
          canCreateFounders: false,
          canAddTags: false,
          expiresAt,
        })
      })

      if (res.ok) {
        setShowForm(false)
        setGrantName("")
        setGrantDescription("")
        loadGrants()
      }
    } catch (error) {
      console.error("Failed to create grant:", error)
    } finally {
      setCreating(false)
    }
  }

  const handleRevokeGrant = async (grantId: string) => {
    if (!confirm("Revoke this AI permission grant?")) return

    try {
      const res = await fetch("/api/ai/grants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grantId, revoke: true })
      })

      if (res.ok) {
        loadGrants()
      }
    } catch (error) {
      console.error("Failed to revoke grant:", error)
    }
  }

  const availableFields = [
    { id: 'stage', label: 'Stage' },
    { id: 'is_priority', label: 'Priority' },
    { id: 'needs_followup', label: 'Needs Follow-up' },
    { id: 'description', label: 'Description' },
    { id: 'website', label: 'Website' },
  ]

  const toggleField = (fieldId: string) => {
    setCanUpdateFields(prev => 
      prev.includes(fieldId) 
        ? prev.filter(f => f !== fieldId)
        : [...prev, fieldId]
    )
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">AI Permissions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Control what Otho (AI assistant) can do with your data. Grant explicit permissions that are scoped and time-bounded.
        </p>
      </div>

      {!showForm ? (
        <Button onClick={() => setShowForm(true)}>
          Create New Grant
        </Button>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Create AI Permission Grant</CardTitle>
            <CardDescription>
              Define what actions the AI can take. Changes are always logged and can be revoked.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="grantName">Grant Name</Label>
              <Input
                id="grantName"
                value={grantName}
                onChange={(e) => setGrantName(e.target.value)}
                placeholder="e.g., 'Comment-only access'"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="grantDescription">Description (optional)</Label>
              <Input
                id="grantDescription"
                value={grantDescription}
                onChange={(e) => setGrantDescription(e.target.value)}
                placeholder="What this grant is for"
                className="mt-1"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="canAddComments"
                  checked={canAddComments}
                  onCheckedChange={(checked) => setCanAddComments(checked === true)}
                />
                <Label htmlFor="canAddComments" className="font-normal cursor-pointer">
                  Can add comments automatically when discovering news
                </Label>
              </div>

              <div className="space-y-2">
                <Label>Can update these fields:</Label>
                <div className="grid grid-cols-2 gap-2">
                  {availableFields.map(field => (
                    <div key={field.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={field.id}
                        checked={canUpdateFields.includes(field.id)}
                        onCheckedChange={() => toggleField(field.id)}
                      />
                      <Label htmlFor={field.id} className="font-normal cursor-pointer text-sm">
                        {field.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Expires</Label>
                <div className="flex gap-2 mt-2">
                  {(['never', '1h', '24h', '7d'] as const).map(period => (
                    <Button
                      key={period}
                      variant={expiresIn === period ? "default" : "outline"}
                      size="sm"
                      onClick={() => setExpiresIn(period)}
                    >
                      {period === 'never' ? 'Never' : period === '1h' ? '1 Hour' : period === '24h' ? '24 Hours' : '7 Days'}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleCreateGrant} disabled={creating}>
                Create Grant
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Active Grants</h2>
        {grants.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No active grants. Create one to enable AI actions.
            </CardContent>
          </Card>
        ) : (
          grants.map(grant => (
            <Card key={grant.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{grant.name || "Untitled Grant"}</h3>
                      {grant.expires_at && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <ClockIcon className="h-3 w-3" />
                          Expires {new Date(grant.expires_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {grant.description && (
                      <p className="text-sm text-muted-foreground mt-1">{grant.description}</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      {grant.can_add_comments && (
                        <span className="px-2 py-1 bg-green-500/10 text-green-700 rounded">Add Comments</span>
                      )}
                      {grant.can_update_fields && grant.can_update_fields.length > 0 && (
                        <span className="px-2 py-1 bg-blue-500/10 text-blue-700 rounded">
                          Update: {grant.can_update_fields.join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevokeGrant(grant.id)}
                    className="text-destructive"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="p-4">
          <p className="text-sm">
            <strong>Protected fields:</strong> The AI can never modify: <code className="text-xs bg-white px-1 rounded">last_touch</code>, <code className="text-xs bg-white px-1 rounded">updated_at</code>, <code className="text-xs bg-white px-1 rounded">created_at</code>, or <code className="text-xs bg-white px-1 rounded">owner_id</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

