"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  getOnboardingProgress,
  saveOnboardingStep,
  completeOnboarding,
} from "@/lib/actions/onboarding"
import {
  type OnboardingData,
  type UserRole,
  type PrimaryGoal,
  type SignupSource,
  type InvestingStatus,
  type CheckSize,
  type DealsPerYear,
  type StageFocus,
  type SectorFocus,
  type GeoFocus,
  type DecisionFactor,
  type DecisionSpeed,
  type SourcingChannel,
  type BiggestPain,
  type DiscoverTopic,
  type AIHelpFocus,
  type AITone,
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

const TOTAL_STEPS = 6 // Simplified onboarding

// Debounce helper
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<Partial<OnboardingData>>({
    role: null,
    user_location: null,
    primary_goals: [],
    signup_source: null,
    actively_investing: null,
    invested_before: null,
    check_size: null,
    deals_per_year: null,
    stage_focus: [],
    sector_focus: [],
    geo_focus: [],
    decision_factors: [],
    decision_speed: null,
    sourcing_channels: [],
    biggest_pain: null,
    discover_topics: [],
    ai_help_focus: [],
    ai_tone: "Concise",
  })

  // Debounced form data for auto-save
  const debouncedFormData = useDebounce(formData, 500)

  // Load existing progress on mount
  useEffect(() => {
    async function loadProgress() {
      try {
        const progress = await getOnboardingProgress()
        if (progress.status === "complete") {
          router.push("/pipeline")
          return
        }
        setCurrentStep(progress.currentStep)
        setFormData((prev) => ({ ...prev, ...progress.data }))
      } catch (error) {
        console.error("Error loading progress:", error)
      } finally {
        setLoading(false)
      }
    }
    loadProgress()
  }, [router])

  // Auto-save when form data changes (debounced)
  useEffect(() => {
    if (loading) return

    async function autoSave() {
      setSaving(true)
      try {
        await saveOnboardingStep(currentStep, debouncedFormData)
      } catch (error) {
        console.error("Error auto-saving:", error)
      } finally {
        setSaving(false)
      }
    }
    autoSave()
  }, [debouncedFormData, currentStep, loading])

  const handleNext = async () => {
    setSaving(true)
    try {
      if (currentStep < TOTAL_STEPS - 1) {
        const nextStep = currentStep + 1
        await saveOnboardingStep(nextStep, formData)
        setCurrentStep(nextStep)
      } else {
        // Complete onboarding
        console.log("Completing onboarding with data:", formData)
        const result = await completeOnboarding()
        console.log("Onboarding completion result:", result)
        if (result.success) {
          // Force a hard navigation to bypass the onboarding gate
          window.location.href = "/"
        } else {
          console.error("Failed to complete onboarding:", result.error)
          alert("Failed to complete onboarding. Please try again.")
        }
      }
    } catch (error) {
      console.error("Error in handleNext:", error)
      alert("An error occurred. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const handleSkip = async () => {
    if (currentStep < TOTAL_STEPS - 1) {
      const nextStep = currentStep + 1
      await saveOnboardingStep(nextStep, formData)
      setCurrentStep(nextStep)
    } else {
      // Complete onboarding
      setSaving(true)
      try {
        const result = await completeOnboarding()
        console.log("Onboarding completion result:", result)
        if (result.success) {
          router.push("/")
          router.refresh()
        } else {
          console.error("Failed to complete onboarding:", result.error)
          alert("Failed to complete onboarding. Please try again.")
        }
      } catch (error) {
        console.error("Error completing onboarding:", error)
        alert("An error occurred. Please try again.")
      } finally {
        setSaving(false)
      }
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const toggleArrayValue = <T extends string>(
    key: keyof OnboardingData,
    value: T,
    maxItems?: number
  ) => {
    const current = (formData[key] as T[]) || []
    if (current.includes(value)) {
      setFormData({ ...formData, [key]: current.filter((v) => v !== value) })
    } else if (!maxItems || current.length < maxItems) {
      setFormData({ ...formData, [key]: [...current, value] })
    }
  }

  const progress = ((currentStep + 1) / TOTAL_STEPS) * 100

  // Step configurations - Simplified to 6 essential questions
  const stepQuestions = [
    { title: "What best describes you?", type: "role" },
    { title: "What do you want to use Otho for?", type: "primary_goals", subtitle: "Pick up to 2" },
    { title: "What stages do you focus on?", type: "stage_focus", subtitle: "Select all that apply" },
    { title: "What sectors interest you?", type: "sector_focus", subtitle: "Select up to 5" },
    { title: "What should Otho help you with?", type: "ai_help_focus", subtitle: "Pick up to 3" },
    { title: "How should Otho respond?", type: "ai_tone" },
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  const currentQuestion = stepQuestions[currentStep]
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === TOTAL_STEPS - 1

  return (
    <div className="h-screen bg-gradient-to-b from-background to-background/95 flex flex-col overflow-hidden">
      {/* Compact Header */}
      <header className="flex-shrink-0 border-b bg-card/30 backdrop-blur-sm px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">O</span>
              </div>
              <div>
                <h1 className="font-display text-base font-semibold tracking-tight">
                  Welcome to Otho
                </h1>
              </div>
            </div>
            {saving && (
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </span>
            )}
          </div>
          
          {/* Progress Bar */}
          <div className="relative">
            <div className="h-1 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
              <span>Step {currentStep + 1} of {TOTAL_STEPS}</span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>
        </div>
      </header>

      {/* Content - Scrollable with proper constraints */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <div className="space-y-6">
            <div className="text-center space-y-1.5">
              <h2 className="font-display text-2xl font-semibold tracking-tight">
                {currentQuestion.title}
              </h2>
              {currentQuestion.subtitle && (
                <p className="text-sm text-muted-foreground">
                  {currentQuestion.subtitle}
                </p>
              )}
            </div>

            <div className="space-y-4">
              {/* Render question based on type */}
              {currentQuestion.type === "role" && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ROLE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={async () => {
                        setFormData({ ...formData, role: option.value })
                        await new Promise(resolve => setTimeout(resolve, 150))
                        handleNext()
                      }}
                      disabled={saving}
                      className={`px-4 py-3 rounded-lg text-sm font-medium transition-all border-2 ${
                        formData.role === option.value
                          ? "bg-primary text-primary-foreground border-primary shadow-md"
                          : "bg-card hover:bg-secondary/50 border-border hover:border-primary/50"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}

              {currentQuestion.type === "location" && (
                <div className="space-y-4">
                  <Input
                    placeholder="San Francisco, CA"
                    value={formData.user_location || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, user_location: e.target.value || null })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && formData.user_location) {
                        handleNext()
                      }
                    }}
                    className="h-14 text-center text-lg"
                    autoFocus
                  />
                  <p className="text-xs text-center text-muted-foreground">
                    Press Enter to continue
                  </p>
                </div>
              )}

              {currentQuestion.type === "primary_goals" && (
                <div className="space-y-2">
                  {PRIMARY_GOAL_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleArrayValue("primary_goals", option.value, 2)}
                      className={`w-full px-4 py-3 rounded-lg text-left text-sm transition-all border-2 ${
                        formData.primary_goals?.includes(option.value)
                          ? "bg-primary text-primary-foreground border-primary shadow-md"
                          : "bg-card hover:bg-secondary/50 border-border hover:border-primary/50"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}

              {currentQuestion.type === "signup_source" && (
                <Select
                  value={formData.signup_source || ""}
                  onValueChange={(v) => {
                    setFormData({ ...formData, signup_source: v as SignupSource })
                    setTimeout(handleNext, 200)
                  }}
                >
                  <SelectTrigger className="h-14 text-lg">
                    <SelectValue placeholder="Select one" />
                  </SelectTrigger>
                  <SelectContent>
                    {SIGNUP_SOURCE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="text-base py-3">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {currentQuestion.type === "actively_investing" && (
                <div className="grid grid-cols-2 gap-3">
                  {INVESTING_STATUS_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, actively_investing: option.value })
                        setTimeout(handleNext, 200)
                      }}
                      className={`px-5 py-4 rounded-xl text-sm font-medium transition-all border-2 ${
                        formData.actively_investing === option.value
                          ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105"
                          : "bg-card hover:bg-secondary/50 border-border hover:border-primary/50"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}

              {currentQuestion.type === "invested_before" && (
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, invested_before: true })
                      setTimeout(handleNext, 200)
                    }}
                    className={`px-6 py-8 rounded-xl text-base font-medium transition-all border-2 ${
                      formData.invested_before === true
                        ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105"
                        : "bg-card hover:bg-secondary/50 border-border hover:border-primary/50"
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, invested_before: false })
                      setTimeout(handleNext, 200)
                    }}
                    className={`px-6 py-8 rounded-xl text-base font-medium transition-all border-2 ${
                      formData.invested_before === false
                        ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105"
                        : "bg-card hover:bg-secondary/50 border-border hover:border-primary/50"
                    }`}
                  >
                    Not yet
                  </button>
                </div>
              )}

              {currentQuestion.type === "check_size" && (
                <Select
                  value={formData.check_size || ""}
                  onValueChange={(v) => {
                    setFormData({ ...formData, check_size: v as CheckSize })
                    setTimeout(handleNext, 200)
                  }}
                >
                  <SelectTrigger className="h-14 text-lg">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {CHECK_SIZE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="text-base py-3">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {currentQuestion.type === "deals_per_year" && (
                <Select
                  value={formData.deals_per_year || ""}
                  onValueChange={(v) => {
                    setFormData({ ...formData, deals_per_year: v as DealsPerYear })
                    setTimeout(handleNext, 200)
                  }}
                >
                  <SelectTrigger className="h-14 text-lg">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEALS_PER_YEAR_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="text-base py-3">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {currentQuestion.type === "stage_focus" && (
                <div className="flex flex-wrap gap-2 justify-center">
                  {STAGE_FOCUS_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleArrayValue("stage_focus", option.value)}
                      className={`px-3 py-2 rounded-full text-sm transition-all border-2 ${
                        formData.stage_focus?.includes(option.value)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card hover:bg-secondary/50 border-border hover:border-primary/50"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}

              {currentQuestion.type === "sector_focus" && (
                <div className="flex flex-wrap gap-2 justify-center">
                  {SECTOR_FOCUS_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleArrayValue("sector_focus", option.value, 5)}
                      className={`px-3 py-2 rounded-full text-sm transition-all border-2 ${
                        formData.sector_focus?.includes(option.value)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card hover:bg-secondary/50 border-border hover:border-primary/50"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}

              {currentQuestion.type === "geo_focus" && (
                <div className="flex flex-wrap gap-2 justify-center">
                  {GEO_FOCUS_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleArrayValue("geo_focus", option.value)}
                      className={`px-4 py-2.5 rounded-full text-sm transition-all border-2 ${
                        formData.geo_focus?.includes(option.value)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card hover:bg-secondary/50 border-border hover:border-primary/50"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}

              {currentQuestion.type === "decision_factors" && (
                <div className="space-y-3">
                  {DECISION_FACTOR_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleArrayValue("decision_factors", option.value, 3)}
                      className={`w-full px-5 py-4 rounded-xl text-left transition-all border-2 ${
                        formData.decision_factors?.includes(option.value)
                          ? "bg-primary text-primary-foreground border-primary shadow-lg"
                          : "bg-card hover:bg-secondary/50 border-border hover:border-primary/50"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}

              {currentQuestion.type === "decision_speed" && (
                <div className="grid grid-cols-2 gap-3">
                  {DECISION_SPEED_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, decision_speed: option.value })
                        setTimeout(handleNext, 200)
                      }}
                      className={`px-5 py-4 rounded-xl text-sm font-medium transition-all border-2 ${
                        formData.decision_speed === option.value
                          ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105"
                          : "bg-card hover:bg-secondary/50 border-border hover:border-primary/50"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}

              {currentQuestion.type === "sourcing_channels" && (
                <div className="flex flex-wrap gap-2 justify-center">
                  {SOURCING_CHANNEL_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleArrayValue("sourcing_channels", option.value)}
                      className={`px-4 py-2.5 rounded-full text-sm transition-all border-2 ${
                        formData.sourcing_channels?.includes(option.value)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card hover:bg-secondary/50 border-border hover:border-primary/50"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}

              {currentQuestion.type === "biggest_pain" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {BIGGEST_PAIN_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, biggest_pain: option.value })
                        setTimeout(handleNext, 200)
                      }}
                      className={`px-5 py-4 rounded-xl text-sm text-left transition-all border-2 ${
                        formData.biggest_pain === option.value
                          ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105"
                          : "bg-card hover:bg-secondary/50 border-border hover:border-primary/50"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}

              {currentQuestion.type === "discover_topics" && (
                <div className="flex flex-wrap gap-2 justify-center">
                  {DISCOVER_TOPIC_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleArrayValue("discover_topics", option.value)}
                      className={`px-4 py-2.5 rounded-full text-sm transition-all border-2 ${
                        formData.discover_topics?.includes(option.value)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card hover:bg-secondary/50 border-border hover:border-primary/50"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}

              {currentQuestion.type === "ai_help_focus" && (
                <div className="space-y-2">
                  {AI_HELP_FOCUS_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleArrayValue("ai_help_focus", option.value, 3)}
                      className={`w-full px-4 py-3 rounded-lg text-left text-sm transition-all border-2 ${
                        formData.ai_help_focus?.includes(option.value)
                          ? "bg-primary text-primary-foreground border-primary shadow-md"
                          : "bg-card hover:bg-secondary/50 border-border hover:border-primary/50"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}

              {currentQuestion.type === "ai_tone" && (
                <div className="grid grid-cols-3 gap-2">
                  {AI_TONE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={async () => {
                        setFormData({ ...formData, ai_tone: option.value })
                        await new Promise(resolve => setTimeout(resolve, 150))
                        handleNext()
                      }}
                      disabled={saving}
                      className={`px-3 py-4 rounded-lg text-center transition-all border-2 ${
                        formData.ai_tone === option.value
                          ? "bg-primary text-primary-foreground border-primary shadow-md"
                          : "bg-card hover:bg-secondary/50 border-border hover:border-primary/50"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <p className="font-medium text-sm">{option.label}</p>
                      <p className="text-xs mt-1.5 opacity-80">{option.description}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Navigation Footer */}
      <footer className="flex-shrink-0 border-t bg-card/30 backdrop-blur-sm px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            {!isFirstStep && (
              <Button variant="ghost" size="sm" onClick={handleBack} disabled={saving}>
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {/* Show Continue button only for multi-select questions */}
            {["primary_goals", "stage_focus", "sector_focus", "ai_help_focus"].includes(currentQuestion.type) && (
              <Button size="sm" onClick={handleNext} disabled={saving}>
                {saving && isLastStep ? "Finishing..." : "Continue"}
              </Button>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}
