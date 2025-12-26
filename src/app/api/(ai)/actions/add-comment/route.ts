import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * AI endpoint to add comments - respects permissions and doesn't update last_touch
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
      grantId,
      companyId, 
      founderId,
      content, 
      commentType = "update",
      skipLastTouchUpdate = true // AI comments don't update last_touch by default
    } = body

    if (!content || (!companyId && !founderId)) {
      return NextResponse.json(
        { error: "content and companyId or founderId is required" },
        { status: 400 }
      )
    }

    // Check grant permission if provided
    if (grantId) {
      const { data: grant } = await (supabase as any)
        .from("ai_grants")
        .select("*")
        .eq("id", grantId)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .eq("can_add_comments", true)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .is("revoked_at", null)
        .single()
      
      if (!grant) {
        return NextResponse.json(
          { error: "Grant does not have permission to add comments or has expired" },
          { status: 403 }
        )
      }

      // Check entity restrictions
      if (companyId && grant.restricted_company_ids?.length > 0) {
        if (!grant.restricted_company_ids.includes(companyId)) {
          return NextResponse.json(
            { error: "Grant does not allow comments on this company" },
            { status: 403 }
          )
        }
      }
      if (founderId && grant.restricted_founder_ids?.length > 0) {
        if (!grant.restricted_founder_ids.includes(founderId)) {
          return NextResponse.json(
            { error: "Grant does not allow comments on this founder" },
            { status: 403 }
          )
        }
      }
    }

    let comment: any = null
    let entityType = ""
    let entityId = ""

    // Add comment to company or founder
    if (companyId) {
      entityType = "company"
      entityId = companyId
      
      const { data, error } = await supabase
        .from("comments")
        .insert({
          company_id: companyId,
          content,
          comment_type: commentType,
          author_id: null, // AI comments don't have author
        })
        .select(`
          *,
          author:users(*)
        `)
        .single()

      if (error) {
        console.error("Error creating comment:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      comment = data

      // Only update last_touch if explicitly requested (user comments do this, AI doesn't)
      if (!skipLastTouchUpdate) {
        await supabase
          .from("companies")
          .update({ last_touch: new Date().toISOString() })
          .eq("id", companyId)
      }
    } else if (founderId) {
      entityType = "founder"
      entityId = founderId
      
      const { data, error } = await supabase
        .from("founder_comments")
        .insert({
          founder_id: founderId,
          content,
          comment_type: commentType,
          author_id: null,
        })
        .select()
        .single()

      if (error) {
        console.error("Error creating founder comment:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      comment = data
    }

    // Log the action
    if (grantId) {
      await (supabase as any)
        .from("ai_action_log")
        .insert({
          grant_id: grantId,
          user_id: user.id,
          action_type: 'add_comment',
          entity_type: entityType,
          entity_id: entityId,
          changes: { content, commentType } as any,
          description: `AI added comment: ${content.slice(0, 100)}`,
          source: 'auto'
        })
    }

    return NextResponse.json({ 
      success: true,
      comment 
    }, { status: 201 })
  } catch (error: any) {
    console.error("Error in AI add-comment:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

