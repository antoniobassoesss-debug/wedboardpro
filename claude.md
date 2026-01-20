# WedBoardPro - Wedding Planner Operating System

## Product Context
**What**: B2B SaaS centralizing all wedding planner workflows into one platform
**Who**: Professional wedding planners (NOT couples) managing multiple weddings simultaneously
**Goal**: Replace spreadsheets and fragmented tools with a single "operating system" for their business

## Tech Stack
- Frontend: React/Next.js + TypeScript (strict mode)
- Backend: Supabase (auth, database, storage, real-time)
- Payments: Stripe (subscriptions + invoicing)
- Email: Resend SMTP via wedboardpro.com
- Styling: Tailwind CSS + shadcn/ui components
- APIs: Google Calendar, Maps/Places, PDF generation

## Core Principle
**Why**: We're building enterprise-grade software for professionals, not a wedding couple app. Every feature must feel like Linear/Notion/Stripe Dashboard quality - polished, fast, intuitive. Wedding planners juggle 10-20 weddings at once; chaos is their enemy, clarity is our product.

## Architecture Rules

### Data Model Standards
- All tables: `id` (UUID), `created_at`, `updated_at`, `deleted_at` (soft deletes only)
- Never hard delete user data - planners need audit trails
- Foreign keys: `wedding_id`, `planner_id`, `vendor_id` (consistent naming)
- Timestamps in ISO 8601, timezone-aware (planners work across US timezones)
- Money values stored as integers (cents) to avoid float errors

### Code Organization
**Why**: Solo developer building fast - avoid technical debt or refactoring hell later.

