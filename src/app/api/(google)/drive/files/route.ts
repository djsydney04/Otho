import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { listDriveFiles, searchDriveFiles, getRecentDriveFiles, getStarredDriveFiles } from "@/lib/integrations/google/drive"

// GET /api/drive/files - List Google Drive files
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: "Not authenticated with Google" },
        { status: 401 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("query")
    const type = searchParams.get("type") // "recent", "starred", or default "all"
    const pageSize = parseInt(searchParams.get("pageSize") || "20")
    const pageToken = searchParams.get("pageToken") || undefined
    const folderId = searchParams.get("folderId") || undefined
    
    let result
    
    if (query) {
      // Search for files
      const files = await searchDriveFiles(session.accessToken, query, pageSize)
      result = { files, nextPageToken: undefined }
    } else if (type === "recent") {
      const files = await getRecentDriveFiles(session.accessToken, pageSize)
      result = { files, nextPageToken: undefined }
    } else if (type === "starred") {
      const files = await getStarredDriveFiles(session.accessToken, pageSize)
      result = { files, nextPageToken: undefined }
    } else {
      // List all files
      result = await listDriveFiles(session.accessToken, {
        pageSize,
        pageToken,
        folderId,
      })
    }
    
    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Error fetching Drive files:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch Drive files" },
      { status: 500 }
    )
  }
}

