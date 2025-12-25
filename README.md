# Angel Lead

A modern VC portfolio management platform for angel investors and venture capitalists. Built with Next.js, Supabase, and AI-powered intelligence.

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

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: NextAuth.js with Google OAuth
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

   # AI Services (Optional)
   GEMINI_API_KEY=your_gemini_api_key
   GEMINI_MODEL=gemini-2.0-flash-exp
   EXA_API_KEY=your_exa_api_key
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
| `GEMINI_API_KEY` | Optional | Google Gemini API key for Otho AI |
| `GEMINI_MODEL` | Optional | Gemini model name (default: gemini-2.0-flash-exp) |
| `EXA_API_KEY` | Optional | Exa AI API key for Discover news feed |

## License

Private - All Rights Reserved
