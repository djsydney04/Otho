import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-02-24.acacia",
  })
}

/**
 * Manual subscription sync endpoint
 * Call this after Stripe checkout to sync subscription status
 * Can be used as a fallback if webhooks aren't set up
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's billing info
    const { data: billing } = await (supabase as any)
      .from("billing_info")
      .select("*")
      .eq("user_id", user.id)
      .single()

    if (!billing?.stripe_customer_id) {
      return NextResponse.json({ error: "No Stripe customer found" }, { status: 404 })
    }

    const stripe = getStripe()

    // Get latest subscription from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: billing.stripe_customer_id,
      limit: 1,
      status: "all",
    })

    const activeSubscription = subscriptions.data[0]

    if (!activeSubscription) {
      // No active subscription - set to hobby
      await (supabase as any)
        .from("billing_info")
        .update({
          plan: "hobby",
          subscription_status: "canceled",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)

      return NextResponse.json({ 
        plan: "hobby",
        status: "canceled",
        synced: true 
      })
    }

    // Determine plan from subscription
    const priceId = activeSubscription.items.data[0]?.price?.id
    let plan = billing.plan || "hobby"
    
    // Map price ID to plan (you can update this based on your Stripe setup)
    if (priceId === "price_1SiQsUIPpWHFsCGgpcNGFiLh") {
      plan = "angel"
    } else if (activeSubscription.metadata?.plan) {
      plan = activeSubscription.metadata.plan
    }

    // Update billing info
    await (supabase as any)
      .from("billing_info")
      .upsert({
        user_id: user.id,
        plan: plan,
        stripe_customer_id: billing.stripe_customer_id,
        stripe_subscription_id: activeSubscription.id,
        subscription_status: activeSubscription.status,
        current_period_start: new Date(activeSubscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(activeSubscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id"
      })

    return NextResponse.json({
      plan,
      status: activeSubscription.status,
      synced: true,
      subscription: {
        id: activeSubscription.id,
        current_period_end: new Date(activeSubscription.current_period_end * 1000).toISOString(),
      }
    })
  } catch (error: any) {
    console.error("Subscription sync error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to sync subscription" },
      { status: 500 }
    )
  }
}

