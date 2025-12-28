"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/hooks/use-auth"
import { Loader2 } from "lucide-react"
import { RefreshIcon, CheckIcon, StarIcon } from "@/components/icons"

const PLANS = [
  {
    id: "hobby",
    name: "Hobby",
    price: "Free",
    priceSubtext: "forever",
    description: "For individuals exploring deal tracking.",
    features: [
      "Pipeline management (Kanban + Table)",
      "Company & Founder profiles",
      "Tags & filtering",
      "Activity timeline",
      "Discover news feed (Standard)",
    ],
    limits: "Up to 30 contacts",
    footer: "SINGLE-USER ONLY",
    cta: "Get Started",
    popular: false,
  },
  {
    id: "angel",
    name: "Angel",
    price: "$49",
    priceSubtext: "/mo",
    description: "For active angels managing real deal flow.",
    features: [
      "Everything in Hobby, plus:",
      "Unlimited contacts",
      "Full pipeline management at scale",
      "AI-powered Discover (Deduplicated)",
      "Portfolio-aware Intelligence",
      "Gmail & Calendar sync",
      "AI research summaries",
    ],
    footer: "DESIGNED FOR POWER USERS",
    cta: "Upgrade to Angel",
    popular: true,
    stripePriceId: "price_1SiQsUIPpWHFsCGgpcNGFiLh",
  },
  {
    id: "fund",
    name: "Fund",
    price: "Custom",
    priceSubtext: "",
    description: "For funds running shared pipelines.",
    features: [
      "Everything in Angel, plus:",
      "Multi-user workspaces",
      "Shared pipelines & profiles",
      "Org-wide timelines & comments",
      "Role-based access (RBAC)",
      "Priority support",
    ],
    footer: "REQUIRES ENABLEMENT",
    cta: "Contact us",
    popular: false,
  },
]

