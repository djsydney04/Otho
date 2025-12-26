import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET - Fetch chat history
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    
    // SECURITY: Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get("companyId")
    const founderId = searchParams.get("founderId")
    const conversationId = searchParams.get("conversationId")
    const limit = parseInt(searchParams.get("limit") || "10")

    // If specific conversation requested
    if (conversationId) {
      // Verify conversation belongs to user
      const { data: conv } = await supabase
        .from("chat_conversations")
        .select("user_id, company_id, founder_id")
        .eq("id", conversationId)
        .single()
      
      if (!conv || conv.user_id !== user.id) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
      }
      
      // If linked to company/founder, verify ownership
      if (conv.company_id) {
        const { data: company } = await supabase
          .from("companies")
          .select("owner_id")
          .eq("id", conv.company_id)
          .single()
        if (!company || company.owner_id !== user.id) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
        }
      }
      
      const { data: messages, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })

      if (error) throw error
      return NextResponse.json({ messages })
    }

    // SECURITY: Only fetch conversations for the current user
    let query = supabase
      .from("chat_conversations")
      .select(`
        *,
        messages:chat_messages(id, role, content, created_at)
      `)
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(limit)

    if (companyId) {
      // Verify company ownership
      const { data: company } = await supabase
        .from("companies")
        .select("owner_id")
        .eq("id", companyId)
        .single()
      if (!company || company.owner_id !== user.id) {
        return NextResponse.json({ error: "Company not found" }, { status: 404 })
      }
      query = query.eq("company_id", companyId)
    } else if (founderId) {
      // Verify founder access (founder must be linked to user's companies)
      const { data: userCompanies } = await supabase
        .from("companies")
        .select("founder_id")
        .eq("owner_id", user.id)
        .eq("founder_id", founderId)
        .limit(1)
      if (!userCompanies || userCompanies.length === 0) {
        return NextResponse.json({ error: "Founder not found" }, { status: 404 })
      }
      query = query.eq("founder_id", founderId)
    }

    const { data: conversations, error } = await query

    if (error) throw error
    return NextResponse.json({ conversations })
  } catch (error) {
    console.error("Chat history error:", error)
    return NextResponse.json({ error: "Failed to fetch chat history" }, { status: 500 })
  }
}

// POST - Create or update conversation
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // SECURITY: Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const { conversationId, companyId, founderId, message, title } = await request.json()

    // Verify ownership if company/founder provided
    if (companyId) {
      const { data: company } = await supabase
        .from("companies")
        .select("owner_id")
        .eq("id", companyId)
        .single()
      if (!company || company.owner_id !== user.id) {
        return NextResponse.json({ error: "Company not found" }, { status: 404 })
      }
    }
    
    if (founderId) {
      const { data: userCompanies } = await supabase
        .from("companies")
        .select("founder_id")
        .eq("owner_id", user.id)
        .eq("founder_id", founderId)
        .limit(1)
      if (!userCompanies || userCompanies.length === 0) {
        return NextResponse.json({ error: "Founder not found" }, { status: 404 })
      }
    }

    let convId = conversationId

    // Create new conversation if needed
    if (!convId) {
      const { data: conv, error: convError } = await supabase
        .from("chat_conversations")
        .insert({
          user_id: user.id,
          company_id: companyId || null,
          founder_id: founderId || null,
          title: title || message?.content?.slice(0, 50) || "New conversation",
        })
        .select()
        .single()

      if (convError) throw convError
      convId = conv.id
    } else {
      // Verify existing conversation belongs to user
      const { data: existingConv } = await supabase
        .from("chat_conversations")
        .select("user_id")
        .eq("id", convId)
        .single()
      if (!existingConv || existingConv.user_id !== user.id) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
      }
    }

    // Add message if provided
    if (message) {
      const { error: msgError } = await supabase.from("chat_messages").insert({
        conversation_id: convId,
        role: message.role,
        content: message.content,
        proposed_action: message.proposedAction || null,
      })

      if (msgError) throw msgError

      // Update conversation timestamp
      await supabase
        .from("chat_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", convId)
    }

    return NextResponse.json({ conversationId: convId })
  } catch (error) {
    console.error("Chat save error:", error)
    return NextResponse.json({ error: "Failed to save chat" }, { status: 500 })
  }
}



