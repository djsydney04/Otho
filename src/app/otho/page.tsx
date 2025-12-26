"use client"

import { useState, useEffect, useRef } from "react"
import { Sidebar } from "@/components/pipeline/sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAppStore } from "@/lib/store"
import { CompanyReferenceCard } from "@/components/shared/company-reference-card"

interface ChatMessage {
  id?: string
  role: "user" | "assistant"
  content: string
  proposedAction?: any
  companyReferences?: Array<{companyId: string; companyName: string; reason: string}>
}

interface Conversation {
  id: string
  title: string | null
  updated_at: string | null
  company_id: string | null
  founder_id: string | null
}

// Markdown renderer - replaces asterisks with bullet points
function FormattedMessage({ content }: { content: string }) {
  // Replace asterisk bullet points with proper bullets
  let formattedContent = content.replace(/^\s*\*\s+/gm, '- ')
  
  const formatInline = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let key = 0
    
    const inlineRegex = /(\*\*(.+?)\*\*)|(\[([^\]]+)\]\(([^)]+)\))|(`([^`]+)`)/g
    let match
    
    while ((match = inlineRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index))
      }
      
      if (match[1]) {
        parts.push(<strong key={key++} className="font-semibold">{match[2]}</strong>)
      } else if (match[3]) {
        parts.push(
          <a key={key++} href={match[5]} target="_blank" rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:text-primary/80">
            {match[4]}
          </a>
        )
      } else if (match[6]) {
        parts.push(
          <code key={key++} className="bg-secondary/60 px-1 py-0.5 rounded text-xs font-mono">
            {match[7]}
          </code>
        )
      }
      
      lastIndex = match.index + match[0].length
    }
    
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex))
    }
    
    return parts.length === 0 ? text : parts.length === 1 ? parts[0] : <>{parts}</>
  }

  const lines = formattedContent.split('\n')
  const elements: React.ReactNode[] = []
  
  lines.forEach((line, idx) => {
    if (line.match(/^\|[-:|\s]+\|$/)) return
    if (line.match(/^---+$/)) {
      elements.push(<hr key={idx} className="my-2 border-border/30" />)
      return
    }
    if (line.startsWith('## ')) {
      const text = line.slice(3).replace(/^\d+\.\s*/, '')
      elements.push(<h3 key={idx} className="font-semibold text-sm mt-3 mb-1">{formatInline(text)}</h3>)
      return
    }
    if (line.startsWith('### ')) {
      elements.push(<h4 key={idx} className="font-semibold text-sm mt-2 mb-1">{formatInline(line.slice(4))}</h4>)
      return
    }
    if (line.match(/^[-•]\s/)) {
      elements.push(
        <div key={idx} className="flex gap-2 ml-1 my-0.5">
          <span className="text-primary/60">•</span>
          <span className="flex-1">{formatInline(line.slice(2))}</span>
        </div>
      )
      return
    }
    const numMatch = line.match(/^(\d+)\.\s(.+)/)
    if (numMatch) {
      elements.push(
        <div key={idx} className="flex gap-2 ml-1 my-0.5">
          <span className="text-primary/60 font-medium min-w-[1.2rem]">{numMatch[1]}.</span>
          <span className="flex-1">{formatInline(numMatch[2])}</span>
        </div>
      )
      return
    }
    if (line.trim() === '') {
      elements.push(<div key={idx} className="h-1.5" />)
      return
    }
    elements.push(<p key={idx} className="my-0.5">{formatInline(line)}</p>)
  })
  
  return <div className="space-y-0">{elements}</div>
}

export default function OthoPage() {
  const { companies, initialize, updateCompanyStage } = useAppStore()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const initialized = useRef(false)

  useEffect(() => {
    initialize()
  }, [initialize])

  // Load conversations list
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const response = await fetch("/api/chat/history?limit=20")
        const data = await response.json()
        setConversations(data.conversations || [])
      } catch (error) {
        console.error("Failed to load conversations:", error)
      } finally {
        setHistoryLoading(false)
      }
    }
    loadConversations()
  }, [])

  // Check for initial message from homepage
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    
    const initialMessage = sessionStorage.getItem("otho_initial_message")
    if (initialMessage) {
      sessionStorage.removeItem("otho_initial_message")
      handleSend(initialMessage)
    }
  }, [])

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }
  
  useEffect(() => {
    scrollToBottom()
  }, [messages, loading])

  const loadConversation = async (convId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/chat/history?conversationId=${convId}`)
      const data = await response.json()
      
      if (data.messages?.length > 0) {
        setMessages(data.messages.map((m: any) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          proposedAction: m.proposed_action
        })))
        setCurrentConversationId(convId)
      }
    } catch (error) {
      console.error("Failed to load conversation:", error)
    } finally {
      setLoading(false)
    }
  }

  const startNewConversation = () => {
    setMessages([])
    setCurrentConversationId(null)
  }

  const handleSend = async (text: string) => {
    const content = text.trim()
    if (!content || loading) return

    const userMsg: ChatMessage = { role: "user", content }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput("")
    setLoading(true)

    try {
      const apiMessages = nextMessages.slice(-6).map(m => ({ role: m.role, content: m.content }))
      const response = await fetch("/api/chat/groq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      })
      
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to chat")

      const replyContent = data.reply?.trim() || "I'm processing that."
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: replyContent,
        proposedAction: data.proposedAction,
        companyReferences: data.companyReferences
      }

      setMessages(prev => [...prev, assistantMsg])
      
      // Handle account changes - refresh if actions were taken
      if (data.proposedAction?.tool?.startsWith('update_')) {
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      }

      // Save to history
      try {
        const saveRes = await fetch("/api/chat/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: currentConversationId,
            message: { role: "user", content },
            title: content.slice(0, 50)
          })
        })
        const saveData = await saveRes.json()
        
        if (!currentConversationId && saveData.conversationId) {
          setCurrentConversationId(saveData.conversationId)
        }

        await fetch("/api/chat/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: saveData.conversationId || currentConversationId,
            message: { role: "assistant", content: replyContent, proposedAction: data.proposedAction }
          })
        })

        // Refresh conversations list
        const convRes = await fetch("/api/chat/history?limit=20")
        const convData = await convRes.json()
        setConversations(convData.conversations || [])
      } catch (e) {
        console.error("Failed to save chat:", e)
      }
      
    } catch (error) {
      console.error("Chat error:", error)
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "I'm having trouble connecting right now. Please try again." 
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptAction = async (action: any, index: number) => {
    try {
      if (action.field === 'stage') {
        await updateCompanyStage(action.companyId, action.value)
      } else {
        await fetch(`/api/companies/${action.companyId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [action.field]: action.value }),
        })
        initialize()
      }
      
      setMessages(prev => prev.map((msg, i) => 
        i === index ? { ...msg, proposedAction: undefined } : msg
      ))
    } catch (e) {
      console.error("Action failed", e)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return ""
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar activePage="otho" />
      <main className="flex flex-1 flex-col h-full overflow-hidden">
        {/* Fixed Header */}
        <header className="flex-shrink-0 border-b bg-card/50 px-6 py-4 flex items-center justify-between">
          <h1 className="font-display text-xl font-semibold">Otho Copilot</h1>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            className="text-xs"
          >
            {showHistory ? "Hide History" : "Chat History"}
          </Button>
        </header>
        
        {/* Main content area with fixed height */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Chat History Sidebar */}
          {showHistory && (
            <div className="w-64 border-r bg-secondary/10 overflow-y-auto flex-shrink-0">
              <div className="p-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-xs"
                  onClick={startNewConversation}
                >
                  + New Conversation
                </Button>
              </div>
              <div className="space-y-1 px-2 pb-4">
                {historyLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="flex gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-primary/40 animate-bounce" />
                      <div className="h-2 w-2 rounded-full bg-primary/40 animate-bounce [animation-delay:0.15s]" />
                      <div className="h-2 w-2 rounded-full bg-primary/40 animate-bounce [animation-delay:0.3s]" />
                    </div>
                  </div>
                ) : conversations.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No conversations yet
                  </p>
                ) : (
                  conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => loadConversation(conv.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        currentConversationId === conv.id 
                          ? "bg-primary/10 text-primary" 
                          : "hover:bg-secondary/50 text-foreground/80"
                      }`}
                    >
                      <p className="font-medium truncate text-xs">
                        {conv.title || "Untitled conversation"}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {formatDate(conv.updated_at)}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
          
          {/* Main Chat Area - Fixed layout */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Messages - Scrollable area */}
            <div className="flex-1 overflow-y-auto px-4 py-6">
              <div className="space-y-6 max-w-3xl mx-auto">
                {messages.length === 0 && !loading && (
                  <div className="flex flex-col items-center justify-center text-center p-8 opacity-50 pt-20">
                    <h3 className="text-2xl font-display font-semibold mb-2">Otho Copilot</h3>
                    <p className="text-sm max-w-md">Ask about your portfolio, get investment insights, or research companies and founders.</p>
                  </div>
                )}
                
                {messages.map((msg, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`flex-1 max-w-[75%] ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                        <div className={`inline-block text-sm leading-relaxed px-3 py-2 rounded ${
                          msg.role === 'user' 
                            ? 'bg-primary/10 text-foreground' 
                            : 'text-muted-foreground'
                        }`}>
                          {msg.role === 'user' ? (
                            <span className="whitespace-pre-wrap">{msg.content}</span>
                          ) : (
                            <FormattedMessage content={msg.content} />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Company References */}
                    {msg.companyReferences && msg.companyReferences.length > 0 && (
                      <div className="flex gap-2 flex-row">
                        <div className="flex-1 max-w-[75%] space-y-2">
                          {msg.companyReferences.map((ref: any, refIdx: number) => {
                            const company = companies.find(c => c.id === ref.companyId)
                            if (!company) return null
                            return (
                              <CompanyReferenceCard
                                key={refIdx}
                                companyId={ref.companyId}
                                companyName={ref.companyName || company.name}
                                reason={ref.reason}
                              />
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Action Card */}
                    {msg.proposedAction && msg.role === 'assistant' && (
                      <div className="flex gap-2 flex-row">
                        <div className="flex-1 max-w-[75%]">
                          <Card className="overflow-hidden border shadow-sm bg-amber-50/50 border-amber-100">
                            <CardContent className="p-4">
                              <p className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-2">Proposed Update</p>
                              <p className="text-sm font-medium text-foreground mb-3">
                                Set <strong>{msg.proposedAction.field}</strong> to <strong>{String(msg.proposedAction.value)}</strong> for {msg.proposedAction.companyName}?
                              </p>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => handleAcceptAction(msg.proposedAction, idx)} className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white">
                                  Accept
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-8 text-xs"
                                  onClick={() => setMessages(prev => prev.map((m, i) => i === idx ? { ...m, proposedAction: undefined } : m))}
                                >
                                  Dismiss
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {loading && (
                  <div className="flex gap-2 flex-row">
                    <div className="flex-1 max-w-[75%] text-left">
                      <div className="inline-block text-sm px-3 py-2 rounded text-muted-foreground">
                        <div className="flex gap-1.5">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce" />
                          <div className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:0.15s]" />
                          <div className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:0.3s]" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Fixed Input at bottom */}
            <div className="flex-shrink-0 border-t bg-white/80 backdrop-blur p-4">
              <div className="relative max-w-3xl mx-auto">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSend(input)
                    }
                  }}
                  placeholder="Ask Otho anything..."
                  className="w-full rounded-2xl border bg-secondary/30 shadow-sm px-6 py-4 text-base transition-all placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  autoFocus
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Button 
                    size="sm" 
                    className="h-9 px-4 rounded-xl"
                    onClick={() => handleSend(input)} 
                    disabled={loading || !input.trim()}
                  >
                    {loading ? (
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
