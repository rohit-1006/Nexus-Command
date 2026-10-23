# Nexus Command

AI-native solo enterprise operating system. Built with Next.js 15 App Router, TypeScript, Tailwind v4, Prisma/SQLite, Recharts, D3, Framer Motion, Zustand, and Zod.

## Overview

Nexus Command is a command center for solo operators managing an AI-powered enterprise. It includes 13 modules, 6 simulated agents with deterministic "intelligence," an event bus with live SSE updates, and a 5-theme design system.

## Stack

- **Framework**: Next.js 15 (App Router, React 19, TypeScript strict)
- **Database**: Prisma + SQLite (seeded demo data)
- **Styling**: Tailwind CSS v4 (CSS variables, `@theme inline` tokens)
- **Charts**: Recharts + D3 force-directed graph
- **State**: Zustand (UI store) + local React state
- **Validation**: Zod schemas (shared client/server)
- **Testing**: Vitest (71 tests: schemas, utils, event bus, agents, repos, API)

## Quick Start

```bash
# Install dependencies (includes prisma generate)
npm install

# Push schema to SQLite (dev.db)
npm run db:push

# Seed demo data
npm run seed

# Start dev server
npm run dev
```

Open http://localhost:3000 — you'll see the Nerve Center with live event feed and agent status.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server with Turbopack |
| `npm run build` | Production build (all routes dynamic) |
| `npm run start` | Start production server |
| `npm run lint` | ESLint (flat config, 0 errors) |
| `npm run typecheck` | TypeScript `tsc --noEmit` (strict) |
| `npm run test` | Vitest unit/integration tests |
| `npm run test:watch` | Vitest watch mode |
| `npm run seed` | Seed demo data (idempotent) |
| `npm run db:push` | Push Prisma schema to dev.db |
| `npm run db:reset` | Force reset dev.db + push |

## Project Structure

```
app/
  (dashboard)/           # All 13 module pages (force-dynamic)
    page.tsx            # Nerve Center
    analytics/          # Event heatmap, KPIs
    comms/              # Inbox panel, thread view
    finances/           # P&L, cashflow, runway
    integrations/       # Connector rows, status
    knowledge/          # Brain dump, graph, query
    revenue/            # Deal funnel, stage board
    social/             # Posts, metrics, calendar
    strategy/           # OKRs, decisions
    tasks/              # Kanban board
    workflows/          # Run buttons, history
    agents/             # Crew grid, chat
    clients/            # Contact intelligence
    settings/           # Theme, palette, panels
  api/                   # 20 API routes (REST + SSE)
  globals.css            # Tailwind v4 + 5 themes
  layout.tsx             # Root layout (fonts, theme boot script)

components/
  ui/                    # Primitives (button, card, dialog, etc.)
  layout/                # Sidebar, TopBar, CommandPalette, etc.
  charts/                # Area, Bar, Donut, Sparkline
  graphs/                # KnowledgeGraph (D3)
  nerve/                 # LiveFeed, AgentStrip
  comms/                 # InboxPanel
  tasks/                 # TaskBoard
  workflows/             # RunButton
  analytics/             # EventHeatmap
  settings/              # Panels
  page-header.tsx, stat.tsx

lib/
  agents/                # 6 agent definitions + runtime + registry
  events/                # EventBus (persist + SSE)
  repositories/          # 12 typed repositories (CRUD + aggregates)
  schemas/               # Zod schemas (shared)
  utils.ts               # fmtMoney, timeAgo, cn, rng, etc.
  db.ts                  # Prisma singleton
  connectors/            # External service stubs

hooks/
  use-theme.ts           # Theme + colors + clock
  use-events.ts          # SSE event stream

stores/
  ui.ts                  # Zustand store (theme, sidebar, notifications, etc.)

prisma/
  schema.prisma          # 26 models
  seed/                  # Split seed (constants, finance, misc)

tests/                   # Vitest suite (71 passing)
```

## Modules (13)

