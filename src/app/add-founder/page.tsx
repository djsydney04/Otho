"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Sidebar } from "@/components/pipeline/sidebar"
import { cn } from "@/lib/utils"

export default function AddFounderPage() {
  const router = useRouter()
  const nameInputRef = useRef<HTMLInputElement>(null)
  
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role_title: "",
    linkedin: "",
    twitter: "",
    location: "",
    bio: "",
    previous_companies: "",
    education: "",
    source: "",
    notes: "",
  })
  
  const [saving, setSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [newFounderId, setNewFounderId] = useState<string | null>(null)
  
  useEffect(() => {
    setTimeout(() => nameInputRef.current?.focus(), 100)
  }, [])
  
  const canProceed = step === 1 
    ? formData.name.trim().length > 0 && formData.email.trim().length > 0 
    : true
  
  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.email.trim()) return
    
    setSaving(true)
    
    try {
      const response = await fetch('/api/founders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          role_title: formData.role_title || null,
          location: formData.location || null,
          linkedin: formData.linkedin || null,
          twitter: formData.twitter || null,
          previous_companies: formData.previous_companies || null,
          education: formData.education || null,
          bio: formData.bio || null,
          source: formData.source || null,
          notes: formData.notes || null,
        }),
      })
      
      if (response.ok) {
        const newFounder = await response.json()
        setNewFounderId(newFounder.id)
        setShowSuccess(true)
      } else {
        const error = await response.json()
        alert(error.error || "Failed to create founder")
        setSaving(false)
      }
    } catch (error) {
      console.error("Error adding founder:", error)
      alert("Failed to create founder. Please try again.")
      setSaving(false)
    }
  }
  
  const handleAddCompany = () => {
    router.push(`/add-company?founder_id=${newFounderId}&founder_name=${encodeURIComponent(formData.name)}&founder_email=${encodeURIComponent(formData.email)}`)
  }

  // Success state
  if (showSuccess) {
    return (
      <div className="flex h-screen bg-background text-foreground overflow-hidden">
        <Sidebar activePage="founders" />
        <main className="flex flex-1 items-center justify-center">
          <div className="text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
              <svg className="h-8 w-8 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{formData.name} added</h1>
              <p className="text-muted-foreground mt-2">What would you like to do next?</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button variant="outline" onClick={() => router.push("/founders")}>
                View All Founders
              </Button>
              <Button onClick={handleAddCompany}>
                Add Their Company
              </Button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar activePage="founders" />
      
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Minimal Header */}
        <header className="flex items-center justify-between px-8 py-5 flex-shrink-0">
          <Link
            href="/founders"
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
                ) : "Add Founder"}
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
            
            {/* Step 1: Essentials */}
            {step === 1 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="text-center space-y-2">
                  <h1 className="text-2xl font-semibold tracking-tight">Add a founder</h1>
                  <p className="text-muted-foreground">Start with who they are. You can add more later.</p>
                </div>
                
                <div className="space-y-5">
                  {/* Name - Hero Input */}
                  <Input
                    ref={nameInputRef}
                    placeholder="Full name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-14 text-lg px-4 border-2 focus:border-primary"
                  />
                  
                  {/* Email */}
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-12"
                    onKeyDown={(e) => e.key === "Enter" && canProceed && setStep(2)}
                  />
                  
                  {formData.name && formData.email && (
                    <p className="text-xs text-muted-foreground px-1">
                      Press Enter to continue
                    </p>
                  )}
                  
                  {/* Role */}
                  <Input
                    placeholder="Role or title (optional)"
                    value={formData.role_title}
                    onChange={(e) => setFormData({ ...formData, role_title: e.target.value })}
                    className="h-11"
                  />
                  
                  {/* Quick links row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                      <Input
                        placeholder="LinkedIn"
                        value={formData.linkedin}
                        onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                        className="h-11 pl-10"
                      />
                    </div>
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                      <Input
                        placeholder="X / Twitter"
                        value={formData.twitter}
                        onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                        className="h-11 pl-10"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Step 2: Background & Context */}
            {step === 2 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="text-center space-y-2">
                  <h1 className="text-2xl font-semibold tracking-tight">Tell us more</h1>
                  <p className="text-muted-foreground">Background on {formData.name.split(' ')[0]}</p>
                </div>
                
                <div className="space-y-5">
                  {/* Location */}
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <Input
                      placeholder="Location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="h-11 pl-10"
                    />
                  </div>
                  
                  {/* Previous companies */}
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    </svg>
                    <Input
                      placeholder="Previous companies (Google, Stripe...)"
                      value={formData.previous_companies}
                      onChange={(e) => setFormData({ ...formData, previous_companies: e.target.value })}
                      className="h-11 pl-10"
                    />
                  </div>
                  
                  {/* Education */}
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                      <path d="M6 12v5c3 3 9 3 12 0v-5" />
                    </svg>
                    <Input
                      placeholder="Education"
                      value={formData.education}
                      onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                      className="h-11 pl-10"
                    />
                  </div>
                  
                  {/* How you found them */}
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                      <path d="M12 17h.01" />
                    </svg>
                    <Input
                      placeholder="How you found them"
                      value={formData.source}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                      className="h-11 pl-10"
                    />
                  </div>
                  
                  {/* Bio */}
                  <Textarea
                    placeholder="Bio or background notes..."
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="min-h-[100px] resize-none"
                  />
                  
                  {/* Notes */}
                  <Textarea
                    placeholder="Any other notes..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="min-h-[80px] resize-none"
                  />
                </div>
                
                {/* Skip shortcut */}
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="w-full text-sm text-muted-foreground hover:text-foreground smooth"
                  disabled={saving}
                >
                  Skip details and add founder
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
