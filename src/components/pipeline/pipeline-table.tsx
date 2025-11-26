"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { STAGE_CLASSES, formatRelative, type Stage, type Tag } from "@/lib/store"
import { CalendarIcon, ChevronRightIcon } from "./icons"

interface CompanyDisplay {
  id: string
  name: string
  description?: string | null
  website?: string | null
  stage: Stage
}

interface FounderDisplay {
  name: string
  email?: string
}

interface OwnerDisplay {
  name: string
  initials: string
}

interface CompanyWithRelations {
  company: CompanyDisplay
  founder: FounderDisplay | undefined
  owner: OwnerDisplay | undefined
  tags: Tag[]
  lastContact: string | undefined
}

// Hook to fetch logo for a company
function useLogo(website: string | null | undefined) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  
  useEffect(() => {
    if (!website) return
    
    // Extract domain and use Clearbit
    try {
      const domain = new URL(website.startsWith('http') ? website : `https://${website}`).hostname
      setLogoUrl(`https://logo.clearbit.com/${domain}`)
    } catch {
      setLogoUrl(null)
    }
  }, [website])
  
  return logoUrl
}

// Company logo component with fallback
function CompanyLogo({ company }: { company: CompanyDisplay }) {
  const logoUrl = useLogo(company.website)
  const [hasError, setHasError] = useState(false)
  
  if (logoUrl && !hasError) {
    return (
      <img 
        src={logoUrl}
        alt={company.name}
        className="h-9 w-9 rounded-lg object-contain bg-white border"
        onError={() => setHasError(true)}
      />
    )
  }
  
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-medium">
      {company.name.charAt(0)}
    </div>
  )
}

interface PipelineTableProps {
  companies: CompanyWithRelations[]
}

export function PipelineTable({ companies }: PipelineTableProps) {
  const router = useRouter()

  return (
    <Card className="elevated">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-medium">Company</TableHead>
              <TableHead className="font-medium">Founder</TableHead>
              <TableHead className="font-medium">Stage</TableHead>
              <TableHead className="font-medium">Tags</TableHead>
              <TableHead className="font-medium">Owner</TableHead>
              <TableHead className="font-medium">
                <div className="flex items-center gap-1.5">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  Last Contact
                </div>
              </TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map(({ company, founder, owner, tags, lastContact }) => (
              <TableRow 
                key={company.id}
                className="group cursor-pointer smooth"
                onClick={() => router.push(`/company/${company.id}`)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <CompanyLogo company={company} />
                    <div>
                      <span className="block font-medium">{company.name}</span>
                      <span className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                        {company.description?.split('.')[0]}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {founder ? (
                    <div>
                      <span className="block text-foreground">{founder.name}</span>
                      {founder.email && (
                        <a 
                          href={`mailto:${founder.email}`}
                          className="text-xs text-muted-foreground hover:text-primary smooth"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {founder.email}
                        </a>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`${STAGE_CLASSES[company.stage]} border`}>
                    {company.stage}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {tags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="secondary"
                        className="text-xs font-normal"
                      >
                        {tag.label}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6 border">
                      <AvatarFallback className="text-[10px] bg-secondary">
                        {owner?.initials || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">{owner?.name || '—'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {lastContact ? (
                    <div className="flex items-center gap-2">
                      <div className="sync-indicator" />
                      <span className="text-sm text-muted-foreground">
                        {formatRelative(lastContact)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground/50">No meetings</span>
                  )}
                </TableCell>
                <TableCell>
                  <ChevronRightIcon className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 smooth" />
                </TableCell>
              </TableRow>
            ))}
            {companies.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No companies found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
