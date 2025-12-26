"use client"

// Client-side store for managing application state with Supabase backend

import { create } from 'zustand'
import type { 
  Company, 
  Founder, 
  User, 
  Comment, 
  Tag, 
  CalendarEvent, 
  EmailThread,
  Stage,
  CompanyWithRelations,
  FounderInsert,
} from './supabase/types'

// Re-export types and constants for convenience
export type { Stage, Company, Founder, User, Comment, Tag, CalendarEvent, EmailThread, CompanyWithRelations }
export { STAGES, STAGE_CLASSES, formatRelative } from './constants'

interface CalendarSyncResult {
  success: boolean
  syncedAt: string
  totalEvents: number
  matchedEvents: number
}

interface EmailSyncResult {
  success: boolean
  syncedAt: string
  totalEmails: number
  matchedEmails: number
}

interface AppState {
  // Data
  companies: CompanyWithRelations[]
  tags: Tag[]
  founders: Founder[]
  
  // Loading states
  loading: boolean
  error: string | null
  
  // Calendar sync state
  lastSyncTime: Date | null
  syncing: boolean
  
  // Email sync state
  lastEmailSyncTime: Date | null
  emailSyncing: boolean
  
  // Current user
  currentUser: User | null
  
  // UI state
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  
  // Actions
  fetchCompanies: () => Promise<void>
  fetchTags: () => Promise<void>
  fetchFounders: () => Promise<void>
  
  addCompany: (company: {
    name: string
    description?: string
    website?: string
    stage?: Stage
    founder_id?: string
    founder_name?: string
    founder_email?: string
    tags?: string[]
  }) => Promise<CompanyWithRelations | null>
  
  addFounder: (founder: {
    name: string
    email: string
    linkedin?: string
    twitter?: string
    location?: string
    role_title?: string
    notes?: string
  }) => Promise<Founder | null>
  
  updateCompanyStage: (companyId: string, stage: Stage) => Promise<void>
  
  addComment: (companyId: string, content: string, type?: Comment["comment_type"]) => Promise<Comment | null>
  
  // Calendar actions
  setSyncing: (syncing: boolean) => void
  setLastSyncTime: (time: Date) => void
  clearCalendarData: () => void
  
  // Email actions
  setEmailSyncing: (syncing: boolean) => void
  setLastEmailSyncTime: (time: Date) => void
  clearEmailData: () => void
  
  // Initialize
  initialize: () => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  companies: [],
  tags: [],
  founders: [],
  loading: false,
  error: null,
  lastSyncTime: null,
  syncing: false,
  lastEmailSyncTime: null,
  emailSyncing: false,
  currentUser: null,
  sidebarCollapsed: false,
  
