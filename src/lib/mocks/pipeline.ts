// Shared mock data for the application

import type { Founder, Tag, Stage } from "@/lib/types"

// Extended Company type with calendar data
export interface Company {
  id: string
  name: string
  description?: string
  website?: string
  founderId: string
  stage: Stage
  tags: string[]
  ownerId: string
  lastTouch: string
  createdAt: string
  updatedAt: string
}

// Calendar meeting data
export interface CalendarMeeting {
  id: string
  companyId: string
  title: string
  date: string
  attendees: string[]
  notes?: string
}

// Comment with timestamp
export interface Comment {
  id: string
  companyId: string
  authorId: string
  content: string
  type: "note" | "update" | "meeting" | "stage_change"
  createdAt: string
}

export const STAGES: Stage[] = ["Inbound", "Qualified", "Diligence", "Committed", "Passed"]

export const STAGE_CLASSES: Record<Stage, string> = {
  Inbound: "stage-inbound",
  Qualified: "stage-qualified",
  Diligence: "stage-diligence",
  Committed: "stage-committed",
  Passed: "stage-passed",
}

export const MOCK_FOUNDERS: Founder[] = [
  {
    id: "f_alex",
    name: "Alex Kim",
    email: "alex@lattice.ai",
    linkedin: "linkedin.com/in/alexkim",
    twitter: "alexkim",
    location: "San Francisco, CA",
    currentRole: "CEO & Co-founder",
    notes: "Strong technical background. Previously at Google Brain.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "f_maria",
    name: "Maria Lopez",
    email: "maria@harborstack.com",
    linkedin: "linkedin.com/in/marialopez",
    location: "Austin, TX",
    currentRole: "CEO & Founder",
    notes: "Ex-AWS, deep DevOps expertise.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "f_john",
    name: "John Chen",
    email: "john@relay.finance",
    linkedin: "linkedin.com/in/johnchen",
    twitter: "johnchen_fin",
    location: "New York, NY",
    currentRole: "CEO & Co-founder",
    notes: "Former Goldman Sachs. Deep fintech expertise.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "f_sara",
    name: "Sara Patel",
    email: "sara@orbit.health",
    linkedin: "linkedin.com/in/sarapatel",
    location: "Boston, MA",
    currentRole: "CEO & Founder",
    notes: "MD/MBA. Previously led digital health at Mass General.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "f_james",
    name: "James Miller",
    email: "james@copperline.io",
    linkedin: "linkedin.com/in/jamesmiller",
    location: "Seattle, WA",
    currentRole: "CEO & Co-founder",
    notes: "Hardware background from Tesla Energy.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

export const MOCK_TAGS: Tag[] = [
  { id: "t_ai", label: "AI/ML" },
  { id: "t_seed", label: "Seed" },
  { id: "t_devtools", label: "Developer Tools" },
  { id: "t_preseed", label: "Pre-Seed" },
  { id: "t_fintech", label: "Fintech" },
  { id: "t_b2b", label: "B2B" },
  { id: "t_healthcare", label: "Healthcare" },
  { id: "t_series_a", label: "Series A" },
  { id: "t_climate", label: "Climate" },
  { id: "t_hw", label: "Hardware" },
]

const NOW = new Date()

export const MOCK_COMPANIES: Company[] = [
  {
    id: "c_lattice",
    name: "Lattice Labs",
    description: "Inference infrastructure for AI-native products. Building the next generation of ML deployment infrastructure that scales automatically with demand.",
    website: "https://lattice.ai",
    founderId: "f_alex",
    stage: "Inbound",
    tags: ["t_ai", "t_seed"],
    ownerId: "u_dylan",
    lastTouch: new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(NOW.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: NOW.toISOString(),
  },
  {
    id: "c_harborstack",
    name: "Harborstack",
    description: "DevOps tooling for shipping faster and safer. Helping engineering teams deploy with confidence through intelligent release management.",
    website: "https://harborstack.com",
    founderId: "f_maria",
    stage: "Qualified",
    tags: ["t_devtools", "t_preseed"],
    ownerId: "u_dylan",
    lastTouch: new Date(NOW.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(NOW.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: NOW.toISOString(),
  },
  {
    id: "c_relay",
    name: "Relay Finance",
    description: "B2B treasury and payments automation. Modern financial infrastructure for high-growth startups managing complex cash flows.",
    website: "https://relay.finance",
    founderId: "f_john",
    stage: "Diligence",
    tags: ["t_fintech", "t_b2b"],
    ownerId: "u_alice",
    lastTouch: NOW.toISOString(),
    createdAt: new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: NOW.toISOString(),
  },
  {
    id: "c_orbit",
    name: "Orbit Health",
    description: "Remote monitoring platform for chronic disease management. Transforming healthcare delivery through continuous patient engagement.",
    website: "https://orbit.health",
    founderId: "f_sara",
    stage: "Committed",
    tags: ["t_healthcare", "t_series_a"],
    ownerId: "u_dylan",
    lastTouch: new Date(NOW.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(NOW.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: NOW.toISOString(),
  },
  {
    id: "c_copperline",
    name: "Copperline",
    description: "Climate hardware for grid resilience. Building infrastructure for a sustainable energy future through advanced battery systems.",
    website: "https://copperline.io",
    founderId: "f_james",
    stage: "Passed",
    tags: ["t_climate", "t_hw"],
    ownerId: "u_alice",
    lastTouch: new Date(NOW.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(NOW.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: NOW.toISOString(),
  },
]

// Mock comments for activity timeline
export const MOCK_COMMENTS: Comment[] = [
  // Lattice Labs
  {
    id: "cmt_1",
    companyId: "c_lattice",
    authorId: "u_dylan",
    content: "Added Lattice Labs to pipeline. Warm intro from Sam at First Round.",
    type: "note",
    createdAt: new Date(NOW.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "cmt_2",
    companyId: "c_lattice",
    authorId: "u_dylan",
    content: "Strong technical background - Alex was previously at Google Brain leading inference optimization. Team has deep ML expertise.",
    type: "note",
    createdAt: new Date(NOW.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "cmt_3",
    companyId: "c_lattice",
    authorId: "u_dylan",
    content: "Initial call went great. They're seeing 3x week-over-week growth. Pricing is usage-based which is smart for this market.",
    type: "meeting",
    createdAt: new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  // Harborstack
  {
    id: "cmt_4",
    companyId: "c_harborstack",
    authorId: "u_dylan",
    content: "Added via portfolio referral. Maria previously built deployment infra at AWS.",
    type: "note",
    createdAt: new Date(NOW.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "cmt_5",
    companyId: "c_harborstack",
    authorId: "u_dylan",
    content: "Moved to Qualified after initial call. Strong traction - 40 enterprise customers.",
    type: "stage_change",
    createdAt: new Date(NOW.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "cmt_6",
    companyId: "c_harborstack",
    authorId: "u_dylan",
    content: "Product demo was impressive. Release management features are differentiated. Need to dig into unit economics.",
    type: "meeting",
    createdAt: new Date(NOW.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  // Relay Finance
  {
    id: "cmt_7",
    companyId: "c_relay",
    authorId: "u_alice",
    content: "John reached out directly. Former Goldman, founded a payments company before (acquired).",
    type: "note",
    createdAt: new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "cmt_8",
    companyId: "c_relay",
    authorId: "u_alice",
    content: "Moved to Diligence. Metrics are strong - $2M ARR, growing 20% MoM.",
    type: "stage_change",
    createdAt: new Date(NOW.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "cmt_9",
    companyId: "c_relay",
    authorId: "u_alice",
    content: "Due diligence call today. All references came back positive. Ready to move forward with term sheet.",
    type: "meeting",
    createdAt: NOW.toISOString(),
  },
  // Orbit Health
  {
    id: "cmt_10",
    companyId: "c_orbit",
    authorId: "u_dylan",
    content: "Sara is an MD/MBA, previously led digital health initiatives at Mass General. Deep domain expertise.",
    type: "note",
    createdAt: new Date(NOW.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "cmt_11",
    companyId: "c_orbit",
    authorId: "u_dylan",
    content: "Committed! Leading Series A with $5M. Patient outcomes data is compelling - 40% reduction in hospital readmissions.",
    type: "stage_change",
    createdAt: new Date(NOW.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
  // Copperline
  {
    id: "cmt_12",
    companyId: "c_copperline",
    authorId: "u_alice",
    content: "James has hardware background from Tesla Energy. Interesting approach to grid-scale storage.",
    type: "note",
    createdAt: new Date(NOW.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "cmt_13",
    companyId: "c_copperline",
    authorId: "u_alice",
    content: "Passed. Hardware capex requirements too high for our fund size. Great team but not a fit.",
    type: "stage_change",
    createdAt: new Date(NOW.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

// Mock calendar meetings - simulating Google Calendar sync
export const MOCK_MEETINGS: CalendarMeeting[] = [
  {
    id: "m1",
    companyId: "c_lattice",
    title: "Intro call with Alex Kim",
    date: new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    attendees: ["Alex Kim", "Dylan"],
    notes: "Great initial conversation. Strong technical background. Discussed go-to-market strategy.",
  },
  {
    id: "m2",
    companyId: "c_harborstack",
    title: "Deep dive: Harborstack product",
    date: new Date(NOW.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    attendees: ["Maria Lopez", "Dylan"],
    notes: "Impressive product demo. Need to review financials. Strong customer testimonials.",
  },
  {
    id: "m3",
    companyId: "c_relay",
    title: "Due diligence: Relay Finance",
    date: NOW.toISOString(),
    attendees: ["John Chen", "Alice", "Dylan"],
    notes: "Strong traction metrics. Moving forward with term sheet discussion.",
  },
  {
    id: "m4",
    companyId: "c_orbit",
    title: "Orbit Health board prep",
    date: new Date(NOW.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    attendees: ["Sara Patel", "Dylan"],
    notes: "Reviewed Q3 metrics. Patient outcomes exceeding benchmarks.",
  },
  {
    id: "m5",
    companyId: "c_lattice",
    title: "Follow-up: Technical deep dive",
    date: new Date(NOW.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    attendees: ["Alex Kim", "Dylan"],
    notes: "Reviewed architecture. Very scalable approach. Team is impressive.",
  },
  {
    id: "m6",
    companyId: "c_harborstack",
    title: "Initial intro call",
    date: new Date(NOW.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    attendees: ["Maria Lopez", "Dylan"],
    notes: "Warm intro from portfolio company. Strong founder-market fit.",
  },
]

// Owner directory
export const OWNERS: Record<
  string,
  {
    name: string
    email: string
    initials: string
  }
> = {
  u_dylan: {
    name: "Dylan",
    email: "dylan@angellead.vc",
    initials: "DM",
  },
  u_alice: {
    name: "Alice",
    email: "alice@angellead.vc",
    initials: "AL",
  },
}

// Helper functions
export function formatRelative(dateIso: string): string {
  const then = new Date(dateIso).getTime()
  const now = Date.now()
  const diffMs = now - then
  const dayMs = 24 * 60 * 60 * 1000

  const days = Math.round(diffMs / dayMs)
  if (days <= 0) return "Today"
  if (days === 1) return "1 day ago"
  if (days < 7) return `${days} days ago`
  const weeks = Math.round(days / 7)
  if (weeks < 4) return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`
  const months = Math.round(days / 30)
  return months === 1 ? "1 month ago" : `${months} months ago`
}

export function formatDate(dateIso: string): string {
  return new Date(dateIso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function formatTime(dateIso: string): string {
  return new Date(dateIso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

export function formatDateTime(dateIso: string): string {
  return new Date(dateIso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

// Get data helpers
export function getFoundersById(): Record<string, Founder> {
  return Object.fromEntries(MOCK_FOUNDERS.map((f) => [f.id, f]))
}

export function getTagsById(): Record<string, Tag> {
  return Object.fromEntries(MOCK_TAGS.map((t) => [t.id, t]))
}

export function getMeetingsByCompany(): Record<string, CalendarMeeting[]> {
  const map: Record<string, CalendarMeeting[]> = {}
  MOCK_MEETINGS.forEach((meeting) => {
    if (!map[meeting.companyId]) {
      map[meeting.companyId] = []
    }
    map[meeting.companyId].push(meeting)
  })
  Object.keys(map).forEach((key) => {
    map[key].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  })
  return map
}

export function getCommentsByCompany(): Record<string, Comment[]> {
  const map: Record<string, Comment[]> = {}
  MOCK_COMMENTS.forEach((comment) => {
    if (!map[comment.companyId]) {
      map[comment.companyId] = []
    }
    map[comment.companyId].push(comment)
  })
  // Sort by date descending (newest first)
  Object.keys(map).forEach((key) => {
    map[key].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  })
  return map
}

export function getCompanyById(id: string) {
  const company = MOCK_COMPANIES.find((c) => c.id === id)
  if (!company) return null
  
  const foundersById = getFoundersById()
  const tagsById = getTagsById()
  const meetingsByCompany = getMeetingsByCompany()
  const commentsByCompany = getCommentsByCompany()
  
  return {
    company,
    founder: foundersById[company.founderId],
    owner: OWNERS[company.ownerId],
    tags: company.tags.map((id) => tagsById[id]).filter(Boolean),
    meetings: meetingsByCompany[company.id] || [],
    comments: commentsByCompany[company.id] || [],
  }
}

// Generate a simple ID
export function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`
}
