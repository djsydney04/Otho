"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/hooks/use-auth"
import { getUserTier } from "@/lib/tiers"
import Link from "next/link"

export default function TeamPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [organizations, setOrganizations] = useState<any[]>([])
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
  const [members, setMembers] = useState<any[]>([])
  const [newOrgName, setNewOrgName] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member")
  const [inviting, setInviting] = useState(false)
  const [userTier, setUserTier] = useState<"hobby" | "angel" | "fund">("hobby")
  const [checkingTier, setCheckingTier] = useState(true)

  // Check user tier
  useEffect(() => {
    async function checkTier() {
      if (!user) return
      const supabase = createBrowserSupabaseClient()
      const tier = await getUserTier(user.id, supabase)
      setUserTier(tier)
      setCheckingTier(false)
    }
    checkTier()
  }, [user])

  useEffect(() => {
    async function loadData() {
      if (!user) return
      
      const supabase = createBrowserSupabaseClient()
      
      // Load organizations user owns or is a member of
      const { data: ownedOrgs } = await supabase
        .from("organizations")
        .select("*")
        .eq("owner_id", user.id)
        .limit(10)
      
      const { data: memberOrgs } = await supabase
        .from("organization_members")
        .select(`
          organization:organizations(*)
        `)
        .eq("user_id", user.id)
      
      const allOrgs: any[] = []
      if (ownedOrgs) allOrgs.push(...ownedOrgs)
      if (memberOrgs) {
        const orgs = memberOrgs.map((m: any) => m.organization).filter(Boolean)
        allOrgs.push(...orgs)
      }
      
      // Dedupe by id
      const uniqueOrgs = Array.from(new Map(allOrgs.map(org => [org.id, org])).values())
      setOrganizations(uniqueOrgs)
      
      if (uniqueOrgs.length > 0 && !selectedOrgId) {
        setSelectedOrgId(uniqueOrgs[0].id)
      }
      
      setLoading(false)
    }
    
    loadData()
  }, [user, selectedOrgId])

  useEffect(() => {
    async function loadMembers() {
      if (!selectedOrgId) return
      
      const supabase = createBrowserSupabaseClient()
      const { data: orgMembers } = await supabase
        .from("organization_members")
        .select(`
          *,
          user:users(id, name, email, avatar_url)
        `)
        .eq("organization_id", selectedOrgId)
      
      if (orgMembers) {
        setMembers(orgMembers)
      }
    }
    
    loadMembers()
  }, [selectedOrgId])

  const handleCreateOrg = async () => {
    if (!user || !newOrgName.trim()) return
    
    // Check if user has Fund tier
    if (userTier !== "fund") {
      alert("Organization features require a Fund plan. Please upgrade to create organizations.")
      return
    }
    
    const supabase = createBrowserSupabaseClient()
    const { data, error } = await supabase
      .from("organizations")
      .insert({
        name: newOrgName,
        owner_id: user.id,
        plan: "fund",
        slug: newOrgName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      })
      .select()
      .single()
    
    if (data && !error) {
      setOrganizations([...organizations, data])
      setSelectedOrgId(data.id)
      setNewOrgName("")
      
      // Auto-add current user as owner member
      await supabase
        .from("organization_members")
        .insert({
          organization_id: data.id,
          user_id: user.id,
          role: "owner",
          joined_at: new Date().toISOString(),
        })
    }
  }

  const handleInviteMember = async () => {
    if (!selectedOrgId || !inviteEmail.trim() || !user) return
    
    // Check if user has Fund tier
    if (userTier !== "fund") {
      alert("Inviting members requires a Fund plan. Please upgrade to add team members.")
      return
    }
    
    setInviting(true)
    try {
      const supabase = createBrowserSupabaseClient()
      
      // Check if user exists
      const { data: inviteUser } = await supabase
        .from("users")
        .select("id")
        .eq("email", inviteEmail.trim().toLowerCase())
        .single()
      
      if (!inviteUser) {
        alert("User with this email not found. They need to sign up first.")
        return
      }
      
      // Check if already a member
      const { data: existingMember } = await supabase
        .from("organization_members")
        .select("id")
        .eq("organization_id", selectedOrgId)
        .eq("user_id", inviteUser.id)
        .single()
      
      if (existingMember) {
        alert("User is already a member of this organization")
        return
      }
      
      // Add member
      const { error } = await supabase
        .from("organization_members")
        .insert({
          organization_id: selectedOrgId,
          user_id: inviteUser.id,
          role: inviteRole,
          invited_by: user.id,
        })
      
      if (error) throw error
      
      // Reload members
      const { data: orgMembers } = await supabase
        .from("organization_members")
        .select(`
          *,
          user:users(id, name, email, avatar_url)
        `)
        .eq("organization_id", selectedOrgId)
      
      if (orgMembers) {
        setMembers(orgMembers)
      }
      
      setInviteEmail("")
      setInviteRole("member")
    } catch (error: any) {
      console.error("Error inviting member:", error)
      alert(error.message || "Failed to invite member")
    } finally {
      setInviting(false)
    }
  }

  const handleRemoveMember = async (memberId: string, userId: string) => {
    if (!selectedOrgId || !user || !confirm("Are you sure you want to remove this member?")) return
    
    const supabase = createBrowserSupabaseClient()
    await supabase
      .from("organization_members")
      .delete()
      .eq("id", memberId)
    
    setMembers(members.filter((m) => m.id !== memberId))
  }

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    if (!selectedOrgId) return
    
    const supabase = createBrowserSupabaseClient()
    await supabase
      .from("organization_members")
      .update({ role: newRole })
      .eq("id", memberId)
    
    setMembers(members.map((m) => m.id === memberId ? { ...m, role: newRole } : m))
  }

  if (loading || checkingTier) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const canUseOrgFeatures = userTier === "fund"

  const currentOrg = organizations.find((o) => o.id === selectedOrgId)
  const isOwner = currentOrg?.owner_id === user?.id

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold mb-2">Team & Organization</h1>
        <p className="text-muted-foreground">Manage your teams and organizations</p>
      </div>

      {/* Upgrade Prompt for Non-Fund Users */}
      {!canUseOrgFeatures && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">Organization Features Require Fund Plan</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Multi-user workspaces, shared pipelines, and team collaboration features are available with the Fund plan.
                </p>
                <Link href="/settings/billing">
                  <Button>Upgrade to Fund Plan</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Organizations */}
      <Card>
        <CardHeader>
          <CardTitle>Organizations</CardTitle>
          <CardDescription>Create or manage organizations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {organizations.length > 0 ? (
            <div className="space-y-3">
              {organizations.map((org) => (
                <div
                  key={org.id}
                  className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedOrgId === org.id ? "border-primary bg-primary/5" : "hover:bg-secondary/50"
                  }`}
                  onClick={() => setSelectedOrgId(org.id)}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{org.name}</h3>
                      <Badge variant={org.plan === "free" ? "secondary" : "default"}>
                        {org.plan || "free"}
                      </Badge>
                      {org.owner_id === user?.id && (
                        <Badge variant="outline">Owner</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Created {new Date(org.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No organizations yet
            </p>
          )}

          <div className="pt-4 border-t">
            {canUseOrgFeatures ? (
              <div className="flex gap-2">
                <Input
                  placeholder="Organization name"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCreateOrg()
                    }
                  }}
                  className="flex-1"
                />
                <Button onClick={handleCreateOrg} disabled={!newOrgName.trim()}>
                  Create Organization
                </Button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">
                  Upgrade to Fund plan to create organizations
                </p>
                <Link href="/settings/billing">
                  <Button variant="outline">Upgrade Now</Button>
                </Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Team Members */}
      {currentOrg && (
        <Card>
          <CardHeader>
            <CardTitle>Team Members - {currentOrg.name}</CardTitle>
            <CardDescription>
              {isOwner ? "Manage members and their roles" : "View team members"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Invite Member */}
            {isOwner && (
              <>
                {canUseOrgFeatures ? (
                  <div className="p-4 border rounded-lg bg-secondary/30">
                    <Label className="mb-3 block">Invite Team Member</Label>
                    <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "member" | "admin")}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleInviteMember} disabled={!inviteEmail.trim() || inviting}>
                    {inviting ? "Inviting..." : "Invite"}
                  </Button>
                </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      User must have an account with this email address
                    </p>
                  </div>
                ) : (
                  <div className="p-4 border rounded-lg bg-amber-50/50 border-amber-200">
                    <p className="text-sm text-muted-foreground mb-3">
                      Inviting team members requires a Fund plan.
                    </p>
                    <Link href="/settings/billing">
                      <Button variant="outline" size="sm">Upgrade to Fund</Button>
                    </Link>
                  </div>
                )}
              </>
            )}

            {/* Members List */}
            {members.length > 0 ? (
              <div className="space-y-3">
                {members.map((member: any) => {
                  const memberUser = member.user
                  const canEdit = isOwner && member.user_id !== user?.id
                  
                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={memberUser?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {(memberUser?.name || memberUser?.email || "?")
                              .split(' ')
                              .map((n: string) => n[0])
                              .join('')
                              .toUpperCase()
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {memberUser?.name || "Unknown"}
                            {member.user_id === user?.id && (
                              <span className="text-xs text-muted-foreground ml-2">(You)</span>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {memberUser?.email}
                          </p>
                          {member.joined_at && (
                            <p className="text-xs text-muted-foreground">
                              Joined {new Date(member.joined_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {canEdit ? (
                          <Select
                            value={member.role}
                            onValueChange={(v) => handleUpdateRole(member.id, v)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline">{member.role}</Badge>
                        )}
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMember(member.id, member.user_id)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No members yet. {isOwner && "Invite someone to get started."}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

