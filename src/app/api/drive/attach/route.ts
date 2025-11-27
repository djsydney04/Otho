import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase/client"
import { getDriveFile } from "@/lib/integrations/google/drive"

// POST /api/drive/attach - Attach a Google Drive file to a company or founder
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: "Not authenticated with Google" },
        { status: 401 }
      )
    }
    
    const supabase = createServerClient()
    const body = await request.json()
    const { fileId, companyId, founderId } = body
    
    if (!fileId) {
      return NextResponse.json(
        { error: "File ID is required" },
        { status: 400 }
      )
    }
    
    if (!companyId && !founderId) {
      return NextResponse.json(
        { error: "Either companyId or founderId is required" },
        { status: 400 }
      )
    }
    
    // Get file details from Google Drive
    const file = await getDriveFile(session.accessToken, fileId)
    
    if (!file) {
      return NextResponse.json(
        { error: "File not found in Google Drive" },
        { status: 404 }
      )
    }
    
    // Check if file is already attached
    const { data: existing } = await supabase
      .from("drive_documents")
      .select("id")
      .eq("google_file_id", fileId)
      .eq(companyId ? "company_id" : "founder_id", companyId || founderId)
      .single()
    
    if (existing) {
      return NextResponse.json(
        { error: "File already attached" },
        { status: 409 }
      )
    }
    
    // Get user ID from session
    let userId: string | null = null
    if (session?.user?.email) {
      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("email", session.user.email)
        .single()
      
      if (user) {
        userId = user.id
      }
    }
    
    // Save the attachment
    const { data: attachment, error } = await supabase
      .from("drive_documents")
      .insert({
        google_file_id: file.id,
        name: file.name,
        mime_type: file.mimeType,
        icon_link: file.iconLink,
        web_view_link: file.webViewLink,
        thumbnail_link: file.thumbnailLink,
        size_bytes: file.size ? parseInt(file.size) : null,
        company_id: companyId || null,
        founder_id: founderId || null,
        user_id: userId,
      })
      .select()
      .single()
    
    if (error) {
      console.error("Error attaching file:", error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json(attachment, { status: 201 })
  } catch (error: any) {
    console.error("Error attaching Drive file:", error)
    return NextResponse.json(
      { error: error.message || "Failed to attach file" },
      { status: 500 }
    )
  }
}

// DELETE /api/drive/attach - Remove a Drive attachment
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)
    const attachmentId = searchParams.get("id")
    
    if (!attachmentId) {
      return NextResponse.json(
        { error: "Attachment ID is required" },
        { status: 400 }
      )
    }
    
    const { error } = await supabase
      .from("drive_documents")
      .delete()
      .eq("id", attachmentId)
    
    if (error) {
      console.error("Error removing attachment:", error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error removing Drive attachment:", error)
    return NextResponse.json(
      { error: error.message || "Failed to remove attachment" },
      { status: 500 }
    )
  }
}

