"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Sidebar } from "@/components/pipeline/sidebar"
import { ArrowLeftIcon } from "@/components/pipeline/icons"
import { useAppStore } from "@/lib/store"

export default function AddFounderPage() {
  const router = useRouter()
  const { addFounder } = useAppStore()
  
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
    source: "",
    warm_intro_path: "",
    notes: "",
  })
  
  const [newAdditionalEmail, setNewAdditionalEmail] = useState("")
  
  // Custom fields
  const [customFields, setCustomFields] = useState<Array<{
    id: string
    name: string
    value: string
    type: 'text' | 'url' | 'email' | 'date'
  }>>([])
  const [showAddField, setShowAddField] = useState(false)
  const [newFieldName, setNewFieldName] = useState("")
  const [newFieldType, setNewFieldType] = useState<'text' | 'url' | 'email' | 'date'>('text')
  
  const addCustomField = () => {
    if (!newFieldName.trim()) return
    setCustomFields([
      ...customFields,
      { id: crypto.randomUUID(), name: newFieldName.trim(), value: '', type: newFieldType }
    ])
    setNewFieldName("")
    setNewFieldType('text')
    setShowAddField(false)
  }
  
  const updateCustomField = (id: string, value: string) => {
    setCustomFields(customFields.map(f => f.id === id ? { ...f, value } : f))
  }
  
  const removeCustomField = (id: string) => {
    setCustomFields(customFields.filter(f => f.id !== id))
  }
  
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
  
  const [saving, setSaving] = useState(false)
  const [showCompanyPrompt, setShowCompanyPrompt] = useState(false)
  const [newFounderId, setNewFounderId] = useState<string | null>(null)
  
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
          source: formData.source || null,
          warm_intro_path: formData.warm_intro_path || null,
          notes: formData.notes || null,
        }),
      })
      
      if (response.ok) {
        const newFounder = await response.json()
        setNewFounderId(newFounder.id)
        setShowCompanyPrompt(true)
      }
      
      setSaving(false)
    } catch (error) {
      console.error("Error adding founder:", error)
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
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar activePage="founders" />
      
      <main className="flex flex-1 flex-col">
        {/* Header */}
        <header className="flex items-center gap-4 border-b px-8 py-5">
          <Link
            href="/founders"
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary smooth"
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight">
              Add Founder
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Add a new founder to track for potential deals.
            </p>
          </div>
        </header>
        
        {/* Form Content */}
        <section className="flex-1 overflow-y-auto px-8 py-8">
          <form onSubmit={handleSubmit} className="mx-auto max-w-xl space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Jane Smith"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="border-0 border-b border-muted-foreground/30 rounded-none focus-visible:ring-0 focus:border-foreground/70 px-0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Primary Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="jane@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="h-11"
                />
              </div>
            </div>
            
            {/* Additional Emails */}
            <div className="space-y-2">
              <Label>Additional Emails</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Add another email address..."
                  value={newAdditionalEmail}
                  onChange={(e) => setNewAdditionalEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addAdditionalEmail()
                    }
                  }}
                  className="h-11"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addAdditionalEmail}
                  disabled={!newAdditionalEmail.trim()}
                >
                  Add
                </Button>
              </div>
              {formData.additional_emails.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.additional_emails.map((email) => (
                    <div
                      key={email}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary rounded-full text-sm"
                    >
                      <span>{email}</span>
                      <button
                        type="button"
                        onClick={() => removeAdditionalEmail(email)}
                        className="text-muted-foreground hover:text-foreground smooth"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Add all email addresses this person uses for better matching with calendar and email sync.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role_title">Role / Title</Label>
                <Input
                  id="role_title"
                  placeholder="CEO & Co-Founder"
                  value={formData.role_title}
                  onChange={(e) => setFormData({ ...formData, role_title: e.target.value })}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="San Francisco, CA"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="h-11"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Brief background and what they're known for..."
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={2}
                className="resize-none"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn</Label>
                <Input
                  id="linkedin"
                  placeholder="linkedin.com/in/janesmith"
                  value={formData.linkedin}
                  onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="twitter">Twitter / X</Label>
                <Input
                  id="twitter"
                  placeholder="@janesmith"
                  value={formData.twitter}
                  onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                  className="h-11"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="previous_companies">Previous Companies</Label>
                <Input
                  id="previous_companies"
                  placeholder="Google, Stripe, etc."
                  value={formData.previous_companies}
                  onChange={(e) => setFormData({ ...formData, previous_companies: e.target.value })}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="education">Education</Label>
                <Input
                  id="education"
                  placeholder="Stanford CS, MIT, etc."
                  value={formData.education}
                  onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                  className="h-11"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="source">How You Found Them</Label>
                <Input
                  id="source"
                  placeholder="Demo day, referral, Twitter..."
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="warm_intro_path">Warm Intro Path</Label>
                <Input
                  id="warm_intro_path"
                  placeholder="Through Sarah at Sequoia"
                  value={formData.warm_intro_path}
                  onChange={(e) => setFormData({ ...formData, warm_intro_path: e.target.value })}
                  className="h-11"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional context, thesis fit, things to remember..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="resize-none"
              />
            </div>
            
            {/* Custom Fields */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-base">Custom Fields</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddField(true)}
                >
                  <svg className="h-3.5 w-3.5 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Add Field
                </Button>
              </div>
              
              {showAddField && (
                <div className="flex gap-2 p-3 bg-secondary/50 rounded-lg">
                  <Input
                    placeholder="Field name..."
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    className="flex-1 h-9"
                  />
                  <select
                    value={newFieldType}
                    onChange={(e) => setNewFieldType(e.target.value as any)}
                    className="h-9 px-3 rounded-md border bg-background text-sm"
                  >
                    <option value="text">Text</option>
                    <option value="url">URL</option>
                    <option value="email">Email</option>
                    <option value="date">Date</option>
                  </select>
                  <Button type="button" size="sm" onClick={addCustomField} className="h-9">
                    Add
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddField(false)} className="h-9">
                    Cancel
                  </Button>
                </div>
              )}
              
              {customFields.length > 0 && (
                <div className="space-y-3">
                  {customFields.map((field) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <Label className="w-32 text-sm text-muted-foreground truncate" title={field.name}>
                        {field.name}
                      </Label>
                      <Input
                        type={field.type === 'date' ? 'date' : field.type}
                        placeholder={`Enter ${field.name.toLowerCase()}...`}
                        value={field.value}
                        onChange={(e) => updateCustomField(field.id, e.target.value)}
                        className="flex-1 h-10"
                      />
                      <button
                        type="button"
                        onClick={() => removeCustomField(field.id)}
                        className="h-10 w-10 flex items-center justify-center rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground smooth"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {customFields.length === 0 && !showAddField && (
                <p className="text-sm text-muted-foreground">
                  No custom fields yet. Add fields to track additional information about this founder.
                </p>
              )}
            </div>
            
            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/founders")}
                className="px-6"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={!formData.name.trim() || !formData.email.trim() || saving}
                className="px-6"
              >
                {saving ? "Adding..." : "Add Founder"}
              </Button>
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
              Would you like to add a company for {formData.name}? You can also do this later.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              If this founder is actively building a company, you can create a company profile and add it to your deal pipeline.
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
