import { NextRequest, NextResponse } from "next/server"
import { listDriveFiles, searchDriveFiles, getRecentDriveFiles, getStarredDriveFiles } from "@/lib/integrations/google/drive"
import { requireGoogleAccessToken } from "@/lib/integrations/google/credentials"

// GET /api/drive/files - List Google Drive files
export async function GET(request: NextRequest) {
  try {
    const credentials = await requireGoogleAccessToken()
    if (credentials.error) {
      return NextResponse.json({ error: credentials.error }, { status: 401 })
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
      const files = await searchDriveFiles(credentials.accessToken, query, pageSize)
      result = { files, nextPageToken: undefined }
    } else if (type === "recent") {
      const files = await getRecentDriveFiles(credentials.accessToken, pageSize)
      result = { files, nextPageToken: undefined }
    } else if (type === "starred") {
      const files = await getStarredDriveFiles(credentials.accessToken, pageSize)
      result = { files, nextPageToken: undefined }
    } else {
      // List all files
      result = await listDriveFiles(credentials.accessToken, {
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
