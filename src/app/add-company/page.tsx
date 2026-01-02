"use client"

import { useState, useEffect, useMemo, Suspense, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Sidebar } from "@/components/pipeline/sidebar"
import { useAppStore, STAGES, type Stage, type Founder } from "@/lib/store"
import { cn } from "@/lib/utils"

interface FounderInput {
  id: string
  name: string
  email: string
  role_title?: string
  isExisting?: boolean
}

function AddCompanyForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { tags, founders, addCompany, fetchTags, fetchFounders } = useAppStore()
  const nameInputRef = useRef<HTMLInputElement>(null)
  
  const preSelectedFounderId = searchParams.get("founder_id")
  const preSelectedFounderName = searchParams.get("founder_name")
  const preSelectedFounderEmail = searchParams.get("founder_email")
  
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    website: "",
    stage: "Inbound" as Stage,
    tags: [] as string[],
  })
  
  const [founder, setFounder] = useState<FounderInput | null>(() => {
    if (preSelectedFounderId && preSelectedFounderName && preSelectedFounderEmail) {
      return {
        id: preSelectedFounderId,
        name: preSelectedFounderName,
        email: preSelectedFounderEmail,
        isExisting: true,
      }
    }
    return null
  })
  
  const [saving, setSaving] = useState(false)
  const [founderSearch, setFounderSearch] = useState("")
  const [showFounderDropdown, setShowFounderDropdown] = useState(false)
  const [newFounder, setNewFounder] = useState({ name: "", email: "" })
  
  useEffect(() => {
    fetchTags()
    fetchFounders()
  }, [fetchTags, fetchFounders])
  
  useEffect(() => {
    // Auto-focus name input on mount
    setTimeout(() => nameInputRef.current?.focus(), 100)
  }, [])
  
  const filteredFounders = useMemo(() => {
    if (!founderSearch.trim()) return founders.slice(0, 6)
    const q = founderSearch.toLowerCase()
    return founders.filter(f => 
      f.name.toLowerCase().includes(q) || f.email.toLowerCase().includes(q)
    ).slice(0, 6)
  }, [founders, founderSearch])
  
  const canProceed = step === 1 ? formData.name.trim().length > 0 : true
  
  const handleSubmit = async () => {
    if (!formData.name.trim()) return
    
    setSaving(true)
    
    try {
      const companyData: any = {
        name: formData.name,
        description: formData.description || undefined,
        website: formData.website || undefined,
        stage: formData.stage,
        tags: formData.tags,
      }
      
      if (founder?.isExisting) {
        companyData.founder_id = founder.id
      } else if (founder) {
        companyData.founder = {
          name: founder.name,
          email: founder.email,
        }
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
  
  const selectExistingFounder = (f: Founder) => {
    setFounder({
      id: f.id,
      name: f.name,
      email: f.email,
      role_title: f.role_title || undefined,
      isExisting: true,
    })
    setFounderSearch("")
    setShowFounderDropdown(false)
  }
  
  const addNewFounder = () => {
    if (!newFounder.name.trim() || !newFounder.email.trim()) return
    setFounder({
      id: `new-${Date.now()}`,
      name: newFounder.name,
      email: newFounder.email,
      isExisting: false,
    })
    setNewFounder({ name: "", email: "" })
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar activePage="pipeline" />
      
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Minimal Header */}
        <header className="flex items-center justify-between px-8 py-5 flex-shrink-0">
          <Link
            href="/pipeline"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground smooth group"
          >
            <svg className="h-4 w-4 group-hover:-translate-x-0.5 smooth" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
          
          <div className="flex items-center gap-3">
            {step > 1 && (
              <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            {step < 2 ? (
              <Button size="sm" disabled={!canProceed} onClick={() => setStep(2)}>
                Continue
              </Button>
            ) : (
              <Button size="sm" disabled={saving} onClick={handleSubmit}>
                {saving ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating...
                  </span>
                ) : "Add to Pipeline"}
              </Button>
            )}
          </div>
        </header>
        
        {/* Progress indicator */}
        <div className="px-8">
          <div className="max-w-xl mx-auto flex gap-2">
            <div className={cn("h-1 flex-1 rounded-full smooth", step >= 1 ? "bg-primary" : "bg-muted")} />
            <div className={cn("h-1 flex-1 rounded-full smooth", step >= 2 ? "bg-primary" : "bg-muted")} />
          </div>
        </div>
        
        {/* Form Content */}
        <section className="flex-1 px-8 py-8 overflow-y-auto">
          <div className="max-w-xl mx-auto">
            
            {/* Step 1: Company Basics */}
            {step === 1 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="text-center space-y-2">
                  <h1 className="text-2xl font-semibold tracking-tight">Add a company</h1>
                  <p className="text-muted-foreground">Start with the basics. You can add more details later.</p>
                </div>
                
                {/* Company Name - Hero Input */}
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Input
                      ref={nameInputRef}
                      placeholder="Company name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="h-14 text-lg px-4 border-2 focus:border-primary"
                      onKeyDown={(e) => e.key === "Enter" && canProceed && setStep(2)}
                    />
                    {formData.name && (
                      <p className="text-xs text-muted-foreground px-1">
                        Press Enter to continue
                      </p>
                    )}
                  </div>
                  
                  <Input
                    placeholder="Website (optional)"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="h-12"
                  />
                  
                  <Textarea
                    placeholder="What does this company do? (optional)"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="min-h-[100px] resize-none"
                  />
                  
                  {/* Stage Selection */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Pipeline Stage</p>
                    <div className="flex flex-wrap gap-2">
                      {STAGES.map((stage) => (
                        <button
                          key={stage}
                          type="button"
                          onClick={() => setFormData({ ...formData, stage })}
                          className={cn(
                            "px-4 py-2 rounded-full text-sm font-medium smooth border-2",
                            formData.stage === stage
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background border-border hover:border-primary/50"
                          )}
                        >
                          {stage}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Tags */}
                  {tags.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium">Tags</p>
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag) => (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                tags: prev.tags.includes(tag.id)
                                  ? prev.tags.filter(t => t !== tag.id)
                                  : [...prev.tags, tag.id]
                              }))
                            }}
                            className={cn(
                              "px-3 py-1.5 rounded-full text-xs font-medium smooth",
                              formData.tags.includes(tag.id)
                                ? "bg-foreground text-background"
                                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                            )}
                          >
                            {tag.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Step 2: Founder */}
            {step === 2 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="text-center space-y-2">
                  <h1 className="text-2xl font-semibold tracking-tight">Who's the founder?</h1>
                  <p className="text-muted-foreground">Connect a founder to {formData.name}</p>
                </div>
                
                {/* Selected Founder */}
                {founder && (
                  <div className="p-4 rounded-xl border-2 border-primary bg-primary/5">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                          {founder.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{founder.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{founder.email}</p>
                      </div>
                      {founder.isExisting && (
                        <Badge variant="secondary" className="text-xs">Existing</Badge>
                      )}
                      <button
                        type="button"
                        onClick={() => setFounder(null)}
                        className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive smooth"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Founder Search/Add */}
                {!founder && (
                  <div className="space-y-6">
                    {/* Search existing */}
                    <div className="space-y-2">
                      <div className="relative">
                        <svg className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="11" cy="11" r="8" />
                          <path d="m21 21-4.35-4.35" />
                        </svg>
                        <Input
                          placeholder="Search founders by name or email..."
                          value={founderSearch}
                          onChange={(e) => {
                            setFounderSearch(e.target.value)
                            setShowFounderDropdown(true)
                          }}
                          onFocus={() => setShowFounderDropdown(true)}
                          className="h-12 pl-11"
                        />
                      </div>
                      
                      {showFounderDropdown && filteredFounders.length > 0 && (
                        <div className="border rounded-xl overflow-hidden bg-background shadow-lg">
                          {filteredFounders.map(f => (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => selectExistingFounder(f)}
                              className="w-full flex items-center gap-3 p-3 hover:bg-secondary/50 smooth text-left border-b last:border-b-0"
                            >
                              <Avatar className="h-9 w-9">
                                <AvatarFallback className="bg-secondary text-xs font-medium">
                                  {f.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{f.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{f.email}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Divider */}
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center">
                        <span className="bg-background px-4 text-xs text-muted-foreground">or add a new founder</span>
                      </div>
                    </div>
                    
                    {/* New founder quick add */}
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          placeholder="Name"
                          value={newFounder.name}
                          onChange={(e) => setNewFounder({ ...newFounder, name: e.target.value })}
                          className="h-11"
                        />
                        <Input
                          type="email"
                          placeholder="Email"
                          value={newFounder.email}
                          onChange={(e) => setNewFounder({ ...newFounder, email: e.target.value })}
                          className="h-11"
                          onKeyDown={(e) => e.key === "Enter" && addNewFounder()}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full"
                        onClick={addNewFounder}
                        disabled={!newFounder.name.trim() || !newFounder.email.trim()}
                      >
                        Add Founder
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Skip option */}
                {!founder && (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="w-full text-sm text-muted-foreground hover:text-foreground smooth"
                    disabled={saving}
                  >
                    Skip for now
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

export default function AddCompanyPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    }>
      <AddCompanyForm />
    </Suspense>
  )
}
