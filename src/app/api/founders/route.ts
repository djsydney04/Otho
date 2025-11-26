import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/client"

// GET /api/founders - List all founders
export async function GET(request: NextRequest) {
  const supabase = createServerClient()
  
  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search")
  
  let query = supabase
    .from("founders")
    .select("*")
    .order("name")
  
  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error("Error fetching founders:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json(data)
}

// POST /api/founders - Create a new founder
export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  
  try {
    const body = await request.json()
    const { 
      name, 
      email, 
      linkedin, 
      twitter, 
      location, 
      role_title, 
      notes,
      bio,
      previous_companies,
      education,
      domain_expertise,
      source,
      warm_intro_path,
    } = body
    
    if (!name || !email) {
      return NextResponse.json(
        { error: "name and email are required" },
        { status: 400 }
      )
    }
    
    const { data: founder, error } = await supabase
      .from("founders")
      .insert({ 
        name, 
        email, 
        linkedin, 
        twitter, 
        location, 
        role_title, 
        notes,
        bio,
        previous_companies,
        education,
        domain_expertise,
        source,
        warm_intro_path,
      })
      .select()
      .single()
    
    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Founder with this email already exists" },
          { status: 409 }
        )
      }
      console.error("Error creating founder:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json(founder, { status: 201 })
  } catch (error: any) {
    console.error("Error creating founder:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

