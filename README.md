# Angel Lead

A modern VC portfolio management platform for angel investors and venture capitalists. Built with Next.js, Supabase, and AI-powered intelligence.

## 📚 Table of Contents

- [Features](#features)
- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Key Concepts](#key-concepts)
- [Development Guide](#development-guide)

## Features

### 🎯 Pipeline Management
- **Pipeline View**: Track companies across deal stages (Researching, Qualified, Diligence, Negotiation, etc.)
- **Kanban & Table Views**: Switch between visual kanban board and detailed table view
- **Stage Management**: Move deals through the pipeline with drag-and-drop
- **Tags & Filtering**: Organize and filter companies by tags, stage, and search

### 👥 Founder & Company Tracking
- **Company Profiles**: Detailed company pages with founder info, website, stage, and tags
- **Founder Database**: Track founders across multiple companies with background, social links, and notes
- **Activity Timeline**: See meetings, emails, and comments in chronological order
- **Google Drive Integration**: Attach and manage documents directly from Google Drive

### 📰 Discover (AI-Powered News)
- **Curated News Feeds**: Get intelligence on breaking deals, AI frontier, market signals, and more
- **Premium Sources**: Aggregates from The Information, Bloomberg, TechCrunch, and other top-tier publications
- **VC-Focused Topics**: Breaking Deals, AI Frontier, Market Signals, Deep Dives, Founder Intel, and more
- **Recent News**: Focuses on the last 3-5 days for fresh, actionable intelligence
- **Deduplication**: Smart filtering to avoid duplicate stories

### 🤖 Otho (AI Assistant)
- **Portfolio Analysis**: Ask questions about your portfolio companies and founders
- **Context-Aware**: Understands your pipeline, companies, and deal context
- **General Intelligence**: Answers questions about investing, markets, and startups
- **Gemini-Powered**: Built on Google's Gemini AI models

### 📧 Google Integrations
- **Gmail Sync**: Automatically sync email threads with companies and founders
- **Calendar Integration**: See meetings and events directly in company/founder profiles
- **Google Drive**: Attach and manage documents from Google Drive
- **OAuth Authentication**: Secure Google OAuth for all integrations

### 🎨 Modern UI
- **Clean Design**: Professional, minimalist interface optimized for quick scanning
- **Collapsible Sidebar**: Maximize screen real estate when needed
- **Responsive**: Works on desktop and tablet devices
- **Dark Mode Ready**: Built with Tailwind CSS and theme-aware components

## 🏗️ Architecture Overview

Angel Lead follows a modern, full-stack architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (Browser)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   React UI   │  │ Zustand Store│  │ Supabase     │      │
│  │  Components  │◄─┤  (Global     │◄─┤ Client       │      │
│  │              │  │   State)     │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼ API Calls
┌─────────────────────────────────────────────────────────────┐
│                  NEXT.JS SERVER (App Router)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  API Routes  │  │   Server     │  │  Server      │      │
│  │  /api/*      │  │  Components  │  │  Actions     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼ Database Queries
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE (Backend)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PostgreSQL  │  │  Auth        │  │  Storage     │      │
│  │  Database    │  │  (Users)     │  │  (Files)     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼ External APIs
┌─────────────────────────────────────────────────────────────┐
│                  EXTERNAL INTEGRATIONS                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Google      │  │  Gemini AI   │  │  News APIs   │      │
│  │  (Gmail,     │  │  (Analysis)  │  │  (Discover)  │      │
│  │   Calendar)  │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Authentication**: User signs in with Google OAuth → Supabase Auth
2. **Onboarding**: New users complete 6-step onboarding → Stored in users table
3. **Pipeline Management**: User adds companies → API routes → Database
4. **AI Analysis**: Company created → Background job → Gemini AI → Stored
5. **Sync**: User syncs Gmail/Calendar → API routes → Match to companies → Store

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL) with Row Level Security (RLS)
- **Authentication**: Supabase Auth with Google OAuth
- **Security**: Row Level Security (RLS) for automatic data isolation by user
- **AI/ML**: 
  - Google Gemini (for Otho AI assistant and summaries)
  - Exa AI (for news aggregation and search)
- **State Management**: Zustand
- **UI Components**: Radix UI + Tailwind CSS
- **Icons**: Custom SVG icon library
- **API Integrations**: Google Calendar, Gmail, Google Drive APIs

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun
- Supabase account and project
- Google Cloud Project with OAuth credentials
- (Optional) Exa API key for Discover news feature
- (Optional) Gemini API key for Otho AI assistant

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd angellead
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   # Database
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # Authentication
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_nextauth_secret
   
   # Google OAuth
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret

   # AI Services (OpenRouter - Required for AI features)
   OPEN_ROUTER_API=your_openrouter_api_key
   
   # Web Search (Optional - for external enrichment)
   EXA_API_KEY=your_exa_api_key
   
   # Vector Database (Optional - for internal knowledge base)
   PINECONE_API_KEY=your_pinecone_api_key
   PINECONE_INDEX_NAME=your_pinecone_index_name
   ```

4. **Set up Supabase database**
   
   The application uses Supabase for data storage. You'll need to create the following tables:
   - `companies` - Company/startup records
   - `founders` - Founder profiles
   - `comments` - Activity comments/notes
   - `tags` - Tag system for organizing companies
   - See `src/lib/supabase/types.ts` for the full schema

5. **Run the development server**
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (pages)/           # Main application pages
│   │   ├── page.tsx       # Dashboard/Home
│   │   ├── pipeline/      # Pipeline management
│   │   ├── discover/      # News feed
│   │   ├── otho/          # AI assistant
│   │   ├── founders/      # Founder list
│   │   └── company/       # Company detail pages
│   └── api/               # API routes
│       ├── (entities)/    # Companies, founders, comments, tags
│       ├── (google)/      # Calendar, Gmail, Drive integrations
│       ├── (ai)/          # AI endpoints (summarize, chat)
│       └── (content)/     # News, feeds, tickers
├── components/
│   ├── pipeline/          # Pipeline-specific components
│   ├── shared/            # Reusable components
│   ├── ui/                # Base UI components (shadcn)
│   └── icons/             # Centralized icon library
└── lib/
    ├── supabase/          # Supabase client and types
    ├── integrations/      # Google API integrations
    ├── hooks/             # Custom React hooks
    ├── utils/             # Utility functions (date, URL, etc.)
    ├── store.ts           # Zustand state management
    ├── auth.ts            # NextAuth configuration
    └── exa.ts             # Exa API configuration
```

## Key Features Deep Dive

### Pipeline Stages
- **Researching**: Initial discovery phase
- **Qualified**: Vetted and interested
- **Diligence**: Deep dive and analysis
- **Negotiation**: Term sheet discussions
- **Committed**: Deal agreed, closing
- **Invested**: Active portfolio company
- **Passed**: Not pursuing

### Code Organization
- **Modular Components**: Reusable shared components (MeetingList, EmailList, CommentTimeline, etc.)
- **Utility Functions**: Organized by domain (date, URL, general)
- **Type Safety**: Full TypeScript with generated Supabase types
- **API Route Groups**: Organized using Next.js route groups `(entities)`, `(google)`, `(ai)`, `(content)`

## 📁 Project Structure

```
angellead/
├── src/
│   ├── app/                      # Next.js App Router pages
│   │   ├── (auth)/              # Auth pages (sign-in, sign-up)
│   │   ├── api/                 # API routes
│   │   │   ├── (entities)/     # CRUD for companies, founders, etc.
│   │   │   ├── (ai)/           # AI endpoints (chat, analyze, etc.)
│   │   │   ├── (content)/      # News, feeds, searches
│   │   │   └── (google)/       # Google integrations
│   │   ├── company/[id]/       # Company detail page
│   │   ├── founder/[id]/       # Founder detail page
│   │   ├── pipeline/           # Main pipeline view
│   │   ├── discover/           # News discovery feed
│   │   ├── otho/               # AI assistant chat
│   │   ├── onboarding/         # User onboarding flow
│   │   └── settings/           # User settings
│   │
│   ├── components/              # React components
│   │   ├── ui/                 # Base UI components (shadcn/ui)
│   │   ├── pipeline/           # Pipeline-specific components
│   │   ├── shared/             # Shared components
│   │   └── otho/               # AI assistant components
│   │
│   ├── lib/                     # Core library code
│   │   ├── supabase/           # Supabase client & types
│   │   ├── integrations/       # External API integrations
│   │   ├── actions/            # Server actions
│   │   ├── hooks/              # React hooks
│   │   ├── types/              # TypeScript types
│   │   ├── utils/              # Utility functions
│   │   ├── store.ts            # Zustand global store
│   │   ├── constants.ts        # App constants
│   │   └── tiers.ts            # Pricing tier logic
│   │
│   └── middleware.ts            # Next.js middleware (auth)
│
├── supabase/
│   └── migrations/              # Database migrations
│       ├── 001_add_onboarding_columns.sql
│       ├── 002_add_settings_tables.sql
│       ├── 003_create_avatars_storage.sql
│       ├── 004_add_ai_permissions.sql
│       └── 005_sync_auth_users.sql
│
└── public/                      # Static assets
```

## 🔑 Key Concepts

### 1. Authentication & User Management

- **Supabase Auth**: Handles user authentication with Google OAuth
- **User Sync**: Database trigger automatically creates `public.users` record when user signs up in `auth.users`
- **Onboarding**: New users complete 6-step onboarding to personalize their experience
- **OnboardingGate**: Client-side component that redirects incomplete users to onboarding

### 2. Pipeline Stages

Companies move through these stages:
1. **Inbound** - Initial contact/application
2. **Qualified** - Passed initial screening
3. **Diligence** - Deep dive analysis
4. **Committed** - Deal closed
5. **Passed** - Decided not to invest

### 3. Data Model

**Core Entities:**
- `companies` - Portfolio companies with stage, description, website
- `founders` - People who run companies
- `users` - App users (investors)
- `tags` - Categories for companies (e.g., "SaaS", "AI")
- `comments` - Timeline events (notes, meetings, stage changes)

**Relations:**
- Company → Founder (many-to-one)
- Company → User (owner, many-to-one)
- Company → Tags (many-to-many via `company_tags`)
- Company → Comments (one-to-many)

### 4. State Management

- **Zustand Store** (`src/lib/store.ts`): Global state for companies, founders, tags
- **Server State**: Supabase handles database state
- **UI State**: Component-level state with React hooks

### 5. AI Features

- **Otho Chat**: AI assistant powered by Gemini, context-aware of user's pipeline
- **Company Analysis**: Auto-generated analysis when company is created
- **News Discovery**: AI-curated news feed with Exa API

### 6. Google Integrations

- **Gmail Sync**: Matches emails to companies/founders by email address
- **Calendar Sync**: Matches calendar events to companies/founders
- **Drive Picker**: Attach documents to companies

### 7. Tier System

- **Hobby**: Free tier, 25 contacts max
- **Pro**: Paid tier, unlimited contacts
- Enforced in API routes with `canCreateContact()` check

### 8. Security & Row Level Security (RLS)

- **Database-Level Security**: Row Level Security (RLS) automatically filters all queries by user ownership
- **Automatic Filtering**: Users can only see/modify their own companies, comments, and related data
- **No Manual Checks Needed**: API routes don't need to manually filter by `owner_id` - RLS handles it
- **Migration**: See `supabase/migrations/006_add_rls_policies.sql` for RLS policies
- **Tier Limits**: Still enforced in API routes (business logic, not security)

## Development

### Running the development server
```bash
npm run dev
```

### Building for production
```bash
npm run build
npm start
```

### Linting
```bash
npm run lint
```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side only) |
| `NEXTAUTH_URL` | Yes | Application URL (http://localhost:3000 for dev) |
| `NEXTAUTH_SECRET` | Yes | Secret for NextAuth.js session encryption |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `OPEN_ROUTER_API` | Optional | OpenRouter API key for Otho AI (tiered models) |
| `EXA_API_KEY` | Optional | Exa AI API key for web search & news feed |
| `PINECONE_API_KEY` | Optional | Pinecone API key for vector database |
| `PINECONE_INDEX_NAME` | Optional | Pinecone index name (default: default-index) |

## License

Private - All Rights Reserved