- One module per conversation (don't mix CRM changes with Budget features)
- Components under 200 lines - split logically if larger
- Colocate: if code is used together, keep files together
- Server components default, client only for interactivity
- API routes: `/api/v1/[module]/[action]` (e.g., `/api/v1/weddings/create`)

### TypeScript Standards
**Why**: Production bugs from type errors waste planner trust and my time.

- Strict mode always on
- No `any` unless unavoidable (add comment explaining why)
- Prefer interfaces for data shapes, types for unions/utilities
- Props interfaces named `[Component]Props`
- Zod schemas for all API inputs/outputs

## Module-Specific Logic

### Project Pipeline
- Stages: Vision → Venue → Design → Logistics → Wedding Day → Post-Wedding
- Each stage has structured tasks (not freeform chaos)
- Tasks link to: files, vendors, budgets, timelines
- Status tracking visible at-a-glance (color-coded, progress bars)

### Dashboard (Home)
**Why**: Planners need to see their entire business in 10 seconds - no clicking around.

- Summary cards: active weddings, overdue tasks, unpaid invoices, upcoming events
- Real-time updates via Supabase subscriptions
- Drill-down to any module from summary cards
- Performance critical: must load under 2 seconds

### CRM for Planners
- Lead stages: New Lead → Meeting → Proposal Sent → Contract Signed → Active Client
- NOT a generic CRM - tailored to wedding planner sales flow
- Track: lead source, wedding date, estimated budget, probability
- Auto-convert to wedding project when contract signed

### Guests & Seating
- Manage: RSVP status, dietary restrictions, +1s, groups (family/friends tables)
- Seating planner with drag-and-drop (must be 60fps smooth)
- Export: guest lists, seating charts, place cards
- Import from CSV/Excel (planners often start in spreadsheets)

### Vendors & Venues
- Store: contact info, services, pricing, contracts, payment schedules
- Link vendors to specific weddings and budget line items
- Google Maps integration for venue addresses/directions
- Track commission rates for photographer partnerships (30% standard)

### Budgets & Payments
**Why**: Money management is why planners lose sleep - make this bulletproof.

- Categories: venue, catering, flowers, photography, etc. (customizable)
- Track: estimated → quoted → contracted → paid (with dates)
- Alerts for: overbudget categories, upcoming payment deadlines, unpaid invoices
- Stripe integration for planner subscription + future client payment processing
- Display all money in planner's preferred currency (default EUR, support USD)

### Layout Maker + AI
- Drag-and-drop floorplan editor (tables, dance floor, bar, stage, etc.)
- Snap-to-grid and alignment guides (feels professional)
- AI assistant helps: suggest layouts, adjust spacing, optimize traffic flow
- Export to PDF for venue/vendor sharing
- Future: expand AI to app-wide assistant (knows planner's data, suggests daily tasks)

## UI/UX Standards
**Why**: Planners expect polished tools - they're running businesses, not hobbyists.

- Consistent design system across all modules (colors, spacing, typography)
- Loading states for everything (skeleton screens, not spinners)
- Optimistic UI updates (feel instant, sync in background)
- Error messages helpful: "This email is already in use" not "Unique constraint error"
- Empty states guide action: "Add your first wedding" with prominent CTA
- Toast notifications for confirmations, inline for validation errors
- Mobile-responsive (planners check on phones at venues)

## Performance Requirements
**Why**: Planners manage hundreds of guests, dozens of vendors, complex budgets - app must stay fast.

- Dashboard loads under 2 seconds (cache aggressively)
- Drag-and-drop 60fps (debounce, virtualize long lists)
- Database queries use indexes - `EXPLAIN ANALYZE` complex queries
- Images lazy-load, optimize with Next.js Image
- Bundle size under 300KB initial load (code-split by module)

## Authentication & Security
- Email/password + Google OAuth via Supabase
- Email confirmation required before first login
- Password reset: secure tokens, 1-hour expiry
- Supabase RLS on all tables (planners see only their data)
- Rate limit public endpoints (prevent abuse)
- Never log: passwords, tokens, credit card details
- Environment variables for secrets - never commit `.env`

## Integration Standards

### External APIs
- Google Calendar: sync wedding dates, task deadlines, vendor meetings
- Google Maps/Places: venue addresses, directions, vendor locations
- PDF generation: proposals, timelines, seating charts, contracts
- Email API (Resend): transactional emails, client communications, reminders
- All API calls: timeout after 10s, graceful degradation if service down

### Stripe Integration
- Subscription plans: Basic (€29), Pro (€50), Enterprise (€100+)
- Handle: upgrades, downgrades, cancellations, failed payments
- Webhook handlers for all subscription events
- Invoice generation for planner billing
- Future: process client payments (planner collects deposits/final payments)

## Database Patterns
- Supabase RLS enforces data isolation between planners
- Use transactions for multi-step operations (e.g., create wedding + default tasks)
- Parameterized queries only - never string concatenation
- Batch operations avoid N+1 (e.g., fetch all vendors for wedding in one query)
- Migrations in version control - never manual schema changes

## AI Assistant Persona
**Why**: Planners are stressed, overwhelmed - AI should feel like a calm, organized partner.

- Tone: professional, warm, never condescending
- Understands wedding planner workflow (not generic assistant)
- Suggests based on real data: "You have 3 overdue tasks for the Johnson wedding"
- Explains features contextually: "Budget alerts help you catch overspending early"
- Grows from Layout Maker to app-wide assistant over time

## What NOT To Do
- Don't add features I didn't request - stick to the plan
- Don't create multiple files when one is sufficient
- Don't use generic SaaS patterns - this is wedding-specific
- Don't build for couples - every feature serves the planner's business
- Don't add libraries without asking - prefer native/existing solutions
- Don't comment what code does - only comment WHY (code should be self-documenting)

## Testing Strategy
**Why**: Solo dev, can't afford bugs in production - test what matters.

- Critical paths: auth, payments, data mutations (weddings, budgets)
- Integration tests over unit tests (test real user flows)
- Test with realistic data (multiple weddings, 200+ guests, complex budgets)
- No tests for simple UI components unless complex logic
- Stripe webhooks tested in dev with Stripe CLI

## Go-to-Market Context
**Why**: Build with customer acquisition in mind - some features support sales.

- Target: US wedding planners (50K email list for cold outreach)
- Pricing: €29-€100+/month, average €50 (billing from Portugal)
- Acquisition: cold email, LinkedIn, photographer partnerships (30% commission)
- Future Portuguese market: formal but accessible translations
- Onboarding must be self-service (no hand-holding at scale)

## Common Patterns
[This section grows as you work - press # to auto-add]

## Development Workflow
- Timeline: 6-10 weeks to launch
- Sessions: 10-12 hours daily
- One feature/module per conversation (avoid context pollution)
- Use external memory files: `SCRATCHPAD.md`, `plan.md` for complex features
- Review all generated code - AI speeds up, doesn't replace judgment