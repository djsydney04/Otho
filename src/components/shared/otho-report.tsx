"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RefreshIcon, BrainIcon } from "@/components/icons"
import { CompanyReferenceCard } from "./company-reference-card"

interface OthoReportProps {
  companyId?: string
  founderId?: string
  initialInsights?: string | null
  name: string
  website?: string | null
}

export function OthoReport({ companyId, founderId, initialInsights, name, website }: OthoReportProps) {
  const [insights, setInsights] = useState<string | null>(initialInsights || null)
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [chatInput, setChatInput] = useState("")
  const [chatMessages, setChatMessages] = useState<Array<{ 
    role: "user" | "assistant"
    content: string
    companyReferences?: Array<{companyId: string; companyName: string; reason: string}>
  }>>([])
  const [chatting, setChatting] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages, chatting])

  // Auto-generate insights on mount if none exist
  useEffect(() => {
    if (!insights && (companyId || founderId) && !loading) {
      handleGenerate()
    }
  }, [companyId, founderId])

  const handleGenerate = async () => {
    if (!companyId && !founderId) return
    
    setLoading(true)
    try {
      const endpoint = companyId 
        ? `/api/ai/analyze`
        : `/api/ai/analyze?founderId=${founderId}`
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          companyId: companyId || undefined,
          founderId: founderId || undefined,
        }),
      })

      if (!response.ok) throw new Error("Failed to generate insights")
      
      const data = await response.json()
      setInsights(data.analysis || null)
    } catch (error) {
      console.error("Error generating insights:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    if (!companyId && !founderId) return
    
    setUpdating(true)
    try {
      // Trigger a chat with Otho to refresh insights
      const response = await fetch("/api/chat/groq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `Analyze ${name}${website ? ` (website: ${website})` : ""} and provide comprehensive insights including competitive edge, market position, risks, and what to watch out for.`
          }],
          companyId: companyId || undefined,
          founderId: founderId || undefined,
        }),
      })

      const data = await response.json()
      if (data.reply) {
        setInsights(data.reply)
      }
    } catch (error) {
      console.error("Error refreshing insights:", error)
    } finally {
      setUpdating(false)
    }
  }

  const handleChatSend = async () => {
    if (!chatInput.trim() || chatting) return

    const userMsg = { role: "user" as const, content: chatInput.trim() }
    setChatMessages(prev => [...prev, userMsg])
    setChatInput("")
    setChatting(true)

    try {
      const response = await fetch("/api/chat/groq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...chatMessages, userMsg].map(m => ({ role: m.role, content: m.content })),
          companyId: companyId || undefined,
          founderId: founderId || undefined,
        }),
      })

      const data = await response.json()
      if (data.reply) {
        setChatMessages(prev => [...prev, { 
          role: "assistant", 
          content: data.reply,
          companyReferences: data.companyReferences
        }])
        // Update insights if the reply contains analysis
        if (data.reply.length > 200 && (data.reply.includes("competitive") || data.reply.includes("risk") || data.reply.includes("strength"))) {
          setInsights(data.reply)
        }
        
        // Refresh page if account changes were made
        if (data.proposedAction?.tool?.startsWith('update_')) {
          setTimeout(() => {
            window.location.reload()
          }, 1500)
        }
      }
    } catch (error) {
      console.error("Chat error:", error)
      setChatMessages(prev => [...prev, { role: "assistant", content: "I'm having trouble connecting right now." }])
    } finally {
      setChatting(false)
    }
  }

  const formatInsights = (text: string) => {
    // Replace asterisk bullet points with proper bullets
    let formattedText = text.replace(/^\s*\*\s+/gm, '• ')
    
    const lines = formattedText.split('\n')
    return (
      <div className="space-y-2 text-xs leading-relaxed">
        {lines.map((line, idx) => {
          if (line.trim() === '') return <div key={idx} className="h-1.5" />
          
          // Headers
          if (line.match(/^##?\s+/)) {
            const level = line.startsWith('##') ? 2 : 3
            const content = line.replace(/^##?\s+/, '')
            return (
              <h3 key={idx} className={`font-semibold mt-3 mb-1.5 ${level === 2 ? 'text-sm' : 'text-xs'}`}>
                {content}
              </h3>
            )
          }
          
          // Bullet points (supports both - and •)
          if (line.match(/^[-•]\s/)) {
            const content = line.slice(2)
            const parts: React.ReactNode[] = []
            let lastIndex = 0
            const boldRegex = /\*\*(.+?)\*\*/g
            let match
            let key = 0
            
            while ((match = boldRegex.exec(content)) !== null) {
              if (match.index > lastIndex) {
                parts.push(<span key={key++}>{content.slice(lastIndex, match.index)}</span>)
              }
              parts.push(<strong key={key++} className="font-semibold">{match[1]}</strong>)
              lastIndex = match.index + match[0].length
            }
            
            if (lastIndex < content.length) {
              parts.push(<span key={key++}>{content.slice(lastIndex)}</span>)
            }
            
            return (
              <div key={idx} className="flex gap-2">
                <span className="text-primary/60 text-xs flex-shrink-0">•</span>
                <span className="flex-1">{parts.length > 0 ? parts : content}</span>
              </div>
            )
          }
          
          // Bold text
          const parts: React.ReactNode[] = []
          let lastIndex = 0
          const boldRegex = /\*\*(.+?)\*\*/g
          let match
          let key = 0
          
          while ((match = boldRegex.exec(line)) !== null) {
            if (match.index > lastIndex) {
              parts.push(<span key={key++}>{line.slice(lastIndex, match.index)}</span>)
            }
            parts.push(<strong key={key++} className="font-semibold">{match[1]}</strong>)
            lastIndex = match.index + match[0].length
          }
          
          if (lastIndex < line.length) {
            parts.push(<span key={key++}>{line.slice(lastIndex)}</span>)
          }
          
          return <p key={idx} className="leading-relaxed">{parts.length > 0 ? parts : line}</p>
        })}
      </div>
    )
  }

  return (
    <Card className="border shadow-sm flex flex-col h-[600px]">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrainIcon className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-medium">Otho Report</CardTitle>
          </div>
          <div className="flex gap-2">
            {insights && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={handleRefresh}
                disabled={updating}
              >
                <RefreshIcon className={`h-3 w-3 mr-1 ${updating ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            )}
          </div>
        </div>
        <CardDescription className="text-xs">
          Competitive analysis, risks, and market intelligence
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Scrollable Report Content */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto pr-2 mb-4 custom-scrollbar"
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="flex gap-1.5 mb-2">
                <div className="h-2 w-2 rounded-full bg-primary/40 animate-bounce" />
                <div className="h-2 w-2 rounded-full bg-primary/40 animate-bounce [animation-delay:0.15s]" />
                <div className="h-2 w-2 rounded-full bg-primary/40 animate-bounce [animation-delay:0.3s]" />
              </div>
              <p className="text-xs text-muted-foreground">Analyzing {name}...</p>
            </div>
          ) : insights ? (
            <div className="prose prose-sm max-w-none">
              {formatInsights(insights)}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-xs text-muted-foreground mb-3">
                Get AI-powered insights about {name}
              </p>
              <Button size="sm" onClick={handleGenerate} disabled={loading}>
                <BrainIcon className="h-3 w-3 mr-2" />
                Generate Insights
              </Button>
            </div>
          )}

          {/* Chat Messages */}
          {chatMessages.length > 0 && (
            <div className="mt-4 pt-4 border-t space-y-2.5">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Discussion</h4>
              {chatMessages.map((msg, idx) => (
                <div key={idx} className="space-y-2">
                  <div className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`flex-1 max-w-[80%] ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                      <div className={`inline-block text-xs leading-relaxed px-2.5 py-1.5 rounded ${
                        msg.role === 'user' 
                          ? 'bg-primary/10 text-foreground' 
                          : 'text-muted-foreground'
                      }`}>
                        {msg.role === 'user' ? (
                          <span>{msg.content}</span>
                        ) : (
                          formatInsights(msg.content)
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Company References */}
                  {msg.companyReferences && msg.companyReferences.length > 0 && (
                    <div className="flex gap-2 flex-row">
                      <div className="flex-1 max-w-[80%] space-y-2">
                        {msg.companyReferences.map((ref, refIdx) => (
                          <CompanyReferenceCard
                            key={refIdx}
                            companyId={ref.companyId}
                            companyName={ref.companyName}
                            reason={ref.reason}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {chatting && (
                <div className="flex gap-2 flex-row">
                  <div className="flex-1 max-w-[80%] text-left">
                    <div className="inline-block text-xs px-2.5 py-1.5 rounded text-muted-foreground">
                      <div className="flex gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce" />
                        <div className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:0.15s]" />
                        <div className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:0.3s]" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div className="flex gap-2 flex-shrink-0 pt-3 border-t">
          <Input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleChatSend()
              }
            }}
            placeholder="Ask Otho about this report..."
            className="flex-1 h-9 text-sm"
            disabled={chatting || !insights}
          />
          <Button 
            size="sm" 
            className="h-9 px-3"
            onClick={handleChatSend} 
            disabled={chatting || !chatInput.trim() || !insights}
          >
            {chatting ? (
              <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

