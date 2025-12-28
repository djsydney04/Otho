import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/ai/grants - Get user's active grants
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

      const { data: grants, error } = await (supabase as any)
        .from("ai_grants")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .is("revoked_at", null)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching grants:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ grants })
  } catch (error: any) {
    console.error("Error in GET /api/ai/grants:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/ai/grants - Create a new grant
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      description,
      canAddComments = false,
      canUpdateFields = [],
      canCreateCompanies = false,
      canCreateFounders = false,
      canAddTags = false,
      restrictedCompanyIds = null,
      restrictedFounderIds = null,
      expiresAt = null,
      metadata = {}
    } = body

    // Validate denied fields (these should always be denied)
    const deniedFields = ['last_touch', 'updated_at', 'created_at', 'owner_id', 'id']

      const { data: grant, error } = await (supabase as any)
        .from("ai_grants")
        .insert({
        user_id: user.id,
        name,
        description,
        can_add_comments: canAddComments,
        can_update_fields: canUpdateFields,
        can_create_companies: canCreateCompanies,
        can_create_founders: canCreateFounders,
        can_add_tags: canAddTags,
        restricted_company_ids: restrictedCompanyIds,
        restricted_founder_ids: restrictedFounderIds,
        denied_fields: deniedFields,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        metadata,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating grant:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ grant }, { status: 201 })
  } catch (error: any) {
    console.error("Error in POST /api/ai/grants:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PATCH /api/ai/grants - Update or revoke a grant
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { grantId, revoke = false, ...updates } = body

    if (!grantId) {
      return NextResponse.json({ error: "grantId is required" }, { status: 400 })
    }

    if (revoke) {
      const { error } = await (supabase as any)
        .from("ai_grants")
        .update({ 
          is_active: false,
          revoked_at: new Date().toISOString()
        })
        .eq("id", grantId)
        .eq("user_id", user.id)

      if (error) {
        console.error("Error revoking grant:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, revoked: true })
    }

    // Update grant
    const { data: grant, error } = await (supabase as any)
      .from("ai_grants")
      .update(updates)
      .eq("id", grantId)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating grant:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ grant })
  } catch (error: any) {
    console.error("Error in PATCH /api/ai/grants:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

