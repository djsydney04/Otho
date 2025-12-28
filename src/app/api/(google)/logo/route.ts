import { NextRequest, NextResponse } from "next/server"

// GET /api/logo?url=https://example.com - Fetch logo from website
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url")
  
  if (!url) {
    return NextResponse.json({ error: "URL required" }, { status: 400 })
  }

  try {
    // Normalize URL
    let targetUrl = url
    if (!targetUrl.startsWith("http")) {
      targetUrl = `https://${targetUrl}`
    }
    
    const domain = new URL(targetUrl).hostname
    
    // Try multiple logo sources in order of preference
    const logoSources = [
      // Clearbit Logo API (free, reliable)
      `https://logo.clearbit.com/${domain}`,
      // Google Favicon service (fallback)
      `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
      // DuckDuckGo icons
      `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    ]
    
    // Try Clearbit first as it provides high quality logos
    const clearbitResponse = await fetch(logoSources[0], { method: 'HEAD' })
    
    if (clearbitResponse.ok) {
      return NextResponse.json({ 
        logoUrl: logoSources[0],
        source: 'clearbit'
      })
    }
    
    // Fall back to Google favicon
    return NextResponse.json({ 
      logoUrl: logoSources[1],
      source: 'google'
    })
    
  } catch (error: any) {
    console.error("Error fetching logo:", error)
    return NextResponse.json({ 
      error: error.message || "Failed to fetch logo",
      logoUrl: null 
    }, { status: 200 }) // Return 200 with null so UI can handle gracefully
  }
}

