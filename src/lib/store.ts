"use client"

/**
 * Global Application Store
 * 
 * This is the central state management for the Angel Lead application.
 * Built with Zustand for simple, performant state management.
 * 
 * Key Responsibilities:
 * - Manages companies, founders, tags, and user data
 * - Handles all API communication with the backend
 * - Provides loading states and error handling
 * - Syncs with Google Calendar and Gmail
 * 
 * Usage:
 * ```tsx
 * const { companies, fetchCompanies, addCompany } = useAppStore()
 * ```
 */

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

// Re-export types and constants for convenience across the app
export type { Stage, Company, Founder, User, Comment, Tag, CalendarEvent, EmailThread, CompanyWithRelations }
export { STAGES, STAGE_CLASSES, formatRelative } from './constants'

/**
 * Calendar Sync Result
 * Returned after syncing with Google Calendar
 */
interface CalendarSyncResult {
  success: boolean
  syncedAt: string
  totalEvents: number
  matchedEvents: number // Events matched to companies/founders
}

/**
 * Email Sync Result
 * Returned after syncing with Gmail
 */
interface EmailSyncResult {
  success: boolean
  syncedAt: string
  totalEmails: number
  matchedEmails: number // Emails matched to companies/founders
}

/**
 * Application State Interface
 * Defines the shape of the global store
 */
interface AppState {
  // ==================== DATA ====================
  /** All companies with their relations (founder, tags, comments, etc.) */
  companies: CompanyWithRelations[]
  
  /** Available tags for categorizing companies */
  tags: Tag[]
  
  /** All founders in the system */
  founders: Founder[]
  
  // ==================== LOADING STATES ====================
  /** General loading state for async operations */
  loading: boolean
  
  /** Error message if any operation fails */
  error: string | null
  
  // ==================== CALENDAR SYNC ====================
  /** Last time calendar was synced with Google */
  lastSyncTime: Date | null
  
  /** Whether calendar sync is currently in progress */
  syncing: boolean
  
  // ==================== EMAIL SYNC ====================
  /** Last time emails were synced with Gmail */
  lastEmailSyncTime: Date | null
  
  /** Whether email sync is currently in progress */
  emailSyncing: boolean
  
  // ==================== USER ====================
  /** Currently authenticated user */
  currentUser: User | null
  
  // ==================== UI STATE ====================
  /** Whether the sidebar is collapsed */
  sidebarCollapsed: boolean
  
  /** Toggle sidebar collapsed state */
  setSidebarCollapsed: (collapsed: boolean) => void
  
  // ==================== DATA FETCHING ====================
  /** Fetch all companies from the API */
  fetchCompanies: () => Promise<void>
  
  /** Fetch all tags from the API */
  fetchTags: () => Promise<void>
  
  /** Fetch all founders from the API */
  fetchFounders: () => Promise<void>
  
  // ==================== DATA MUTATIONS ====================
  /**
   * Add a new company to the pipeline
   * Can either link to existing founder by UUID or create a new one
   */
  addCompany: (company: {
    name: string
    description?: string
    website?: string
    stage?: Stage
    founder_id?: string // Link to existing founder by UUID
    founder?: { // Create new founder (will be created first, then linked by UUID)
      name: string
      email: string
      role_title?: string
      linkedin?: string
      twitter?: string
      location?: string
      bio?: string
      previous_companies?: string
      education?: string
      domain_expertise?: string[]
      source?: string
      warm_intro_path?: string
      notes?: string
    }
    tags?: string[]
    owner?: string
    is_priority?: boolean
    needs_diligence?: boolean
    needs_followup?: boolean
  }) => Promise<CompanyWithRelations | null>
  
  /**
   * Add a new founder to the system
   */
  addFounder: (founder: {
    name: string
    email: string
    linkedin?: string
    twitter?: string
    location?: string
    role_title?: string
    notes?: string
  }) => Promise<Founder | null>
  
  /**
   * Update a company's pipeline stage
   * Automatically adds a stage change comment
   */
  updateCompanyStage: (companyId: string, stage: Stage) => Promise<void>
  
  /**
   * Add a comment/note to a company
   */
  addComment: (companyId: string, content: string, type?: Comment["comment_type"]) => Promise<Comment | null>
  
  // ==================== CALENDAR ACTIONS ====================
  /** Set calendar syncing state */
  setSyncing: (syncing: boolean) => void
  
  /** Update last sync time */
  setLastSyncTime: (time: Date) => void
  
  /** Clear all calendar sync data */
  clearCalendarData: () => void
  
