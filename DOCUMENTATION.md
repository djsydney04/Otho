# Angel Lead Documentation

This document provides a comprehensive overview of the Otho codebase architecture, patterns, and best practices.

## 📖 Quick Start for Developers

If you're new to this codebase, start here:

1. **Read the [README.md](README.md)** - Overview of features and setup
2. **Review [Architecture Overview](#architecture-overview)** - Understand the system design
3. **Check [Key Files](#key-files)** - Know where to find things
4. **Follow [Development Workflow](#development-workflow)** - How to make changes

## 🏗️ Architecture Overview

### System Design

Angel Lead is a full-stack Next.js application with the following layers:

```
┌─────────────────────────────────────────────────────────────┐
│ CLIENT LAYER (Browser)                                       │
│ - React Components (UI)                                      │
│ - Zustand Store (Global State)                              │
│ - Supabase Client (Auth & Realtime)                         │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTP/WebSocket
┌─────────────────────────────────────────────────────────────┐
│ SERVER LAYER (Next.js)                                       │
│ - API Routes (/api/*)                                        │
│ - Server Components                                          │
│ - Server Actions                                             │
│ - Middleware (Auth)                                          │
└─────────────────────────────────────────────────────────────┘
                            ↓ SQL Queries
┌─────────────────────────────────────────────────────────────┐
│ DATABASE LAYER (Supabase)                                    │
│ - PostgreSQL Database                                        │
│ - Auth (User Management)                                     │
│ - Storage (File Uploads)                                     │
│ - Row Level Security (RLS)                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓ API Calls
┌─────────────────────────────────────────────────────────────┐
│ EXTERNAL SERVICES                                            │
│ - Google (Gmail, Calendar, Drive)                           │
│ - Gemini AI (Analysis & Chat)                               │
│ - Exa API (News Discovery)                                  │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow Examples

#### 1. User Authentication Flow
```
User clicks "Sign in with Google"
  → Supabase Auth redirects to Google OAuth
  → Google returns auth code
  → /auth/callback exchanges code for session
  → Database trigger creates public.users record
  → OnboardingGate checks onboarding_status
  → Redirect to /onboarding or /pipeline
```

#### 2. Adding a Company Flow
```
User fills out "Add Company" form
  → POST /api/companies
  → Check tier limits (25 contacts for Hobby)
  → Find or create founder by email
  → Insert company with owner_id = current user
  → Link tags via company_tags table
  → Add creation comment to timeline
  → Trigger AI analysis in background (non-blocking)
  → Return company object
  → Store refreshes companies list
  → Redirect to company detail page
```

#### 3. AI Chat Flow
```
User types message in Otho chat
  → POST /api/chat/groq
  → Fetch user's companies and founders for context
  → Build prompt with user data + message
  → Call Gemini API with context
  → Stream response back to client
  → Store message in chat_conversations table
```

## 📁 Key Files

### Core Application Files

| File | Purpose | Key Exports |
|------|---------|-------------|
| `src/lib/store.ts` | Global state management | `useAppStore`, `syncCalendar`, `syncEmails` |
| `src/lib/supabase/auth-server.ts` | Server-side auth helpers | `getCurrentUser`, `getOrCreateUser` |
| `src/lib/supabase/types.ts` | Database types (generated) | `Company`, `Founder`, `User`, etc. |
| `src/lib/constants.ts` | App constants | `STAGES`, `STAGE_CLASSES` |
| `src/lib/tiers.ts` | Pricing tier logic | `canCreateContact`, `TIER_LIMITS` |
| `src/middleware.ts` | Auth middleware | Protects routes, checks auth |

### Key API Routes

| Route | Purpose | Methods |
|-------|---------|---------|
| `/api/companies` | Company CRUD | GET, POST |
| `/api/companies/[id]` | Single company | GET, PATCH, DELETE |
| `/api/founders` | Founder CRUD | GET, POST |
| `/api/comments` | Add comments | POST |
| `/api/chat/groq` | AI chat | POST (streaming) |
| `/api/calendar/sync` | Sync Google Calendar | POST |
| `/api/gmail/sync` | Sync Gmail | POST |
| `/api/news` | Get news feed | GET |

### Key Components

| Component | Purpose | Location |
|-----------|---------|----------|
| `OnboardingGate` | Redirect incomplete users | `src/components/onboarding-gate.tsx` |
| `Sidebar` | Main navigation | `src/components/pipeline/sidebar.tsx` |
| `PipelineKanban` | Kanban board view | `src/components/pipeline/pipeline-kanban.tsx` |
| `PipelineTable` | Table view | `src/components/pipeline/pipeline-table.tsx` |
| `CommentTimeline` | Activity timeline | `src/components/shared/comment-timeline.tsx` |

## 🔑 Key Concepts

### 1. User Lifecycle

```
Sign Up → Onboarding (6 steps) → Pipeline Access
```

**Onboarding Steps:**
1. Role (Angel Investor, VC, etc.)
2. Primary Goals (Track deals, Source companies, etc.)
3. Stage Focus (Seed, Series A, etc.)
4. Sector Focus (AI, SaaS, Fintech, etc.)
5. AI Help Focus (Research, Due diligence, etc.)
6. AI Tone (Concise, Analytical, Deep-dive)

**Why Onboarding?**
- Personalizes AI assistant responses
- Filters relevant content in Discover feed
- Provides better deal recommendations

### 2. Pipeline Management

**Stages:**
- **Inbound**: Initial contact/application
- **Qualified**: Passed initial screening
- **Diligence**: Deep dive analysis
- **Committed**: Deal closed
- **Passed**: Decided not to invest

**Stage Changes:**
- Automatically create a "stage_change" comment
- Update company.stage field
- Reflected in kanban and table views

### 3. Founder-Company Relationship

**Three Scenarios:**
1. **Existing Founder**: Link by founder_id
2. **New Founder**: Provide name + email, auto-create
3. **No Founder**: Company can exist without founder

**Deduplication:**
- Founders are deduplicated by email
- If email exists, link to existing founder
- Prevents duplicate founder records

### 4. AI Features

**Otho (AI Assistant):**
- Powered by Google Gemini
- Context-aware of user's pipeline
- Can answer questions about companies, founders, deals
- Streaming responses for better UX

**Company Analysis:**
- Auto-generated when company is created
- Runs in background (non-blocking)
- Includes market opportunity, team, product, competitive landscape
- Stored in company.ai_analysis field

**News Discovery:**
- Powered by Exa AI
- Curated topics: Breaking Deals, AI Frontier, Market Signals, etc.
- Focuses on last 3-5 days for freshness
- Deduplicates similar stories

### 5. Google Integrations

**Gmail Sync:**
- Fetches recent emails from Gmail API
- Matches emails to companies/founders by email address
- Stores in email_threads table
- Displays in company timeline

**Calendar Sync:**
- Fetches recent events from Google Calendar
- Matches events to companies/founders by attendee email
- Stores in calendar_events table
- Displays in company timeline

**Drive Picker:**
- Uses Google Picker API
- Attaches documents to companies
- Stores metadata in drive_documents table

### 6. Security Model

**Row Level Security (RLS):**
- All tables have RLS policies enabled (see `supabase/migrations/006_add_rls_policies.sql`)
- Users can only see/modify their own data
- Enforced at database level (can't be bypassed by API bugs)
- Automatic filtering: No need to add `.eq("owner_id", user.id)` in queries
- Policies use `auth.uid()` to match against `owner_id` column
- Related tables (comments, calendar_events, etc.) check ownership via company relationship

**How RLS Works:**
```sql
-- Example RLS policy for companies table
CREATE POLICY "Users can view own companies" ON companies
  FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);
```

**Benefits:**
- ✅ Security by default - can't forget ownership checks
- ✅ Database-level enforcement - most secure
- ✅ Cleaner API code - less boilerplate
- ✅ Consistent - all queries automatically filtered

**Tier Enforcement:**
- Hobby: 25 contacts max (companies + founders)
- Pro: Unlimited contacts
- Checked in API routes before creating entities (business logic, not security)
- Returns 403 with upgrade prompt if limit reached

## 🛠️ Development Workflow

### Adding a New Feature

1. **Database Changes**
   - Create migration in `supabase/migrations/`
   - **Add RLS policies** if creating new tables (see `006_add_rls_policies.sql` for examples)
   - Run migration: `supabase db push`
   - Regenerate types: `supabase gen types typescript`

2. **API Route**
   - Create route in `src/app/api/`
   - Add authentication check (if needed)
   - **RLS handles ownership filtering automatically** - no need to add `.eq("owner_id", user.id)`
   - Add tier enforcement if needed (business logic)
   - Add JSDoc comments

3. **Store Integration**
   - Add action to `src/lib/store.ts`
   - Add loading/error states
   - Add JSDoc comments

4. **UI Component**
   - Create component in `src/components/`
   - Use store hook to fetch data
   - Add loading and error states
   - Add JSDoc comments

5. **Testing**
   - Test happy path
   - Test error cases
   - Test tier limits
   - Test authentication

### Code Style Guidelines

**TypeScript:**
- Use strict mode
- Prefer interfaces over types for objects
- Use type inference where possible
- Add JSDoc comments for public APIs

**React:**
- Use functional components
- Use hooks (useState, useEffect, etc.)
- Prefer server components when possible
- Use client components only when needed

**Comments:**
- Add JSDoc comments for functions
- Explain "why" not "what"
- Document complex logic
- Add examples for public APIs

**File Organization:**
- Group related files in folders
- Use index.ts for barrel exports
- Keep files under 500 lines
- Split large components

## 🐛 Common Issues & Solutions

### Issue: User not found in database
**Cause:** Database trigger didn't fire or failed
**Solution:** Call `getOrCreateUser()` as fallback

### Issue: Onboarding loop (stuck on /onboarding)
**Cause:** onboarding_status not set to "complete"
**Solution:** Check `completeOnboarding()` function, ensure it updates status

### Issue: Companies not showing up
**Cause:** RLS policy blocking access or owner_id mismatch
**Solution:** Check owner_id matches authenticated user

### Issue: Tier limit not enforced
**Cause:** Missing `canCreateContact()` check in API route
**Solution:** Add tier check before creating entities

### Issue: AI features not working
**Cause:** Missing API keys or incorrect configuration
**Solution:** Check GEMINI_API_KEY and EXA_API_KEY in .env.local

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Radix UI Documentation](https://www.radix-ui.com/docs/primitives)

## 🤝 Contributing

When contributing to this codebase:

1. **Read this documentation first**
2. **Follow the code style guidelines**
3. **Add comments and documentation**
4. **Test your changes thoroughly**
5. **Update this documentation if needed**

## 📝 Changelog

### Recent Improvements (Dec 2024)

- ✅ Added comprehensive JSDoc comments to store.ts
- ✅ Documented auth flow in auth-server.ts
- ✅ Added API route documentation
- ✅ Enhanced README with architecture overview
- ✅ Created this DOCUMENTATION.md file
- ✅ Improved onboarding flow (reduced from 18 to 6 steps)
- ✅ Fixed user sync with database trigger
- ✅ Added auto-refresh for founders list

---

**Last Updated:** December 26, 2024
**Maintainer:** Angel Lead Team

