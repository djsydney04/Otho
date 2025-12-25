"use client"

import { useMemo, useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

import { Sidebar } from "@/components/pipeline/sidebar"
import { PipelineTable } from "@/components/pipeline/pipeline-table"
import { PipelineKanban } from "@/components/pipeline/pipeline-kanban"
import {
  SearchIcon,
  PlusIcon,
  UploadIcon,
  GridIcon,
  ListIcon,
} from "@/components/pipeline/icons"

import { useAppStore, syncCalendar, syncEmails, STAGES, type Stage } from "@/lib/store"

export default function CRMPage() {
  const { companies, tags, loading, lastSyncTime, initialize } = useAppStore()
  
  const [search, setSearch] = useState("")
  const [stageFilter, setStageFilter] = useState<Stage | "all">("all")

  // Initialize store on mount
  useEffect(() => {
    initialize()
  }, [initialize])
  
  // Sync calendar and email when data loads
  useEffect(() => {
    if (!lastSyncTime) {
      syncCalendar()
      syncEmails()
    }
  }, [lastSyncTime])

  // Transform companies for display
  const companiesWithJoins = useMemo(() => {
    return companies.map((company) => ({
      company: {
        id: company.id,
        name: company.name,
        description: company.description,
        website: company.website,
        stage: company.stage,
        founderId: company.founder_id || '',
        tags: company.tags?.map(t => t.id) || [],
        ownerId: company.owner_id || '',
        lastTouch: company.last_touch || company.updated_at,
        createdAt: company.created_at,
        updatedAt: company.updated_at,
      },
      founder: company.founder || undefined,
      owner: company.owner ? {
        name: company.owner.name,
        email: company.owner.email,
        initials: company.owner.initials || company.owner.name.split(' ').map(n => n[0]).join(''),
      } : undefined,
      tags: company.tags || [],
      lastContact: company.last_touch || company.updated_at,
    }))
  }, [companies])

  const filtered = useMemo(
    () =>
      companiesWithJoins.filter(({ company, founder, tags }) => {
        const q = search.trim().toLowerCase()

        const matchesSearch =
          q.length === 0 ||
          company.name.toLowerCase().includes(q) ||
          company.description?.toLowerCase().includes(q) ||
          founder?.name.toLowerCase().includes(q) ||
          tags.some((t) => t.label.toLowerCase().includes(q))

        const matchesStage = stageFilter === "all" || company.stage === stageFilter

        return matchesSearch && matchesStage
      }),
    [companiesWithJoins, search, stageFilter],
  )

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar activePage="pipeline" />

      {/* Main content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b px-8 py-5">
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight">
              Pipeline
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Track founders, companies, and deal flow.
            </p>
          </div>
        </header>

        {/* Content */}
        <section className="flex flex-1 flex-col px-8 py-6 overflow-hidden">
          <Tabs defaultValue="table" className="flex h-full flex-col">
            {/* Toolbar */}
            <div className="mb-5 flex items-center justify-between gap-4 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
                    placeholder="Search companies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
                    className="w-64 pl-9"
            />
          </div>

          <Select
            value={stageFilter}
            onValueChange={(v) => setStageFilter(v as Stage | "all")}
          >
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="All stages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              {STAGES.map((stage) => (
                <SelectItem key={stage} value={stage}>
                  {stage}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

                <span className="text-sm text-muted-foreground">
                  {loading ? "Loading..." : `${filtered.length} companies`}
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                <TabsList className="h-9">
                  <TabsTrigger value="table" className="gap-1.5 px-3">
                    <ListIcon className="h-3.5 w-3.5" />
                    Table
                  </TabsTrigger>
                  <TabsTrigger value="kanban" className="gap-1.5 px-3">
                    <GridIcon className="h-3.5 w-3.5" />
                    Board
                  </TabsTrigger>
              </TabsList>

                <div className="h-6 w-px bg-border" />
                
                <Button variant="outline" size="sm">
                  <UploadIcon className="h-3.5 w-3.5 mr-1.5" />
                  Import
                </Button>
                <Link href="/add-company">
                  <Button size="sm">
                    <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
                    Add Company
                  </Button>
                </Link>
              </div>
            </div>

            {/* Table View */}
            <TabsContent value="table" className="flex-1 mt-0 overflow-auto">
              <PipelineTable companies={filtered} />
            </TabsContent>

            {/* Kanban View */}
            <TabsContent value="kanban" className="flex-1 mt-0 overflow-hidden">
              <PipelineKanban companies={filtered} />
            </TabsContent>
          </Tabs>
        </section>
      </main>
    </div>
  )
}