1. **Nerve Center** (`/`) — Live event feed, agent strip, KPIs, funnels
2. **Comms** (`/comms`) — Inbox, threads, dictation, reply drafts
3. **Revenue** (`/revenue`) — Deal funnel, stage board, velocity
4. **Social** (`/social`) — Posts, calendar, metrics, heatmap
5. **Finances** (`/finances`) — P&L, cashflow, runway, invoices
6. **Agents** (`/agents`) — Crew grid, chat, run triggers
7. **Knowledge** (`/knowledge`) — Brain dump, graph, semantic query
8. **Tasks** (`/tasks`) — Kanban board, dependencies
9. **Workflows** (`/workflows`) — Definitions, runs, templates
10. **Integrations** (`/integrations`) — Connectors, webhooks
11. **Analytics** (`/analytics`) — Event heatmap, trends
12. **Strategy** (`/strategy`) — OKRs, decisions, forecasts
13. **Clients** (`/clients`) — Contact intelligence, health

All pages are `export const dynamic = "force-dynamic"` so `next build` never hits the database.

## Agents (6)

| Agent | Dept | Role |
|-------|------|------|
| **Conductor** | OPERATIONS | Chief of staff — briefings, triage, delegation |
| **Mercury** | COMMS | Inbox triage, thread summaries, reply drafts |
| **Atlas** | REVENUE | Pipeline health, stage progression, forecasts |
| **Muse** | SOCIAL | Content calendar, caption variations, scheduling |
| **Ledger** | FINANCE | Categorization, P&L, runway, tax estimates |
| **Cortex** | KNOWLEDGE | Brain dump structuring, graph building, semantic query |

All agents run deterministic logic (no LLM keys required). Each has `run()` and `respond(message)` methods.

## Theming

5 built-in themes via CSS variables in `app/globals.css`:
- **Obsidian** (dark slate)
- **Arctic** (light cool)
- **Ember** (warm dark)
- **Forest** (green dark)
- **Ultraviolet** (purple dark)

Theme persists in `localStorage` and applies via `data-theme` on `<html>`. Use the palette switcher in TopBar (Cmd+K).

## Event Bus + SSE

`lib/events/bus.ts` — typed domain event bus:
- Persists every event to DB (single source of truth)
- Broadcasts live to SSE subscribers (`/api/events/stream`)
- Ring buffer of last 250 events for instant replay
- Subscribe/unsubscribe pattern for React components

## Testing

```bash
npm run test          # 71 tests (schemas, utils, event bus, agents, repos, API)
npm run test:watch    # Watch mode
```

Test DB: `prisma/test.db` (created fresh per run via globalSetup).

## API Routes (20)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/events` | GET | Recent events |
| `/api/events/stream` | GET | SSE live stream |
| `/api/search` | GET | Global search |
| `/api/notifications` | GET | Notifications list |
| `/api/conductor/briefing` | GET | Daily briefing |
| `/api/conductor/chat` | POST | Conductor chat |
| `/api/agents/[slug]/run` | POST | Trigger agent run |
| `/api/agents/[slug]/chat` | POST | Agent chat |
| `/api/agents/broadcast` | POST | Broadcast to all agents |
| `/api/comms/reply` | POST | Send reply |
| `/api/revenue/deals/[id]/stage` | PATCH | Change deal stage |
| `/api/social/post` | POST | Create social post |
| `/api/finances/statements` | GET | P&L / balance / cashflow |
| `/api/knowledge/brain-dump` | POST | Capture brain dump |
| `/api/knowledge/query` | POST | Semantic query |
| `/api/tasks` | POST/PATCH | Create / move tasks |
| `/api/workflows/[id]/run` | POST | Run workflow |
| `/api/integrations/[id]/connect` | POST | Connect integration |
| `/api/admin/reseed` | POST | Reseed database |

## Key Design Decisions

- **No external LLM keys** — agents use deterministic "simulated intelligence" for reproducible demos
- **Seed-first** — `npm run seed` populates 25 contacts, 15 deals, 64 comms, 123 txns, 319 events, 6 agents, 8 social accounts, 40 knowledge nodes, 3 workflows
- **Dynamic pages only** — no static generation hits DB at build time
- **Flat ESLint config** — custom config with `@eslint/js`, `@typescript-eslint`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `@next/eslint-plugin-next`
- **TypeScript strict** — `tsc --noEmit` passes cleanly
- **Prisma models match TypeScript** — `Okr` model, `Event` delegate, `ChannelType` uppercase enums

## Verification Checklist

Before committing, run:
```bash
npm run lint       # 0 errors
npm run typecheck  # EXIT 0
npm run test       # 71 passed
npm run build      # Clean compile
npm run seed       # Idempotent
```

## License

MIT — use as a starter for your own AI-native command center.