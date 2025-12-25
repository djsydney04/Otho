import { NextRequest, NextResponse } from "next/server"

// Fetch real ticker data from Yahoo Finance
async function fetchTickerData(symbol: string) {
  try {
    // Use Yahoo Finance API (no key required)
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`,
      { next: { revalidate: 300 } } // Cache for 5 minutes
    )
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ${symbol}`)
    }
    
    const data = await response.json()
    const result = data.chart?.result?.[0]
    
    if (!result) {
      throw new Error(`No data for ${symbol}`)
    }
    
    const meta = result.meta
    const quotes = result.indicators?.quote?.[0]
    const timestamps = result.timestamp || []
    
    // Get price history for sparkline
    const closes = quotes?.close?.filter((c: number | null) => c !== null) || []
    const currentPrice = meta.regularMarketPrice || closes[closes.length - 1]
    const previousClose = meta.previousClose || closes[0]
    
    const change = currentPrice - previousClose
    const changePercent = ((change / previousClose) * 100)
    
    // Normalize sparkline data (0-100 scale)
    const minPrice = Math.min(...closes)
    const maxPrice = Math.max(...closes)
    const range = maxPrice - minPrice || 1
    const sparkline = closes.map((c: number) => 
      Math.round(((c - minPrice) / range) * 100)
    )
    
    return {
      symbol: symbol.toUpperCase(),
      name: meta.shortName || meta.symbol || symbol,
      price: currentPrice.toFixed(2),
      change: (change >= 0 ? '+' : '') + change.toFixed(2),
      changePercent: (changePercent >= 0 ? '+' : '') + changePercent.toFixed(2) + '%',
      positive: change >= 0,
      sparkline,
    }
  } catch (error) {
    console.error(`Ticker error for ${symbol}:`, error)
    return {
      symbol: symbol.toUpperCase(),
      name: symbol,
      price: null,
      change: null,
      changePercent: null,
      positive: null,
      sparkline: [],
      error: true,
    }
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbols = searchParams.get("symbols")?.split(",") || ["SPY", "QQQ", "BTC-USD"]
  
  try {
    const tickers = await Promise.all(
      symbols.slice(0, 10).map(s => fetchTickerData(s.trim()))
    )
    
    return NextResponse.json({ tickers })
  } catch (error) {
    console.error("Tickers API error:", error)
    return NextResponse.json({ error: "Failed to fetch tickers" }, { status: 500 })
  }
}
