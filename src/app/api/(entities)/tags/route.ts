import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/client"

// GET /api/tags - List all tags
export async function GET() {
  const supabase = createServerClient()
  
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .order("label")
  
  if (error) {
    console.error("Error fetching tags:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json(data)
}

// POST /api/tags - Create a new tag
export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  
  try {
    const body = await request.json()
    const { label } = body
    
    if (!label) {
      return NextResponse.json({ error: "label is required" }, { status: 400 })
    }
    
    const { data: tag, error } = await supabase
      .from("tags")
      .insert({ label })
      .select()
      .single()
    
    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Tag already exists" }, { status: 409 })
      }
      console.error("Error creating tag:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json(tag, { status: 201 })
  } catch (error: any) {
    console.error("Error creating tag:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

