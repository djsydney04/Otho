import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import Stripe from "stripe"

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-02-24.acacia",
  })
}

/**
 * GET /api/stripe/cancel-subscription
 * 
 * Get Stripe customer portal URL for canceling subscription
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's billing info
    const { data: billing } = await (supabase as any)
      .from("billing_info")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single()

    if (!billing?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      )
    }

    const stripe = getStripe()
    const origin = request.headers.get("origin") || "http://localhost:3000"

    // Create customer portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: billing.stripe_customer_id,
      return_url: `${origin}/settings/billing?canceled=true`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error("Error creating cancel session:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create cancel session" },
      { status: 500 }
    )
  }
}

