"use client"

import { useEffect, useState, useMemo } from "react"
import { useUser } from "@clerk/nextjs"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Sidebar } from "@/components/pipeline/sidebar"
import { SearchIcon, RefreshIcon } from "@/components/pipeline/icons"
import { useAppStore, syncEmails, formatRelative } from "@/lib/store"

interface Email {
  id: string
  threadId: string
  subject: string
  from: string
  fromEmail: string
  to: string
  date: string
  snippet: string
  labels: string[]
  companyId?: string
  companyName?: string
}

export default function InboxPage() {
  const { user } = useUser()
  const { emailSyncing, lastEmailSyncTime, companies } = useAppStore()
  const [search, setSearch] = useState("")
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(false)
  
  // Fetch emails from API
  const fetchEmails = async () => {
    if (!user) return
    setLoading(true)
    try {
      const response = await fetch('/api/gmail/messages?matchFounders=true')
      if (response.ok) {
        const data = await response.json()
        // Add company names to emails
        const emailsWithCompanies = data.emails?.map((email: Email) => {
          const matchingCompany = companies.find(c => 
            c.founder?.email?.toLowerCase() === email.fromEmail.toLowerCase()
          )
          return {
            ...email,
            companyId: matchingCompany?.id,
            companyName: matchingCompany?.name,
          }
        }) || []
        setEmails(emailsWithCompanies)
      }
    } catch (error) {
      console.error('Error fetching emails:', error)
    }
    setLoading(false)
  }
  
  // Fetch on mount if connected
  useEffect(() => {
    if (user) {
      fetchEmails()
    }
  }, [user, companies])
  
  // Filter emails
  const filteredEmails = useMemo(() => {
    if (!search.trim()) return emails
    const q = search.toLowerCase()
    return emails.filter(email => 
      email.subject?.toLowerCase().includes(q) ||
      email.from?.toLowerCase().includes(q) ||
      email.snippet?.toLowerCase().includes(q) ||
      email.companyName?.toLowerCase().includes(q)
    )
  }, [emails, search])

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar activePage="inbox" />
      
      <main className="flex flex-1 flex-col">
        {/* Header */}
        <header className="flex items-center justify-between border-b px-8 py-5">
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight">
              Inbox
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Email threads with founders in your pipeline.
            </p>
          </div>
          
          {lastEmailSyncTime && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Last synced {formatRelative(lastEmailSyncTime.toISOString())}</span>
              <button
                onClick={() => { syncEmails(); fetchEmails(); }}
                disabled={emailSyncing || loading}
                className="p-1.5 rounded hover:bg-secondary smooth"
              >
                <RefreshIcon className={`h-4 w-4 ${emailSyncing || loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          )}
        </header>
        
        {/* Content */}
        <section className="flex-1 overflow-y-auto px-8 py-6">
          {!user ? (
            <Card className="elevated">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="text-center max-w-md">
                  <h3 className="font-display text-lg font-semibold mb-2">
                    Connect Google to view emails
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Connect your Google account from the sidebar to see email threads 
                    with founders in your pipeline.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative max-w-md">
                <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search emails..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              {/* Email List */}
              {loading && emails.length === 0 ? (
                <Card className="elevated">
                  <CardContent className="flex items-center justify-center py-16">
                    <div className="flex items-center gap-3">
                      <RefreshIcon className="h-5 w-5 animate-spin text-muted-foreground" />
                      <span className="text-muted-foreground">Loading emails...</span>
                    </div>
                  </CardContent>
                </Card>
              ) : filteredEmails.length === 0 ? (
                <Card className="elevated">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <p className="text-muted-foreground">
                      {emails.length === 0 
                        ? "No emails found from founders in your pipeline."
                        : "No emails match your search."
                      }
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="elevated overflow-hidden">
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {filteredEmails.map((email) => (
                        <div
                          key={email.id}
                          className="p-4 hover:bg-secondary/30 smooth cursor-pointer"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium truncate">
                                  {email.from}
                                </span>
                                {email.companyName && (
                                  <Badge variant="secondary" className="text-xs font-normal">
                                    {email.companyName}
                                  </Badge>
                                )}
                              </div>
                              <h3 className="font-medium text-sm mb-1 truncate">
                                {email.subject || "(No subject)"}
                              </h3>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {email.snippet}
                              </p>
                            </div>
                            <div className="flex-shrink-0 text-xs text-muted-foreground">
                              {formatRelative(email.date)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <p className="text-xs text-muted-foreground text-center">
                {filteredEmails.length} emails
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
