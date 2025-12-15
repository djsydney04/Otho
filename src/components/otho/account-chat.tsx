"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAppStore } from "@/lib/store"

interface ChatMessage {
  id?: string
  role: "user" | "assistant"
  content: string
  proposedAction?: any
}

interface AccountChatProps {
  companyId?: string
  founderId?: string
  contextName: string
}

// Simple markdown formatter
function FormattedMessage({ content }: { content: string }) {
  const formatInline = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let key = 0
    
    const inlineRegex = /(\*\*(.+?)\*\*)|(\[([^\]]+)\]\(([^)]+)\))/g
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
      }
      
      lastIndex = match.index + match[0].length
    }
    
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex))
    }
    
    return parts.length === 0 ? text : parts.length === 1 ? parts[0] : <>{parts}</>
  }

  const lines = content.split('\n')
  return (
    <div className="space-y-1">
      {lines.map((line, idx) => {
        if (line.trim() === '') return <div key={idx} className="h-1" />
        if (line.match(/^[-•]\s/)) {
          return (
            <div key={idx} className="flex gap-2 ml-1">
              <span className="text-primary/60">•</span>
              <span className="flex-1">{formatInline(line.slice(2))}</span>
            </div>
          )
        }
        return <p key={idx}>{formatInline(line)}</p>
      })}
    </div>
  )
}

export function AccountChat({ companyId, founderId, contextName }: AccountChatProps) {
  const { initialize, updateCompanyStage } = useAppStore()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Load chat history for this account
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const params = new URLSearchParams()
        if (companyId) params.set("companyId", companyId)
        if (founderId) params.set("founderId", founderId)
        params.set("limit", "1")
        
        const response = await fetch(`/api/chat/history?${params}`)
        const data = await response.json()
        
        if (data.conversations?.length > 0) {
          const conv = data.conversations[0]
          setConversationId(conv.id)
          
          // Load messages
          const msgResponse = await fetch(`/api/chat/history?conversationId=${conv.id}`)
          const msgData = await msgResponse.json()
          
          if (msgData.messages?.length > 0) {
            setMessages(msgData.messages.map((m: any) => ({
              id: m.id,
              role: m.role as "user" | "assistant",
              content: m.content,
              proposedAction: m.proposed_action
            })))
          }
        }
      } catch (error) {
        console.error("Failed to load chat history:", error)
      } finally {
        setHistoryLoading(false)
      }
    }
    
    loadHistory()
  }, [companyId, founderId])

  // Auto-scroll
  useEffect(() => {
    if (isExpanded) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, loading, isExpanded])

  const handleSend = async () => {
    const content = input.trim()
    if (!content || loading) return

    const userMsg: ChatMessage = { role: "user", content }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setLoading(true)

    try {
      // Get page context
      const pageContext = document?.body?.innerText?.slice(0, 4000) || ""
      
      const apiMessages = [...messages, userMsg].slice(-6).map(m => ({ role: m.role, content: m.content }))
      const response = await fetch("/api/chat/groq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, pageContext }),
      })
      
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to chat")

      const replyContent = data.reply?.trim() || "I'm processing that."
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: replyContent,
        proposedAction: data.proposedAction
      }

      setMessages(prev => [...prev, assistantMsg])

      // Save to history
      try {
        const saveRes = await fetch("/api/chat/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId,
            companyId,
            founderId,
            message: { role: "user", content },
            title: `Chat about ${contextName}`
          })
        })
        const saveData = await saveRes.json()
        
        if (!conversationId && saveData.conversationId) {
          setConversationId(saveData.conversationId)
        }

        await fetch("/api/chat/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: saveData.conversationId || conversationId,
            message: { role: "assistant", content: replyContent }
          })
        })
      } catch (e) {
        console.error("Failed to save chat:", e)
      }
      
    } catch (error) {
      console.error("Chat error:", error)
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "I'm having trouble connecting right now." 
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

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Otho Chat</CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 text-xs"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? "Collapse" : messages.length > 0 ? `${messages.length} messages` : "Start chat"}
          </Button>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0">
          {/* Messages */}
          <div className="max-h-80 overflow-y-auto space-y-3 mb-3 custom-scrollbar">
            {historyLoading ? (
              <div className="flex justify-center py-4">
                <div className="flex gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-primary/40 animate-bounce" />
                  <div className="h-2 w-2 rounded-full bg-primary/40 animate-bounce [animation-delay:0.15s]" />
                  <div className="h-2 w-2 rounded-full bg-primary/40 animate-bounce [animation-delay:0.3s]" />
                </div>
              </div>
            ) : messages.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Ask Otho about {contextName}
              </p>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${
                    msg.role === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-secondary/50 text-foreground'
                  }`}>
                    {msg.role === 'user' ? msg.content : <FormattedMessage content={msg.content} />}
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-secondary/50 rounded-xl px-3 py-2 flex gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce" />
                  <div className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:0.15s]" />
                  <div className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:0.3s]" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder={`Ask about ${contextName}...`}
              className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary/20"
            />
            <Button 
              size="sm" 
              className="h-9 px-3"
              onClick={handleSend} 
              disabled={loading || !input.trim()}
            >
              {loading ? (
                <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              )}
            </Button>
          </div>
        </CardContent>
      )}
      
      {/* Collapsed preview */}
      {!isExpanded && messages.length > 0 && (
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground truncate">
            Last: {messages[messages.length - 1]?.content.slice(0, 60)}...
          </p>
        </CardContent>
      )}
    </Card>
  )
}



