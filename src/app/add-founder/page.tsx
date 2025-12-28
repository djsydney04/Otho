"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Sidebar } from "@/components/pipeline/sidebar"
import { ArrowLeftIcon } from "@/components/pipeline/icons"

export default function AddFounderPage() {
  const router = useRouter()
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    additional_emails: [] as string[],
    role_title: "",
    location: "",
    linkedin: "",
    twitter: "",
    previous_companies: "",
    education: "",
    bio: "",
    domain_expertise: [] as string[],
    source: "",
    warm_intro_path: "",
    notes: "",
    is_priority: false,
    needs_followup: false,
  })
  
  const [newAdditionalEmail, setNewAdditionalEmail] = useState("")
  const [newDomainExpertise, setNewDomainExpertise] = useState("")
  const [saving, setSaving] = useState(false)
  const [showCompanyPrompt, setShowCompanyPrompt] = useState(false)
  const [newFounderId, setNewFounderId] = useState<string | null>(null)
  
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
      const response = await fetch('/api/founders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        }),
      })
      
      if (response.ok) {
        const newFounder = await response.json()
        setNewFounderId(newFounder.id)
        setShowCompanyPrompt(true)
      } else {
        const error = await response.json()
        console.error("Error adding founder:", error)
        alert(error.error || "Failed to create founder")
      }
      
      setSaving(false)
    } catch (error) {
      console.error("Error adding founder:", error)
      alert("Failed to create founder. Please try again.")
      setSaving(false)
    }
  }
  
  const handleSkipCompany = () => {
    setShowCompanyPrompt(false)
    router.push("/founders")
  }
  
  const handleAddCompany = () => {
    setShowCompanyPrompt(false)
    router.push(`/add-company?founder_id=${newFounderId}&founder_name=${encodeURIComponent(formData.name)}&founder_email=${encodeURIComponent(formData.email)}`)
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar activePage="founders" />
      
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between border-b px-8 py-4 flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-4">
            <Link
              href="/founders"
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary smooth"
            >
              <ArrowLeftIcon className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="font-display text-lg font-semibold tracking-tight">
                Add Founder
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Create a new founder profile
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push("/founders")}
            >
              Cancel
            </Button>
            <Button 
              size="sm"
              disabled={!formData.name.trim() || !formData.email.trim() || saving}
              onClick={handleSubmit}
            >
              {saving ? "Adding..." : "Add Founder"}
            </Button>
          </div>
        </header>
        
        {/* Form Content - Scrollable */}
        <section className="flex-1 px-8 py-6 overflow-y-auto">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Basic Info */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-sm font-semibold mb-4 text-foreground">Basic Information</h2>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Full Name *</Label>
                      <Input
                        id="name"
                        placeholder="Jane Smith"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        autoFocus
                        className="h-10"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Primary Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="jane@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        className="h-10"
                      />
                    </div>
                    
                    {/* Additional Emails */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Additional Emails</Label>
                      <div className="flex gap-2">
                        <Input
                          type="email"
                          placeholder="Add another email..."
                          value={newAdditionalEmail}
                          onChange={(e) => setNewAdditionalEmail(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              addAdditionalEmail()
                            }
                          }}
                          className="h-10"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addAdditionalEmail}
                          disabled={!newAdditionalEmail.trim()}
                        >
                          Add
                        </Button>
                      </div>
                      {formData.additional_emails.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {formData.additional_emails.map((email) => (
                            <Badge key={email} variant="secondary" className="text-xs">
                              {email}
                              <button
                                type="button"
                                onClick={() => removeAdditionalEmail(email)}
                                className="ml-1.5 hover:text-destructive smooth"
                              >
                                ×
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Add all email addresses this person uses for better matching
                      </p>
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="role_title" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Role / Title</Label>
                      <Input
                        id="role_title"
                        placeholder="CEO & Co-Founder"
                        value={formData.role_title}
                        onChange={(e) => setFormData({ ...formData, role_title: e.target.value })}
                        className="h-10"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="location" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Location</Label>
                      <Input
                        id="location"
                        placeholder="San Francisco, CA"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className="h-10"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="bio" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Bio</Label>
                      <Textarea
                        id="bio"
                        placeholder="Brief background and what they're known for..."
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        rows={3}
                        className="resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Professional Links */}
                <div>
                  <h2 className="text-sm font-semibold mb-4 text-foreground">Professional Links</h2>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="linkedin" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">LinkedIn</Label>
                      <Input
                        id="linkedin"
                        placeholder="linkedin.com/in/janesmith"
                        value={formData.linkedin}
                        onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                        className="h-10"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="twitter" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Twitter / X</Label>
                      <Input
                        id="twitter"
                        placeholder="@janesmith"
                        value={formData.twitter}
                        onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                        className="h-10"
                      />
                    </div>
                  </div>
                </div>

                {/* Background */}
                <div>
                  <h2 className="text-sm font-semibold mb-4 text-foreground">Background</h2>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="previous_companies" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Previous Companies</Label>
                      <Input
                        id="previous_companies"
                        placeholder="Google, Stripe, etc."
                        value={formData.previous_companies}
                        onChange={(e) => setFormData({ ...formData, previous_companies: e.target.value })}
                        className="h-10"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="education" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Education</Label>
                      <Input
                        id="education"
                        placeholder="Stanford CS, MIT, etc."
                        value={formData.education}
                        onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                        className="h-10"
                      />
                    </div>
                    
                    {/* Domain Expertise */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Domain Expertise</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add expertise area..."
                          value={newDomainExpertise}
                          onChange={(e) => setNewDomainExpertise(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              addDomainExpertise()
                            }
                          }}
                          className="h-10"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addDomainExpertise}
                          disabled={!newDomainExpertise.trim()}
                        >
                          Add
                        </Button>
                      </div>
                      {formData.domain_expertise.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {formData.domain_expertise.map((expertise) => (
                            <Badge key={expertise} variant="secondary" className="text-xs">
                              {expertise}
                              <button
                                type="button"
                                onClick={() => removeDomainExpertise(expertise)}
                                className="ml-1.5 hover:text-destructive smooth"
                              >
                                ×
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Right Column */}
              <div className="space-y-6">
                {/* Source & Introduction */}
                <div>
                  <h2 className="text-sm font-semibold mb-4 text-foreground">Source & Introduction</h2>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="source" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">How You Found Them</Label>
                      <Input
                        id="source"
                        placeholder="Demo day, referral, Twitter..."
                        value={formData.source}
                        onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                        className="h-10"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="warm_intro_path" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Warm Intro Path</Label>
                      <Input
                        id="warm_intro_path"
                        placeholder="Through Sarah at Sequoia"
                        value={formData.warm_intro_path}
                        onChange={(e) => setFormData({ ...formData, warm_intro_path: e.target.value })}
                        className="h-10"
                      />
                    </div>
                  </div>
                </div>

                {/* Pipeline Settings */}
                <div>
                  <h2 className="text-sm font-semibold mb-4 text-foreground">Pipeline Settings</h2>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="is_priority"
                        checked={formData.is_priority}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_priority: checked === true })}
                      />
                      <Label htmlFor="is_priority" className="text-sm font-normal cursor-pointer">
                        Mark as Priority
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="needs_followup"
                        checked={formData.needs_followup}
                        onCheckedChange={(checked) => setFormData({ ...formData, needs_followup: checked === true })}
                      />
                      <Label htmlFor="needs_followup" className="text-sm font-normal cursor-pointer">
                        Needs Follow-up
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <h2 className="text-sm font-semibold mb-4 text-foreground">Notes</h2>
                  <Textarea
                    placeholder="Additional context, thesis fit, things to remember..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={6}
                    className="resize-none"
                  />
                </div>
              </div>
            </div>
          </form>
        </section>
      </main>
      
      {/* Company Prompt Dialog */}
      <Dialog open={showCompanyPrompt} onOpenChange={setShowCompanyPrompt}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add a Company?</DialogTitle>
            <DialogDescription>
              Would you like to add a company for {formData.name}?
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <p className="text-sm text-muted-foreground">
              Create a company profile and add it to your deal pipeline.
            </p>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleSkipCompany}>
              Skip for now
            </Button>
            <Button onClick={handleAddCompany}>
              Add Company
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