  // UI actions
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  
  // Fetch companies from API
  fetchCompanies: async () => {
    set({ loading: true, error: null })
    try {
      const response = await fetch('/api/companies')
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMsg = errorData.error || `Failed to fetch companies: ${response.status}`
        console.error('[Store] Error fetching companies:', errorMsg, errorData)
        throw new Error(errorMsg)
      }
      const companies = await response.json()
      console.log(`[Store] Loaded ${companies?.length || 0} companies from API`)
      if (companies && companies.length > 0) {
        console.log(`[Store] First 3 company names: ${companies.slice(0, 3).map((c: any) => c.name).join(', ')}`)
      }
      set({ companies: companies || [], loading: false })
    } catch (error: any) {
      console.error('[Store] Error fetching companies:', error)
      set({ error: error.message, loading: false, companies: [] })
    }
  },
  
  // Fetch tags from API
  fetchTags: async () => {
    try {
      const response = await fetch('/api/tags')
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to fetch tags: ${response.status}`)
      }
      const tags = await response.json()
      set({ tags: tags || [] })
    } catch (error: any) {
      console.error('Error fetching tags:', error)
      set({ tags: [] })
    }
  },
  
  // Fetch founders from API
  fetchFounders: async () => {
    try {
      const response = await fetch('/api/founders')
      if (!response.ok) throw new Error('Failed to fetch founders')
      const founders = await response.json()
      set({ founders })
    } catch (error: any) {
      console.error('Error fetching founders:', error)
    }
  },
  
  // Add a new company
  addCompany: async (companyData) => {
    try {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyData),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create company')
      }
      
      const newCompany = await response.json()
      
      // Refresh companies and founders list
      await Promise.all([get().fetchCompanies(), get().fetchFounders()])
      
      return newCompany
    } catch (error: any) {
      console.error('Error adding company:', error)
      set({ error: error.message })
      return null
    }
  },
  
  // Add a new founder
  addFounder: async (founderData) => {
    try {
      const response = await fetch('/api/founders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(founderData),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create founder')
      }
      
      const newFounder = await response.json()
      
      // Refresh founders list
      await get().fetchFounders()
      
      return newFounder
    } catch (error: any) {
      console.error('Error adding founder:', error)
      set({ error: error.message })
      return null
    }
  },
  
  // Update company stage
  updateCompanyStage: async (companyId, stage) => {
    try {
      const response = await fetch(`/api/companies/${companyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage }),
      })
      
      if (!response.ok) throw new Error('Failed to update company')
      
      // Update local state
      set((state) => ({
        companies: state.companies.map((c) =>
          c.id === companyId ? { ...c, stage } : c
        ),
      }))
    } catch (error: any) {
      console.error('Error updating company stage:', error)
      set({ error: error.message })
    }
  },
  
  // Add a comment
  addComment: async (companyId, content, type = 'note') => {
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          content,
          comment_type: type,
        }),
      })
      
      if (!response.ok) throw new Error('Failed to add comment')
      
      const newComment = await response.json()
      
      // Refresh companies to get updated comments
      await get().fetchCompanies()
      
      return newComment
    } catch (error: any) {
      console.error('Error adding comment:', error)
      set({ error: error.message })
      return null
    }
  },
  
  // Calendar sync actions
  setSyncing: (syncing) => set({ syncing }),
  setLastSyncTime: (time) => set({ lastSyncTime: time }),
  clearCalendarData: () => set({ lastSyncTime: null, syncing: false }),
  
  // Email sync actions
  setEmailSyncing: (emailSyncing) => set({ emailSyncing }),
  setLastEmailSyncTime: (time) => set({ lastEmailSyncTime: time }),
  clearEmailData: () => set({ lastEmailSyncTime: null, emailSyncing: false }),
  
  // Initialize store
  initialize: async () => {
    await Promise.all([
      get().fetchCompanies(),
      get().fetchTags(),
      get().fetchFounders(),
    ])
  },
}))

// Calendar sync function
export async function syncCalendar(): Promise<CalendarSyncResult | null> {
  const store = useAppStore.getState()
  store.setSyncing(true)
  
  try {
    const response = await fetch('/api/calendar/sync', {
      method: 'POST',
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      console.error('Calendar sync API error:', data.error)
      store.setSyncing(false)
      return null
    }
    
    store.setLastSyncTime(new Date(data.syncedAt))
    store.setSyncing(false)
    
    // Refresh companies to get updated calendar data
    await store.fetchCompanies()
    
    return data
  } catch (error) {
    console.error('Calendar sync error:', error)
    store.setSyncing(false)
    return null
  }
}

// Email sync function
export async function syncEmails(): Promise<EmailSyncResult | null> {
  const store = useAppStore.getState()
  store.setEmailSyncing(true)
  
  try {
    const response = await fetch('/api/gmail/sync', {
      method: 'POST',
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      console.error('Email sync API error:', data.error)
      store.setEmailSyncing(false)
      return null
    }
    
    store.setLastEmailSyncTime(new Date(data.syncedAt))
    store.setEmailSyncing(false)
    
    // Refresh companies to get updated email data
    await store.fetchCompanies()
    
    return data
  } catch (error) {
    console.error('Email sync error:', error)
    store.setEmailSyncing(false)
    return null
  }
}

// Create calendar event
export async function createCalendarEvent(event: {
  summary: string
  description?: string
  startDateTime: string
  endDateTime: string
  timeZone?: string
  attendees?: { email: string }[]
  location?: string
}): Promise<{ success: boolean; event?: any; meetLink?: string; error?: string }> {
  try {
    const response = await fetch('/api/calendar/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create event')
    }
    
    return await response.json()
  } catch (error: any) {
    console.error('Create event error:', error)
    return { success: false, error: error.message }
  }
}

// Helper to get company with all relations
export async function fetchCompanyWithRelations(companyId: string): Promise<CompanyWithRelations | null> {
  try {
    const response = await fetch(`/api/companies/${companyId}`)
    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error('Failed to fetch company')
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching company:', error)
    return null
  }
}
