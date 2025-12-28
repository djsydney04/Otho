"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import type { FounderWithRelations } from "@/lib/supabase/types"

interface EditFounderDialogProps {
  founder: FounderWithRelations
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (updatedFounder: Partial<FounderWithRelations>) => Promise<void>
}

export function EditFounderDialog({
  founder,
  open,
  onOpenChange,
  onSave,
}: EditFounderDialogProps) {
  const [formData, setFormData] = useState({
    name: founder.name,
    email: founder.email,
    additional_emails: founder.additional_emails || [],
    role_title: founder.role_title || "",
    location: founder.location || "",
    linkedin: founder.linkedin || "",
    twitter: founder.twitter || "",
    previous_companies: founder.previous_companies || "",
    education: founder.education || "",
    bio: founder.bio || "",
    domain_expertise: founder.domain_expertise || [],
    source: founder.source || "",
    warm_intro_path: founder.warm_intro_path || "",
    notes: founder.notes || "",
    is_priority: founder.is_priority || false,
    needs_followup: founder.needs_followup || false,
  })

  const [newAdditionalEmail, setNewAdditionalEmail] = useState("")
  const [newDomainExpertise, setNewDomainExpertise] = useState("")
  const [saving, setSaving] = useState(false)

  // Reset form when founder changes
  useEffect(() => {
    if (open && founder) {
      setFormData({
        name: founder.name,
        email: founder.email,
        additional_emails: founder.additional_emails || [],
        role_title: founder.role_title || "",
        location: founder.location || "",
        linkedin: founder.linkedin || "",
        twitter: founder.twitter || "",
        previous_companies: founder.previous_companies || "",
        education: founder.education || "",
        bio: founder.bio || "",
        domain_expertise: founder.domain_expertise || [],
        source: founder.source || "",
        warm_intro_path: founder.warm_intro_path || "",
        notes: founder.notes || "",
        is_priority: founder.is_priority || false,
        needs_followup: founder.needs_followup || false,
      })
    }
  }, [open, founder])

  const addAdditionalEmail = () => {
    const email = newAdditionalEmail.trim()
    if (email && !formData.additional_emails.includes(email) && email !== formData.email) {
      setFormData({ ...formData, additional_emails: [...formData.additional_emails, email] })
      setNewAdditionalEmail("")
    }
  }

  const removeAdditionalEmail = (email: string) => {
    setFormData({
      ...formData,
      additional_emails: formData.additional_emails.filter(e => e !== email)
    })
  }

  const addDomainExpertise = () => {
    const expertise = newDomainExpertise.trim()
    if (expertise && !formData.domain_expertise.includes(expertise)) {
      setFormData({ ...formData, domain_expertise: [...formData.domain_expertise, expertise] })
      setNewDomainExpertise("")
    }
  }

  const removeDomainExpertise = (expertise: string) => {
    setFormData({
      ...formData,
      domain_expertise: formData.domain_expertise.filter(e => e !== expertise)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.email.trim()) return

    setSaving(true)
    try {
      await onSave({
        name: formData.name,
        email: formData.email,
        additional_emails: formData.additional_emails.length > 0 ? formData.additional_emails : null,
        role_title: formData.role_title || null,
        location: formData.location || null,
        linkedin: formData.linkedin || null,
        twitter: formData.twitter || null,
        previous_companies: formData.previous_companies || null,
        education: formData.education || null,
        bio: formData.bio || null,
        domain_expertise: formData.domain_expertise.length > 0 ? formData.domain_expertise : null,
        source: formData.source || null,
        warm_intro_path: formData.warm_intro_path || null,
        notes: formData.notes || null,
        is_priority: formData.is_priority || null,
        needs_followup: formData.needs_followup || null,
      })
      onOpenChange(false)
    } catch (error) {
      console.error("Error updating founder:", error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Founder</DialogTitle>
          <DialogDescription>
            Update founder information. Changes will be saved immediately.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
            {/* Left Column */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email">Primary Email *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Additional Emails</Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="Add email..."
                    value={newAdditionalEmail}
                    onChange={(e) => setNewAdditionalEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addAdditionalEmail()
                      }
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addAdditionalEmail}>
                    Add
                  </Button>
                </div>
                {formData.additional_emails.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.additional_emails.map((email) => (
                      <Badge key={email} variant="secondary">
                        {email}
                        <button
                          type="button"
                          onClick={() => removeAdditionalEmail(email)}
                          className="ml-1.5 hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-role">Role / Title</Label>
                <Input
                  id="edit-role"
                  value={formData.role_title}
                  onChange={(e) => setFormData({ ...formData, role_title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-location">Location</Label>
                <Input
                  id="edit-location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-bio">Bio</Label>
                <Textarea
                  id="edit-bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-linkedin">LinkedIn</Label>
                  <Input
                    id="edit-linkedin"
                    value={formData.linkedin}
                    onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-twitter">Twitter / X</Label>
                  <Input
                    id="edit-twitter"
                    value={formData.twitter}
                    onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-previous">Previous Companies</Label>
                <Input
                  id="edit-previous"
                  value={formData.previous_companies}
                  onChange={(e) => setFormData({ ...formData, previous_companies: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-education">Education</Label>
                <Input
                  id="edit-education"
                  value={formData.education}
                  onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Domain Expertise</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add expertise..."
                    value={newDomainExpertise}
                    onChange={(e) => setNewDomainExpertise(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addDomainExpertise()
                      }
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addDomainExpertise}>
                    Add
                  </Button>
                </div>
                {formData.domain_expertise.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.domain_expertise.map((expertise) => (
                      <Badge key={expertise} variant="secondary">
                        {expertise}
                        <button
                          type="button"
                          onClick={() => removeDomainExpertise(expertise)}
                          className="ml-1.5 hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-source">How You Found Them</Label>
                <Input
                  id="edit-source"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-intro">Warm Intro Path</Label>
                <Input
                  id="edit-intro"
                  value={formData.warm_intro_path}
                  onChange={(e) => setFormData({ ...formData, warm_intro_path: e.target.value })}
                />
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-priority"
                    checked={formData.is_priority}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_priority: checked === true })}
                  />
                  <Label htmlFor="edit-priority" className="cursor-pointer">
                    Mark as Priority
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-followup"
                    checked={formData.needs_followup}
                    onCheckedChange={(checked) => setFormData({ ...formData, needs_followup: checked === true })}
                  />
                  <Label htmlFor="edit-followup" className="cursor-pointer">
                    Needs Follow-up
                  </Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={4}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

