import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-02-24.acacia",
  })
}

export async function POST(request: NextRequest) {
  try {
    const { planId } = await request.json()
    
    if (!planId || planId === "hobby") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const stripe = getStripe()

    // Get or create Stripe customer
    let { data: billing } = await (supabase as any)
      .from("billing_info")
      .select("*")
      .eq("user_id", user.id)
      .single()

    let customerId: string

    if (billing?.stripe_customer_id) {
      customerId = billing.stripe_customer_id
    } else {
      // Get user email
      const { data: userData } = await supabase
        .from("users")
        .select("email, name")
        .eq("id", user.id)
        .single()

      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: userData?.email || user.email,
        name: userData?.name || undefined,
        metadata: {
          user_id: user.id,
        },
      })

      customerId = customer.id

      // Save customer ID
      if (billing) {
        await (supabase as any)
          .from("billing_info")
          .update({ stripe_customer_id: customerId })
          .eq("user_id", user.id)
      } else {
        await (supabase as any)
          .from("billing_info")
          .insert({
            user_id: user.id,
            plan: "hobby",
            stripe_customer_id: customerId,
          })
      }
    }

    // Get price ID from plan mapping
    const priceMapping: Record<string, string> = {
      angel: "price_1SiQsUIPpWHFsCGgpcNGFiLh", // $49/month
      fund: process.env.STRIPE_FUND_PRICE_ID || "", // Custom pricing - contact sales
    }

    const priceId = priceMapping[planId]
    if (!priceId) {
      return NextResponse.json({ error: "Price not configured for this plan" }, { status: 400 })
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${request.headers.get("origin")}/settings/billing?success=true`,
      cancel_url: `${request.headers.get("origin")}/settings/billing?canceled=true`,
      metadata: {
        user_id: user.id,
        plan: planId,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error("Stripe checkout error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 }
    )
  }
}

