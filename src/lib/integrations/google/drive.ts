import { google, drive_v3 } from "googleapis"

// Initialize the Drive API
function getDriveClient(accessToken: string): drive_v3.Drive {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  return google.drive({ version: "v3", auth })
}

export interface DriveFile {
  id: string
  name: string
  mimeType: string
  iconLink?: string
  webViewLink?: string
  webContentLink?: string
  thumbnailLink?: string
  size?: string
  createdTime?: string
  modifiedTime?: string
  starred?: boolean
  parents?: string[]
}

export interface DriveSearchResult {
  files: DriveFile[]
  nextPageToken?: string
}

// List files from Google Drive
export async function listDriveFiles(
  accessToken: string,
  options: {
    query?: string
    pageSize?: number
    pageToken?: string
    orderBy?: string
    folderId?: string
  } = {}
): Promise<DriveSearchResult> {
  const drive = getDriveClient(accessToken)
  
  const { query, pageSize = 20, pageToken, orderBy = "modifiedTime desc", folderId } = options
  
  // Build the query
  let q = "trashed = false"
  
  if (folderId) {
    q += ` and '${folderId}' in parents`
  }
  
  if (query) {
    q += ` and name contains '${query}'`
  }
  
  const response = await drive.files.list({
    q,
    pageSize,
    pageToken,
    orderBy,
    fields: "nextPageToken, files(id, name, mimeType, iconLink, webViewLink, webContentLink, thumbnailLink, size, createdTime, modifiedTime, starred, parents)",
    spaces: "drive",
  })
  
  return {
    files: (response.data.files || []) as DriveFile[],
    nextPageToken: response.data.nextPageToken || undefined,
  }
}

// Search for files
export async function searchDriveFiles(
  accessToken: string,
  query: string,
  pageSize: number = 20
): Promise<DriveFile[]> {
  const drive = getDriveClient(accessToken)
  
  const response = await drive.files.list({
    q: `name contains '${query}' and trashed = false`,
    pageSize,
    orderBy: "modifiedTime desc",
    fields: "files(id, name, mimeType, iconLink, webViewLink, webContentLink, thumbnailLink, size, createdTime, modifiedTime, starred)",
    spaces: "drive",
  })
  
  return (response.data.files || []) as DriveFile[]
}

// Get a specific file
export async function getDriveFile(
  accessToken: string,
  fileId: string
): Promise<DriveFile | null> {
  const drive = getDriveClient(accessToken)
  
  try {
    const response = await drive.files.get({
      fileId,
      fields: "id, name, mimeType, iconLink, webViewLink, webContentLink, thumbnailLink, size, createdTime, modifiedTime, starred, parents",
    })
    
    return response.data as DriveFile
  } catch (error) {
    console.error("Error getting Drive file:", error)
    return null
  }
}

// Get recent files (good for quick picker)
export async function getRecentDriveFiles(
  accessToken: string,
  pageSize: number = 10
): Promise<DriveFile[]> {
  const drive = getDriveClient(accessToken)
  
  const response = await drive.files.list({
    q: "trashed = false",
    pageSize,
    orderBy: "viewedByMeTime desc",
    fields: "files(id, name, mimeType, iconLink, webViewLink, webContentLink, thumbnailLink, size, createdTime, modifiedTime, starred)",
    spaces: "drive",
  })
  
  return (response.data.files || []) as DriveFile[]
}

// Get starred files
export async function getStarredDriveFiles(
  accessToken: string,
  pageSize: number = 20
): Promise<DriveFile[]> {
  const drive = getDriveClient(accessToken)
  
  const response = await drive.files.list({
    q: "starred = true and trashed = false",
    pageSize,
    orderBy: "modifiedTime desc",
    fields: "files(id, name, mimeType, iconLink, webViewLink, webContentLink, thumbnailLink, size, createdTime, modifiedTime, starred)",
    spaces: "drive",
  })
  
  return (response.data.files || []) as DriveFile[]
}

// Map mime type to friendly name
export function getMimeTypeFriendlyName(mimeType: string): string {
  const mimeTypes: Record<string, string> = {
    "application/vnd.google-apps.document": "Google Doc",
    "application/vnd.google-apps.spreadsheet": "Google Sheet",
    "application/vnd.google-apps.presentation": "Google Slides",
    "application/vnd.google-apps.form": "Google Form",
    "application/vnd.google-apps.drawing": "Google Drawing",
    "application/vnd.google-apps.folder": "Folder",
    "application/pdf": "PDF",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word Doc",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PowerPoint",
    "image/jpeg": "Image",
    "image/png": "Image",
    "image/gif": "Image",
    "video/mp4": "Video",
    "text/plain": "Text File",
    "text/csv": "CSV",
  }
  
  return mimeTypes[mimeType] || "File"
}

// Get file type icon based on mime type
export function getFileTypeIcon(mimeType: string): string {
  if (mimeType.includes("folder")) return "folder"
  if (mimeType.includes("document") || mimeType.includes("word")) return "doc"
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "sheet"
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "slides"
  if (mimeType.includes("pdf")) return "pdf"
  if (mimeType.includes("image")) return "image"
  if (mimeType.includes("video")) return "video"
  if (mimeType.includes("form")) return "form"
  return "file"
}