export default function BillingPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [billing, setBilling] = useState<any>(null)
  const [processing, setProcessing] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)

  const handleSyncSubscription = async () => {
    if (!user) return
    setSyncing(true)
    try {
      const response = await fetch("/api/stripe/sync-subscription", { method: "POST" })
      const data = await response.json()
      if (data.synced) {
        const supabase = createBrowserSupabaseClient()
        const { data: updated } = await supabase
          .from("billing_info")
          .select("*")
          .eq("user_id", user.id)
          .single()
        if (updated) {
          setBilling(updated)
        }
      }
    } catch (error) {
      console.error("Failed to sync:", error)
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    async function loadBilling() {
      if (!user) return
      
      const supabase = createBrowserSupabaseClient()
      const { data } = await supabase
        .from("billing_info")
        .select("*")
        .eq("user_id", user.id)
        .single()
      
      if (data) {
        setBilling(data)
        
        // If user just returned from Stripe (success or canceled), sync subscription
        const urlParams = new URLSearchParams(window.location.search)
        if (urlParams.get("success") === "true" || urlParams.get("canceled") === "true") {
          try {
            const syncRes = await fetch("/api/stripe/sync-subscription", { method: "POST" })
            const syncData = await syncRes.json()
            if (syncData.synced) {
              // Reload billing data
              const { data: updated } = await supabase
                .from("billing_info")
                .select("*")
                .eq("user_id", user.id)
                .single()
              if (updated) {
                setBilling(updated)
              }
              // Remove params from URL
              window.history.replaceState({}, "", "/settings/billing")
            }
          } catch (error) {
            console.error("Failed to sync subscription:", error)
          }
        }
      }
      
      setLoading(false)
    }
    
    loadBilling()
  }, [user])

  const handleUpgrade = async (planId: string) => {
    if (planId === "fund") {
      window.location.href = "mailto:support@angellead.com?subject=Fund Plan Inquiry"
      return
    }

    if (!user) return

    setProcessing(planId)
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      })

      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error("Failed to start checkout:", error)
    } finally {
      setProcessing(null)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const currentPlan = billing?.plan || "hobby"

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-10">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 font-medium">Billing</p>
        <h1 className="font-display text-3xl font-semibold mb-3">Choose your plan</h1>
        <p className="text-muted-foreground max-w-xl">
          Select the tier that matches your workflow. Start for free and scale as your portfolio grows.
        </p>
      </div>

      {/* Current Plan Badge */}
      {currentPlan && currentPlan !== "hobby" && (
        <div className="mb-8 flex items-center gap-4 bg-accent/20 border border-accent/30 rounded-xl px-5 py-4">
          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-accent/30">
            <StarIcon className="h-5 w-5 text-accent-foreground" filled />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">
              Current plan: <span className="capitalize">{currentPlan}</span>
              {billing?.subscription_status && (
                <Badge variant="outline" className="ml-2 text-xs font-normal">
                  {billing.subscription_status}
                </Badge>
              )}
            </p>
            {billing?.stripe_subscription_id && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Last synced: {billing.updated_at ? new Date(billing.updated_at).toLocaleString() : "Never"}
              </p>
            )}
          </div>
          {billing?.stripe_subscription_id && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSyncSubscription}
              disabled={syncing}
              className="h-9"
            >
              <RefreshIcon className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              Sync
            </Button>
          )}
        </div>
      )}

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const isCurrentPlan = currentPlan === plan.id
          
          return (
            <Card
              key={plan.id}
              className={`relative h-full flex flex-col border transition-all duration-200 ${
                plan.popular
                  ? "border-primary shadow-lg ring-1 ring-primary/20"
                  : isCurrentPlan
                  ? "border-accent ring-1 ring-accent/30"
                  : "border-border hover:border-primary/30 hover:shadow-md"
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-3 py-1 text-xs font-medium shadow-sm">
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardContent className="p-6 flex flex-col h-full">
                {/* Plan Header */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="font-display text-xl font-semibold">{plan.name}</h2>
                    {isCurrentPlan && (
                      <Badge variant="secondary" className="text-xs">
                        Current
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-3xl font-bold text-foreground">
                      {plan.price}
                    </span>
                    {plan.priceSubtext && (
                      <span className="text-sm text-muted-foreground">
                        {plan.priceSubtext}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {plan.description}
                  </p>
                </div>

                {/* Features */}
                <div className="flex-1 space-y-2.5 mb-6">
                  {plan.features.map((feature, idx) => {
                    const isInheritLine = feature.includes("Everything in")
                    return (
                      <div key={idx} className="flex items-start gap-2.5">
                        {!isInheritLine && (
                          <CheckIcon className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        )}
                        <p
                          className={`text-sm leading-relaxed ${
                            isInheritLine
                              ? "text-muted-foreground italic"
                              : "text-foreground"
                          }`}
                        >
                          {feature}
                        </p>
                      </div>
                    )
                  })}
                  {plan.limits && (
                    <div className="pt-2 mt-2 border-t">
                      <p className="text-sm font-medium text-muted-foreground">
                        {plan.limits}
                      </p>
                    </div>
                  )}
                </div>

                {/* CTA */}
                <div className="mt-auto space-y-2">
                  <Button
                    variant={plan.popular ? "default" : "outline"}
                    className={`w-full h-10 ${
                      plan.popular
                        ? ""
                        : "hover:bg-primary hover:text-primary-foreground"
                    }`}
                    disabled={isCurrentPlan || processing === plan.id}
                    onClick={() => handleUpgrade(plan.id)}
                  >
                    {processing === plan.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : isCurrentPlan ? (
                      "Current Plan"
                    ) : (
                      plan.cta
                    )}
                  </Button>
                  
                  <p className="text-[10px] uppercase tracking-wider text-center text-muted-foreground">
                    {plan.footer}
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Current Subscription Details */}
      {billing?.stripe_subscription_id && (
        <div className="mt-10 space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">Subscription Management</h2>
            
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Current Plan</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {billing.current_period_end 
                          ? `Renews on ${new Date(billing.current_period_end).toLocaleDateString()}`
                          : "No renewal date"}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {billing.plan}
                    </Badge>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={async () => {
                        try {
                          const response = await fetch("/api/stripe/cancel-subscription")
                          const data = await response.json()
                          if (data.url) {
                            window.location.href = data.url
                          }
                        } catch (error) {
                          console.error("Failed to open cancel page:", error)
                        }
                      }}
                    >
                      Manage Subscription
                    </Button>
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Cancel or update your subscription in Stripe
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Billing History */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Billing History</h2>
            <Card>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {billing.current_period_start && (
                    <div className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium">Current Period</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(billing.current_period_start).toLocaleDateString()} - {billing.current_period_end ? new Date(billing.current_period_end).toLocaleDateString() : "N/A"}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {billing.subscription_status || "active"}
                      </Badge>
                    </div>
                  )}
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">
                      View full billing history in the{" "}
                      <button
                        onClick={async () => {
                          try {
                            const response = await fetch("/api/stripe/cancel-subscription")
                            const data = await response.json()
                            if (data.url) window.location.href = data.url
                          } catch (error) {
                            console.error("Failed to open portal:", error)
                          }
                        }}
                        className="text-primary hover:underline"
                      >
                        Stripe Customer Portal
                      </button>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* FAQ/Help Section */}
      <div className="mt-12 p-6 rounded-xl bg-secondary/30 border">
        <h3 className="font-semibold mb-2">Questions about billing?</h3>
        <p className="text-sm text-muted-foreground">
          Contact us at{" "}
          <a href="mailto:support@angellead.com" className="text-primary hover:underline">
            support@angellead.com
          </a>
          {" "}for help with billing, upgrades, or custom enterprise needs.
        </p>
      </div>
    </div>
  )
}