  // ==================== EMAIL ACTIONS ====================
  /** Set email syncing state */
  setEmailSyncing: (syncing: boolean) => void
  
  /** Update last email sync time */
  setLastEmailSyncTime: (time: Date) => void
  
  /** Clear all email sync data */
  clearEmailData: () => void
  
  // ==================== INITIALIZATION ====================
  /**
   * Initialize the store by fetching all data
   * Call this on app mount
   */
  initialize: () => Promise<void>
}

/**
 * Main Application Store
 * 
 * This is a Zustand store that manages all application state.
 * It's a singleton that can be used across the entire app.
 */
export const useAppStore = create<AppState>((set, get) => ({
  // ==================== INITIAL STATE ====================
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
  
  // ==================== UI ACTIONS ====================
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  
  // ==================== DATA FETCHING ====================
  /**
   * Fetch all companies for the current user
   * Includes related data: founder, tags, comments
   */
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
  
  /**
   * Fetch all available tags
   * Tags are used to categorize companies (e.g., "SaaS", "B2B", "AI")
   */
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
  
  /**
   * Fetch all founders
   * Founders are people who run companies in the pipeline
   */
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
  
  // ==================== DATA MUTATIONS ====================
  /**
   * Add a new company to the pipeline
   * 
   * This will:
   * 1. Create the company in the database
   * 2. Optionally create or link a founder
   * 3. Add tags if provided
   * 4. Refresh the companies and founders lists
   * 5. Generate AI analysis in the background
   */
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
  
  /**
   * Add a new founder
   * 
   * Creates a standalone founder record.
   * Founders can later be linked to companies.
   */
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
      
      // Refresh founders list to include the new founder
      await get().fetchFounders()
      
      return newFounder
    } catch (error: any) {
      console.error('Error adding founder:', error)
      set({ error: error.message })
      return null
    }
  },
  
  /**
   * Update a company's pipeline stage
   * 
   * Stages: Inbound → Qualified → Diligence → Committed / Passed
   * This automatically adds a stage change comment to the company timeline
   */
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
  
  /**
   * Add a comment to a company
   * 
   * Comments create a timeline of interactions and notes.
   * Types: note, update, meeting, stage_change, email
   */
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
  
  // ==================== CALENDAR SYNC ====================
  setSyncing: (syncing) => set({ syncing }),
  setLastSyncTime: (time) => set({ lastSyncTime: time }),
  clearCalendarData: () => set({ lastSyncTime: null, syncing: false }),
  
  // ==================== EMAIL SYNC ====================
  setEmailSyncing: (emailSyncing) => set({ emailSyncing }),
  setLastEmailSyncTime: (time) => set({ lastEmailSyncTime: time }),
  clearEmailData: () => set({ lastEmailSyncTime: null, emailSyncing: false }),
  
  // ==================== INITIALIZATION ====================
  /**
   * Initialize the store
   * 
   * Fetches all data in parallel: companies, tags, and founders
   * Call this once when the app loads
   */
  initialize: async () => {
    await Promise.all([
      get().fetchCompanies(),
      get().fetchTags(),
      get().fetchFounders(),
    ])
  },
}))

// ==================== EXTERNAL SYNC FUNCTIONS ====================
/**
 * Sync Calendar with Google Calendar
 * 
 * This function:
 * 1. Fetches recent calendar events from Google Calendar
 * 2. Matches events to companies/founders by email
 * 3. Stores matched events in the database
 * 4. Updates the last sync time
 * 
 * @returns Sync result with statistics or null if failed
 */
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

/**
 * Sync Emails with Gmail
 * 
 * This function:
 * 1. Fetches recent emails from Gmail
 * 2. Matches emails to companies/founders by email address
 * 3. Stores matched email threads in the database
 * 4. Updates the last sync time
 * 
 * @returns Sync result with statistics or null if failed
 */
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

/**
 * Create a Calendar Event in Google Calendar
 * 
 * Creates a new event in the user's Google Calendar.
 * Automatically generates a Google Meet link if attendees are added.
 * 
 * @param event - Event details (summary, time, attendees, etc.)
 * @returns Success status and event details including Meet link
 */
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

/**
 * Fetch a Single Company with All Relations
 * 
 * Gets a complete company record including:
 * - Founder information
 * - Tags
 * - Comments/timeline
 * - Calendar events
 * - Email threads
 * - Drive documents
 * 
 * @param companyId - The company's UUID
 * @returns Complete company object or null if not found
 */
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
