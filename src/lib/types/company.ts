// src/lib/types/company.ts

export type Stage =
  | "Inbound"
  | "Qualified"
  | "Diligence"
  | "Committed"
  | "Passed"

export interface Company {
  id: string
  name: string
  website: string
  founderName: string
  founderEmail: string
  stage: Stage
  lastTouch: string // string for now, will replace with Date later
  owner: string
  tags: string[]
  createdAt?: string
  updatedAt?: string
}
