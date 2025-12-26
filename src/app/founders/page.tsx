"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Sidebar } from "@/components/pipeline/sidebar"
import { SearchIcon, PlusIcon, ChevronRightIcon } from "@/components/pipeline/icons"
import { useAppStore, formatRelative } from "@/lib/store"

export default function FoundersPage() {
  const router = useRouter()
  const { founders, companies, loading, fetchFounders, fetchCompanies } = useAppStore()
  const [search, setSearch] = useState("")
  
  // Always fetch fresh data when the page loads
  useEffect(() => {
    fetchFounders()
    fetchCompanies()
  }, [fetchFounders, fetchCompanies])
  
  // Enrich founders with company info
  const enrichedFounders = useMemo(() => {
    return founders.map(founder => {
      const company = companies.find(c => c.founder_id === founder.id)
      return { founder, company }
    })
  }, [founders, companies])
  
  // Filter founders
  const filtered = useMemo(() => {
    if (!search.trim()) return enrichedFounders
    const q = search.toLowerCase()
    return enrichedFounders.filter(({ founder, company }) => 
      founder.name.toLowerCase().includes(q) ||
      founder.email.toLowerCase().includes(q) ||
      founder.location?.toLowerCase().includes(q) ||
      founder.role_title?.toLowerCase().includes(q) ||
      founder.previous_companies?.toLowerCase().includes(q) ||
      company?.name.toLowerCase().includes(q)
    )
  }, [enrichedFounders, search])

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar activePage="founders" />
      
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between border-b px-8 py-5">
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight">
              Founders
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Track founders and their companies.
            </p>
          </div>
          <Link href="/add-founder">
            <Button size="sm">
              <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
              Add Founder
            </Button>
          </Link>
        </header>
        
        {/* Content */}
        <section className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
          {/* Search */}
          <div className="flex items-center gap-3">
            <div className="relative max-w-sm">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search founders..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <span className="text-sm text-muted-foreground">
              {loading ? "Loading..." : `${filtered.length} founders`}
            </span>
          </div>
          
          {/* Founders Table */}
          <Card className="elevated">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-medium">Founder</TableHead>
                    <TableHead className="font-medium">Company</TableHead>
                    <TableHead className="font-medium">Background</TableHead>
                    <TableHead className="font-medium">Location</TableHead>
                    <TableHead className="font-medium">Added</TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length > 0 ? (
                    filtered.map(({ founder, company }) => (
                      <TableRow 
                        key={founder.id} 
                        className="group cursor-pointer smooth"
                        onClick={() => router.push(`/founder/${founder.id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border">
                              <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                                {founder.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <span className="block font-medium">{founder.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {founder.role_title || founder.email}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {company ? (
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-secondary text-xs font-medium">
                                {company.name.charAt(0)}
                              </div>
                              <div>
                                <span className="text-sm">{company.name}</span>
                                <Badge variant="outline" className="ml-2 text-[10px] px-1.5">
                                  {company.stage}
                                </Badge>
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground line-clamp-1 max-w-[200px]">
                            {founder.previous_companies || founder.education || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {founder.location || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatRelative(founder.created_at)}
                        </TableCell>
                        <TableCell>
                          <ChevronRightIcon className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 smooth" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : founders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <p className="text-muted-foreground">No founders yet</p>
                          <Link href="/add-founder">
                            <Button size="sm" variant="outline">
                              <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
                              Add your first founder
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No founders match your search
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  )
}
