"use client"

import Link from "next/link"
import { Card } from "@/components/ui/card"
import { BuildingIcon, ChevronRightIcon } from "@/components/icons"

interface CompanyReferenceCardProps {
  companyId: string
  companyName: string
  reason?: string
}

export function CompanyReferenceCard({ companyId, companyName, reason }: CompanyReferenceCardProps) {
  return (
    <Link href={`/company/${companyId}`}>
      <Card className="p-3 hover:bg-secondary/50 transition-colors cursor-pointer border">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <BuildingIcon className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{companyName}</p>
              {reason && (
                <p className="text-xs text-muted-foreground truncate">{reason}</p>
              )}
            </div>
          </div>
          <ChevronRightIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </div>
      </Card>
    </Link>
  )
}

