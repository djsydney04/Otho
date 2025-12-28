"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Sidebar } from "@/components/pipeline/sidebar"
import { ArrowLeftIcon, SearchIcon } from "@/components/pipeline/icons"
import { useAppStore, STAGES, type Stage, type Founder } from "@/lib/store"
import { Checkbox } from "@/components/ui/checkbox"

interface FounderInput {
  id: string // 'new' for new founders, actual ID for existing
  name: string
  email: string
  role_title?: string
  linkedin?: string
  twitter?: string
  isExisting?: boolean
}

function AddCompanyForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { tags, founders, addCompany, fetchTags, fetchFounders } = useAppStore()
  
  // Get pre-selected founder from URL params
  const preSelectedFounderId = searchParams.get("founder_id")
  const preSelectedFounderName = searchParams.get("founder_name")
  const preSelectedFounderEmail = searchParams.get("founder_email")
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    website: "",
    stage: "Inbound" as Stage,
    tags: [] as string[],
    is_priority: false,
    needs_diligence: false,
    needs_followup: false,
    owner: "",
    notes: "",
  })
  
  const [foundersList, setFoundersList] = useState<FounderInput[]>(() => {
    // Initialize with pre-selected founder if provided
    if (preSelectedFounderId && preSelectedFounderName && preSelectedFounderEmail) {
      return [{
        id: preSelectedFounderId,
        name: preSelectedFounderName,
        email: preSelectedFounderEmail,
        isExisting: true,
      }]
    }
    return []
  })
  
  const [saving, setSaving] = useState(false)
  const [founderSearch, setFounderSearch] = useState("")
  const [showFounderSearch, setShowFounderSearch] = useState(false)
  const [newFounderForm, setNewFounderForm] = useState<Partial<FounderInput>>({
    name: "",
    email: "",
    role_title: "",
    linkedin: "",
    twitter: "",
  })
  const [showNewFounderForm, setShowNewFounderForm] = useState(false)
  
  // Custom fields state
  const [customFields, setCustomFields] = useState<Array<{
    id: string
    name: string
    value: string
    type: 'text' | 'url' | 'email' | 'date' | 'number'
  }>>([])
  const [showAddCustomField, setShowAddCustomField] = useState(false)
  const [newCustomFieldName, setNewCustomFieldName] = useState("")
  const [newCustomFieldType, setNewCustomFieldType] = useState<'text' | 'url' | 'email' | 'date' | 'number'>('text')
  
  const addCustomField = () => {
    if (!newCustomFieldName.trim()) return
    setCustomFields([
      ...customFields,
      { id: crypto.randomUUID(), name: newCustomFieldName.trim(), value: '', type: newCustomFieldType }
    ])
    setNewCustomFieldName("")
    setNewCustomFieldType('text')
    setShowAddCustomField(false)
  }
  
  const updateCustomField = (id: string, value: string) => {
    setCustomFields(customFields.map(f => f.id === id ? { ...f, value } : f))
  }
  
  const removeCustomField = (id: string) => {
    setCustomFields(customFields.filter(f => f.id !== id))
  }
  
  useEffect(() => {
    fetchTags()
    fetchFounders()
  }, [fetchTags, fetchFounders])
  
  const filteredFounders = useMemo(() => {
    if (!founderSearch.trim()) return founders.slice(0, 5)
    const q = founderSearch.toLowerCase()
    return founders.filter(f => 
      (f.name.toLowerCase().includes(q) || f.email.toLowerCase().includes(q)) &&
      !foundersList.some(fl => fl.id === f.id)
    ).slice(0, 5)
  }, [founders, founderSearch, foundersList])
  
  const addExistingFounder = (founder: Founder) => {
    setFoundersList(prev => [...prev, {
      id: founder.id,
      name: founder.name,
      email: founder.email,
      role_title: founder.role_title || undefined,
      linkedin: founder.linkedin || undefined,
      twitter: founder.twitter || undefined,
      isExisting: true,
    }])
    setFounderSearch("")
    setShowFounderSearch(false)
  }
  
  const addNewFounder = () => {
    if (!newFounderForm.name || !newFounderForm.email) return
    
    setFoundersList(prev => [...prev, {
      id: `new-${Date.now()}`,
      name: newFounderForm.name!,
      email: newFounderForm.email!,
      role_title: newFounderForm.role_title,
      linkedin: newFounderForm.linkedin,
      twitter: newFounderForm.twitter,
      isExisting: false,
    }])
    setNewFounderForm({ name: "", email: "", role_title: "", linkedin: "", twitter: "" })
    setShowNewFounderForm(false)
  }
  
  const removeFounder = (id: string) => {
    setFoundersList(prev => prev.filter(f => f.id !== id))
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return
    
    setSaving(true)
    
    try {
      // For now, use the first founder (schema only supports one founder_id)
      // In the future, we can create a junction table for multiple founders
      const primaryFounder = foundersList[0]
      
      const companyData: any = {
        name: formData.name,
        description: formData.description,
        website: formData.website,
        stage: formData.stage,
        tags: formData.tags,
        is_priority: formData.is_priority || undefined,
        needs_diligence: formData.needs_diligence || undefined,
        needs_followup: formData.needs_followup || undefined,
        owner: formData.owner || undefined,
      }
      
      // If we have an existing founder, use their ID (UUID reference)
      if (primaryFounder?.isExisting) {
        companyData.founder_id = primaryFounder.id
      } else if (primaryFounder) {
        // New founder - send founder object, API will create it first, then link by UUID
        companyData.founder = {
          name: primaryFounder.name,
          email: primaryFounder.email,
          role_title: primaryFounder.role_title,
          linkedin: primaryFounder.linkedin,
          twitter: primaryFounder.twitter,
        }
      }
      
      const newCompany = await addCompany(companyData)
      
      if (newCompany && customFields.length > 0) {
        // Save custom fields
        try {
          const customFieldsData = customFields
            .filter(f => f.value.trim())
            .map(f => ({
              company_id: newCompany.id,
              field_name: f.name,
              field_type: f.type,
              field_value: f.value,
            }))
          
          if (customFieldsData.length > 0) {
            await fetch('/api/companies/custom-fields', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ company_id: newCompany.id, fields: customFieldsData }),
            })
          }
        } catch (error) {
          console.error("Error saving custom fields:", error)
          // Don't block navigation if custom fields fail
        }
      }
      
      if (newCompany) {
        router.push(`/company/${newCompany.id}`)
      } else {
        setSaving(false)
      }
    } catch (error) {
      console.error("Error adding company:", error)
      setSaving(false)
    }
  }
  
  const toggleTag = (tagId: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tagId)
        ? prev.tags.filter((id) => id !== tagId)
        : [...prev.tags, tagId],
    }))
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar activePage="pipeline" />
      
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between border-b px-8 py-4 flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-4">
            <Link
              href="/pipeline"
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary smooth"
            >
              <ArrowLeftIcon className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="font-display text-lg font-semibold tracking-tight">
                Add Company
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Create a new company in your deal pipeline
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push("/pipeline")}
            >
              Cancel
            </Button>
            <Button 
              size="sm"
              disabled={!formData.name.trim() || saving}
              onClick={handleSubmit}
            >
              {saving ? "Adding..." : "Add Company"}
            </Button>
          </div>
        </header>
        
        {/* Form Content - Scrollable */}
        <section className="flex-1 px-8 py-6 overflow-y-auto">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Company Info */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-sm font-semibold mb-4 text-foreground">Company Information</h2>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Company Name *</Label>
                      <Input
                        id="name"
                        placeholder="Acme Inc."
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        autoFocus
                        className="h-10"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="website" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Website</Label>
                      <Input
                        id="website"
                        placeholder="https://acme.com"
                        type="url"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        className="h-10"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="description" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="What does this company do? What problem are they solving?"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={4}
                        className="resize-none"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="stage" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Stage</Label>
                      <Select
                        value={formData.stage}
                        onValueChange={(v) => setFormData({ ...formData, stage: v as Stage })}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select stage" />
                        </SelectTrigger>
                        <SelectContent>
                          {STAGES.map((stage) => (
                            <SelectItem key={stage} value={stage}>
                              {stage}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tags</Label>
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag) => (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => toggleTag(tag.id)}
                            className={`px-3 py-1.5 rounded-full text-xs smooth transition-colors ${
                              formData.tags.includes(tag.id)
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                            }`}
                          >
                            {tag.label}
                          </button>
                        ))}
                        {tags.length === 0 && (
                          <span className="text-xs text-muted-foreground">Loading tags...</span>
                        )}
                      </div>
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
                        id="needs_diligence"
                        checked={formData.needs_diligence}
                        onCheckedChange={(checked) => setFormData({ ...formData, needs_diligence: checked === true })}
                      />
                      <Label htmlFor="needs_diligence" className="text-sm font-normal cursor-pointer">
                        Needs Diligence
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
                    
                    <div className="space-y-1.5 pt-2">
                      <Label htmlFor="owner" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Owner</Label>
                      <Input
                        id="owner"
                        placeholder="Your name or team member"
                        value={formData.owner}
                        onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                        className="h-10"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <h2 className="text-sm font-semibold mb-4 text-foreground">Notes</h2>
                  <Textarea
                    placeholder="Initial thoughts, context, or additional notes..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={4}
                    className="resize-none"
                  />
                </div>

                {/* Custom Fields */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-foreground">Custom Fields</h2>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddCustomField(true)}
                    >
                      <svg className="h-3.5 w-3.5 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      Add Field
                    </Button>
                  </div>
                  
                  {showAddCustomField && (
                    <div className="flex gap-2 p-3 bg-muted/30 rounded-lg mb-3">
                      <Input
                        placeholder="Field name..."
                        value={newCustomFieldName}
                        onChange={(e) => setNewCustomFieldName(e.target.value)}
                        className="flex-1 h-9"
                      />
                      <Select
                        value={newCustomFieldType}
                        onValueChange={(v) => setNewCustomFieldType(v as any)}
                      >
                        <SelectTrigger className="w-32 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="url">URL</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button type="button" size="sm" onClick={addCustomField} className="h-9">
                        Add
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddCustomField(false)} className="h-9">
                        Cancel
                      </Button>
                    </div>
                  )}
                  
                  {customFields.length > 0 && (
                    <div className="space-y-3">
                      {customFields.map((field) => (
                        <div key={field.id} className="flex items-center gap-2">
                          <Label className="w-32 text-xs text-muted-foreground truncate" title={field.name}>
                            {field.name}
                          </Label>
                          <Input
                            type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : field.type}
                            placeholder={`Enter ${field.name.toLowerCase()}...`}
                            value={field.value}
                            onChange={(e) => updateCustomField(field.id, e.target.value)}
                            className="flex-1 h-9"
                          />
                          <button
                            type="button"
                            onClick={() => removeCustomField(field.id)}
                            className="h-9 w-9 flex items-center justify-center rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive smooth"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {customFields.length === 0 && !showAddCustomField && (
                    <p className="text-xs text-muted-foreground">
                      Add custom fields to track additional information about this company.
                    </p>
                  )}
                </div>
              </div>
              
              {/* Right Column - Founders */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-sm font-semibold mb-4 text-foreground">Founders</h2>
                  
                  {/* Existing Founders List */}
                  {foundersList.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {foundersList.map((founder) => (
                        <div key={founder.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/40 border">
                          <Avatar className="h-9 w-9 flex-shrink-0">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                              {founder.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{founder.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{founder.email}</p>
                            {founder.role_title && (
                              <p className="text-xs text-muted-foreground">{founder.role_title}</p>
                            )}
                          </div>
                          {founder.isExisting && (
                            <Badge variant="secondary" className="text-xs">Existing</Badge>
                          )}
                          <button
                            type="button"
                            onClick={() => removeFounder(founder.id)}
                            className="flex-shrink-0 h-7 w-7 rounded-md hover:bg-destructive/10 flex items-center justify-center smooth"
                          >
                            <svg className="h-3.5 w-3.5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Add Existing Founder */}
                  {!showNewFounderForm && (
                    <div className="space-y-2 mb-4">
                      <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Search existing founders..."
                          value={founderSearch}
                          onChange={(e) => {
                            setFounderSearch(e.target.value)
                            setShowFounderSearch(true)
                          }}
                          onFocus={() => setShowFounderSearch(true)}
                          className="pl-9 h-10"
                        />
                      </div>
                      
                      {showFounderSearch && filteredFounders.length > 0 && (
                        <div className="border rounded-lg overflow-hidden bg-background shadow-sm max-h-48 overflow-y-auto">
                          {filteredFounders.map(founder => (
                            <button
                              key={founder.id}
                              type="button"
                              onClick={() => addExistingFounder(founder)}
                              className="w-full flex items-center gap-3 p-2.5 hover:bg-secondary/50 smooth text-left"
                            >
                              <Avatar className="h-7 w-7">
                                <AvatarFallback className="bg-secondary text-[10px] font-medium">
                                  {founder.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{founder.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{founder.email}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      
                      <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs">
                          <span className="bg-background px-2 text-muted-foreground">or</span>
                        </div>
                      </div>
                      
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => setShowNewFounderForm(true)}
                      >
                        Add New Founder
                      </Button>
                    </div>
                  )}
                  
                  {/* New Founder Form */}
                  {showNewFounderForm && (
                    <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium">New Founder</h3>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowNewFounderForm(false)
                            setNewFounderForm({ name: "", email: "", role_title: "", linkedin: "", twitter: "" })
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="new-founder-name" className="text-xs">Name *</Label>
                          <Input
                            id="new-founder-name"
                            placeholder="Jane Smith"
                            value={newFounderForm.name}
                            onChange={(e) => setNewFounderForm({ ...newFounderForm, name: e.target.value })}
                            className="h-9"
                          />
                        </div>
                        
                        <div className="space-y-1.5">
                          <Label htmlFor="new-founder-email" className="text-xs">Email *</Label>
                          <Input
                            id="new-founder-email"
                            type="email"
                            placeholder="jane@example.com"
                            value={newFounderForm.email}
                            onChange={(e) => setNewFounderForm({ ...newFounderForm, email: e.target.value })}
                            className="h-9"
                          />
                        </div>
                        
                        <div className="space-y-1.5">
                          <Label htmlFor="new-founder-role" className="text-xs">Role / Title</Label>
                          <Input
                            id="new-founder-role"
                            placeholder="CEO & Co-Founder"
                            value={newFounderForm.role_title}
                            onChange={(e) => setNewFounderForm({ ...newFounderForm, role_title: e.target.value })}
                            className="h-9"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1.5">
                            <Label htmlFor="new-founder-linkedin" className="text-xs">LinkedIn</Label>
                            <Input
                              id="new-founder-linkedin"
                              placeholder="linkedin.com/in/..."
                              value={newFounderForm.linkedin}
                              onChange={(e) => setNewFounderForm({ ...newFounderForm, linkedin: e.target.value })}
                              className="h-9"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="new-founder-twitter" className="text-xs">Twitter</Label>
                            <Input
                              id="new-founder-twitter"
                              placeholder="@username"
                              value={newFounderForm.twitter}
                              onChange={(e) => setNewFounderForm({ ...newFounderForm, twitter: e.target.value })}
                              className="h-9"
                            />
                          </div>
                        </div>
                        
                        <Button
                          type="button"
                          size="sm"
                          className="w-full"
                          onClick={addNewFounder}
                          disabled={!newFounderForm.name || !newFounderForm.email}
                        >
                          Add Founder
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {foundersList.length === 0 && !showNewFounderForm && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No founders added yet. Add an existing founder or create a new one.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </form>
        </section>
      </main>
    </div>
  )
}

export default function AddCompanyPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <AddCompanyForm />
    </Suspense>
  )
}
