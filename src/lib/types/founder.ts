// src/lib/types/founder.ts

export interface Founder {
    id: string // uuid
    name: string
    email: string
    currentCompany?: string
    currentRole?: string
    linkedin?: string
    twitter?: string
    location?: string
    notes?: string
    createdAt?: string
    comments?: string[]
    previousCompanies?: string[]
    updatedAt?: string
  }
  
export interface Tag {
  id: string
  label: string
}
