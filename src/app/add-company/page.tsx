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
import { ArrowLeftIcon, SearchIcon, CheckIcon } from "@/components/pipeline/icons"
import { useAppStore, STAGES, type Stage, type Founder } from "@/lib/store"

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
    location: "",
    stage: "Inbound" as Stage,
    tags: [] as string[],
    
    useExistingFounder: !!preSelectedFounderId,
    selectedFounderId: preSelectedFounderId || "",
    founderName: preSelectedFounderName || "",
    founderEmail: preSelectedFounderEmail || "",
    founderLinkedIn: "",
    founderTwitter: "",
    founderRole: "",
    
    amountRaising: "",
    valuation: "",
    source: "",
    notes: "",
  })
  
  const [saving, setSaving] = useState(false)
  const [founderSearch, setFounderSearch] = useState("")
  const [showFounderSearch, setShowFounderSearch] = useState(false)
  
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
  
  useEffect(() => {
    fetchTags()
    fetchFounders()
  }, [fetchTags, fetchFounders])
  
  const filteredFounders = useMemo(() => {
    if (!founderSearch.trim()) return founders.slice(0, 5)
    const q = founderSearch.toLowerCase()
    return founders.filter(f => 
      f.name.toLowerCase().includes(q) ||
      f.email.toLowerCase().includes(q)
    ).slice(0, 5)
  }, [founders, founderSearch])
  
  const selectedFounder = useMemo(() => {
    if (!formData.selectedFounderId) return null
    return founders.find(f => f.id === formData.selectedFounderId)
  }, [founders, formData.selectedFounderId])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return
    
    setSaving(true)
    
    try {
      const companyData: any = {
        name: formData.name,
        description: formData.description,
        website: formData.website,
        stage: formData.stage,
        tags: formData.tags,
      }
      
      if (formData.useExistingFounder && formData.selectedFounderId) {
        companyData.founder_id = formData.selectedFounderId
      } else if (formData.founderName && formData.founderEmail) {
        companyData.founder_name = formData.founderName
        companyData.founder_email = formData.founderEmail
      }
      
      const newCompany = await addCompany(companyData)
      
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
  
  const selectFounder = (founder: Founder) => {
    setFormData(prev => ({
      ...prev,
      useExistingFounder: true,
      selectedFounderId: founder.id,
      founderName: founder.name,
      founderEmail: founder.email,
      founderLinkedIn: founder.linkedin || "",
      founderTwitter: founder.twitter || "",
      founderRole: founder.role_title || "",
    }))
    setFounderSearch("")
    setShowFounderSearch(false)
  }
  
  const clearFounderSelection = () => {
    setFormData(prev => ({
      ...prev,
      useExistingFounder: false,
      selectedFounderId: "",
      founderName: "",
      founderEmail: "",
      founderLinkedIn: "",
      founderTwitter: "",
      founderRole: "",
    }))
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      
      <main className="flex flex-1 flex-col">
        {/* Header */}
        <header className="flex items-center gap-4 border-b px-8 py-5">
          <Link
            href="/"
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary smooth"
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight">
              Add Company
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Add a new company to your deal pipeline.
            </p>
          </div>
        </header>
        
        {/* Form Content */}
        <section className="flex-1 overflow-y-auto px-8 py-8">
          <form onSubmit={handleSubmit} className="mx-auto max-w-xl space-y-8">
            {/* Company Info */}
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Company Name</Label>
                  <Input
                    id="name"
                    placeholder="Acme Inc."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    placeholder="https://acme.com"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="h-11"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="What does this company do? What problem are they solving?"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="resize-none"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
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
                <div className="space-y-2">
                  <Label htmlFor="stage">Stage</Label>
                  <Select
                    value={formData.stage}
                    onValueChange={(v) => setFormData({ ...formData, stage: v as Stage })}
                  >
                    <SelectTrigger className="h-11">
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
              </div>
              
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={`px-3 py-1.5 rounded-full text-sm smooth ${
                        formData.tags.includes(tag.id)
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      }`}
                    >
                      {tag.label}
                    </button>
                  ))}
                  {tags.length === 0 && (
                    <span className="text-sm text-muted-foreground">Loading tags...</span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Founder */}
            <div className="space-y-5">
              <Label className="text-base font-medium">Founder</Label>
              
              {selectedFounder ? (
                <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/40">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                        {selectedFounder.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{selectedFounder.name}</p>
                      <p className="text-sm text-muted-foreground">{selectedFounder.email}</p>
                    </div>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={clearFounderSelection}>
                    Change
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {founders.length > 0 && (
                    <div className="space-y-2">
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
                          className="pl-9 h-11"
                        />
                      </div>
                      
                      {showFounderSearch && filteredFounders.length > 0 && (
                        <div className="border rounded-xl overflow-hidden bg-background shadow-sm">
                          {filteredFounders.map(founder => (
                            <button
                              key={founder.id}
                              type="button"
                              onClick={() => selectFounder(founder)}
                              className="w-full flex items-center gap-3 p-3 hover:bg-secondary/50 smooth text-left"
                            >
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-secondary text-xs font-medium">
                                  {founder.name.split(' ').map(n => n[0]).join('')}
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
                      
                      <p className="text-xs text-center text-muted-foreground py-2">or add new founder details below</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="founderName">Name</Label>
                      <Input
                        id="founderName"
                        placeholder="Jane Smith"
                        value={formData.founderName}
                        onChange={(e) => setFormData({ ...formData, founderName: e.target.value, useExistingFounder: false })}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="founderEmail">Email</Label>
                      <Input
                        id="founderEmail"
                        type="email"
                        placeholder="jane@example.com"
                        value={formData.founderEmail}
                        onChange={(e) => setFormData({ ...formData, founderEmail: e.target.value, useExistingFounder: false })}
                        className="h-11"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Deal Info */}
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amountRaising">Raising</Label>
                  <Input
                    id="amountRaising"
                    placeholder="$2M"
                    value={formData.amountRaising}
                    onChange={(e) => setFormData({ ...formData, amountRaising: e.target.value })}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valuation">Valuation</Label>
                  <Input
                    id="valuation"
                    placeholder="$10M"
                    value={formData.valuation}
                    onChange={(e) => setFormData({ ...formData, valuation: e.target.value })}
                    className="h-11"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <Input
                  id="source"
                  placeholder="Referral, Demo Day, Cold inbound..."
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="h-11"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Initial thoughts, context, or notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="resize-none"
                />
              </div>
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
                  No custom fields yet. Add fields to track additional information about this company.
                </p>
              )}
            </div>
            
            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/")}
                className="px-6"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!formData.name.trim() || saving} className="px-6">
                {saving ? "Adding..." : "Add Company"}
              </Button>
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
