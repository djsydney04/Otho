import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/client"

// GET - Fetch chat history
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get("companyId")
    const founderId = searchParams.get("founderId")
    const conversationId = searchParams.get("conversationId")
    const limit = parseInt(searchParams.get("limit") || "10")

    const supabase = createServerClient()

    // If specific conversation requested
    if (conversationId) {
      const { data: messages, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })

      if (error) throw error
      return NextResponse.json({ messages })
    }

    // Otherwise fetch recent conversations
    let query = supabase
      .from("chat_conversations")
      .select(`
        *,
        messages:chat_messages(id, role, content, created_at)
      `)
      .order("updated_at", { ascending: false })
      .limit(limit)

    if (companyId) {
      query = query.eq("company_id", companyId)
    } else if (founderId) {
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
    const { conversationId, companyId, founderId, message, title } = await request.json()

    const supabase = createServerClient()
    let convId = conversationId

    // Create new conversation if needed
    if (!convId) {
      const { data: conv, error: convError } = await supabase
        .from("chat_conversations")
        .insert({
          company_id: companyId || null,
          founder_id: founderId || null,
          title: title || message?.content?.slice(0, 50) || "New conversation",
        })
        .select()
        .single()

      if (convError) throw convError
      convId = conv.id
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



