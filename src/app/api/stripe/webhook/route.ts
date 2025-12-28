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
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event: Stripe.Event

  // If webhook secret is provided, verify signature
  if (webhookSecret && signature) {
    try {
      const stripe = getStripe()
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message)
      return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
    }
  } else {
    // No webhook secret - parse event directly (less secure, but works for development)
    // In production, you should set STRIPE_WEBHOOK_SECRET
    if (process.env.NODE_ENV === "production") {
      console.warn("WARNING: Processing webhook without signature verification in production!")
    }
    try {
      event = JSON.parse(body) as Stripe.Event
    } catch (err: any) {
      console.error("Failed to parse webhook event:", err.message)
      return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 })
    }
  }

  const supabase = await createClient()

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const plan = session.metadata?.plan || "angel"
        
        if (session.customer && typeof session.customer === "string") {
          const stripe = getStripe()
          const subscription = await stripe.subscriptions.list({
            customer: session.customer,
            limit: 1,
          })

          const activeSubscription = subscription.data[0]

          if (activeSubscription && session.metadata?.user_id) {
            // Update billing_info
            await (supabase as any)
              .from("billing_info")
              .upsert({
                user_id: session.metadata.user_id,
                plan: plan,
                stripe_customer_id: session.customer,
                stripe_subscription_id: activeSubscription.id,
                subscription_status: activeSubscription.status,
                current_period_start: new Date(activeSubscription.current_period_start * 1000).toISOString(),
                current_period_end: new Date(activeSubscription.current_period_end * 1000).toISOString(),
                updated_at: new Date().toISOString(),
              }, {
                onConflict: "user_id"
              })
            
            // Sync to users table (trigger will handle this, but we can also do it explicitly)
            await (supabase as any)
              .from("users")
              .update({
                billing_tier: plan,
                billing_status: activeSubscription.status,
                stripe_customer_id: session.customer,
                stripe_subscription_id: activeSubscription.id,
                updated_at: new Date().toISOString(),
              })
              .eq("id", session.metadata.user_id)
          }
        }
        break
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        
        // Get user_id from billing_info
        const { data: billing } = await (supabase as any)
          .from("billing_info")
          .select("user_id, plan")
          .eq("stripe_subscription_id", subscription.id)
          .single()

        if (!billing) break

        if (subscription.status === "canceled" || subscription.status === "unpaid") {
          // Downgrade to hobby
          await (supabase as any)
            .from("billing_info")
            .update({
              plan: "hobby",
              subscription_status: subscription.status,
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_subscription_id", subscription.id)
          
          // Sync to users table
          await (supabase as any)
            .from("users")
            .update({
              billing_tier: "hobby",
              billing_status: subscription.status,
              updated_at: new Date().toISOString(),
            })
            .eq("id", billing.user_id)
        } else {
          // Update subscription info
          await (supabase as any)
            .from("billing_info")
            .update({
              subscription_status: subscription.status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_subscription_id", subscription.id)
          
          // Sync to users table
          await (supabase as any)
            .from("users")
            .update({
              billing_status: subscription.status,
              updated_at: new Date().toISOString(),
            })
            .eq("id", billing.user_id)
        }
        break
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.subscription && typeof invoice.subscription === "string") {
          const stripe = getStripe()
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription)
          
          // Get billing info to find user_id
          const { data: billing } = await (supabase as any)
            .from("billing_info")
            .select("user_id, plan")
            .eq("stripe_subscription_id", subscription.id)
            .single()
          
          if (billing) {
            await (supabase as any)
              .from("billing_info")
              .update({
                subscription_status: subscription.status,
                current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("stripe_subscription_id", subscription.id)
            
            // Sync to users table
            await (supabase as any)
              .from("users")
              .update({
                billing_status: subscription.status,
                updated_at: new Date().toISOString(),
              })
              .eq("id", billing.user_id)
          }
        }
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.subscription && typeof invoice.subscription === "string") {
          // Get billing info to find user_id
          const { data: billing } = await (supabase as any)
            .from("billing_info")
            .select("user_id")
            .eq("stripe_subscription_id", invoice.subscription)
            .single()
          
          if (billing) {
            await (supabase as any)
              .from("billing_info")
              .update({
                subscription_status: "past_due",
                updated_at: new Date().toISOString(),
              })
              .eq("stripe_subscription_id", invoice.subscription)
            
            // Sync to users table
            await (supabase as any)
              .from("users")
              .update({
                billing_status: "past_due",
                updated_at: new Date().toISOString(),
              })
              .eq("id", billing.user_id)
          }
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("Webhook handler error:", error)
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    )
  }
}


