"use client"

import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

type ChatMessage = {
  role: "user" | "assistant"
  content: string
}

type OthoEventDetail = {
  context?: string
  companyId?: string
  founderId?: string
  contextName?: string
}

// Markdown renderer for chat messages
function FormattedMessage({ content }: { content: string }) {
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

  const lines = content.split('\n')
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

export function OthoProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <OthoOverlay />
    </>
  )
}

function OthoOverlay() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [pageContext, setPageContext] = useState("")
  // Track if opened on an account page
  const [accountContext, setAccountContext] = useState<{
    companyId?: string
    founderId?: string
    contextName?: string
  } | null>(null)

  const captureScreenContext = useCallback(() => {
    const text = document?.body?.innerText || ""
    return text.slice(0, 8000)
  }, [])

  const summonOtho = useCallback(
    (detail?: OthoEventDetail) => {
      // Clear messages on each open for fresh start
      setMessages([])
      setInput("")
      setLoading(false)
      
      // Capture context
      setPageContext(detail?.context ?? captureScreenContext())
      
      // Check if we're on an account page (company or founder)
      const path = window.location.pathname
      const companyMatch = path.match(/\/company\/([^\/]+)/)
      const founderMatch = path.match(/\/founder\/([^\/]+)/)
      
      if (companyMatch || founderMatch || detail?.companyId || detail?.founderId) {
        setAccountContext({
          companyId: detail?.companyId || (companyMatch ? companyMatch[1] : undefined),
          founderId: detail?.founderId || (founderMatch ? founderMatch[1] : undefined),
          contextName: detail?.contextName
        })
      } else {
        setAccountContext(null)
      }
      
      setOpen(true)
    },
    [captureScreenContext],
  )

  const closeOverlay = useCallback(() => {
    setOpen(false)
    setInput("")
    setLoading(false)
  }, [])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === "k") {
        event.preventDefault()
        summonOtho()
        return
      }

      if (event.key === "Escape" && open) {
        event.preventDefault()
        closeOverlay()
      }
    }

    const customOpen = (event: Event) => {
      const detail = (event as CustomEvent<OthoEventDetail>).detail
      summonOtho(detail)
    }

    window.addEventListener("keydown", handler)
    window.addEventListener("open-otho", customOpen as EventListener)
    return () => {
      window.removeEventListener("keydown", handler)
      window.removeEventListener("open-otho", customOpen as EventListener)
    }
  }, [open, closeOverlay, summonOtho])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const content = input.trim()
    const userMessage = { role: "user" as const, content }
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setInput("")
    setLoading(true)

    // Only send role and content
    const conversationHistory = nextMessages.slice(-6).map(m => ({ role: m.role, content: m.content }))

    try {
      const response = await fetch("/api/chat/groq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: conversationHistory,
          pageContext,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Otho is thinking too hard.")

      const replyContent = data.reply || "Let me process that."
      setMessages([...nextMessages, { role: "assistant", content: replyContent }])
      
      // Only save to chat history if opened on an account page
      if (accountContext && (accountContext.companyId || accountContext.founderId)) {
        try {
          // Save user message
          const saveRes = await fetch("/api/chat/history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              companyId: accountContext.companyId,
              founderId: accountContext.founderId,
              message: { role: "user", content },
              title: `Quick chat: ${content.slice(0, 40)}`
            })
          })
          const saveData = await saveRes.json()
          
          // Save assistant message
          if (saveData.conversationId) {
            await fetch("/api/chat/history", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                conversationId: saveData.conversationId,
                message: { role: "assistant", content: replyContent }
              })
            })
          }
        } catch (e) {
          console.error("Failed to save to account history:", e)
        }
      }
    } catch (error) {
      console.error("Otho hotkey error:", error)
      setMessages([
        ...nextMessages,
        { role: "assistant", content: "I couldn't reach Groq just now. Try again in a second." },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-2xl !fixed !bottom-6 !top-auto !translate-y-0 !left-[50%] !-translate-x-[50%] bg-background border shadow-2xl rounded-xl">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
                <svg className="h-3.5 w-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
                </svg>
              </div>
            <span>Ask Otho</span>
            </div>
            <kbd className="text-[10px] text-muted-foreground font-normal bg-muted px-1.5 py-0.5 rounded border">⌘K</kbd>
          </DialogTitle>
        </DialogHeader>
        
        {/* Messages area */}
        {messages.length > 0 && (
          <div className="max-h-64 overflow-y-auto border rounded-lg bg-secondary/30 p-3 text-sm space-y-3 mb-3">
            {messages.map((message, idx) => (
              <div key={idx} className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {message.role === "assistant" ? "Otho" : "You"}
                </p>
                {message.role === "assistant" ? (
                  <FormattedMessage content={message.content} />
                ) : (
                  <p className="whitespace-pre-wrap text-foreground">{message.content}</p>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-1.5 py-2">
                <div className="h-2 w-2 bg-primary/40 rounded-full animate-bounce" />
                <div className="h-2 w-2 bg-primary/40 rounded-full animate-bounce [animation-delay:0.15s]" />
                <div className="h-2 w-2 bg-primary/40 rounded-full animate-bounce [animation-delay:0.3s]" />
              </div>
            )}
          </div>
        )}
        
        {/* Input */}
        <div className="space-y-3">
            <Textarea
            placeholder={messages.length === 0 ? "Ask anything about this page or your portfolio..." : "Continue the conversation..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
            className="resize-none bg-background text-sm"
              autoFocus
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
              {accountContext ? `Context: ${accountContext.contextName || 'This account'}` : 'Using page context'}
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={closeOverlay}>
                Cancel
                </Button>
                <Button size="sm" onClick={handleSend} disabled={loading || !input.trim()}>
                  {loading ? "Thinking…" : "Send"}
                </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
