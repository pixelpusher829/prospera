# Prospera

A personal finance dashboard: accounts, transactions, budgets, savings goals and clients in one place, with live analytics and an optional AI advisor.

Visitors land straight in their own **guest workspace preloaded with sample data**, so they can try everything without signing up. If they create an account, the guest workspace (including any edits) moves into it.

## Features

- **Dashboard**: net worth, month-to-date spending compared with the same point last month, budget remaining, next goal, recent activity and alerts.
- **Transactions**: add, edit and delete; search, filter and sort; bulk categorise, mark cleared and delete with undo. CSV import maps your bank's columns and previews each row. CSV export is safe from spreadsheet formula injection.
- **Wallet**: checking, savings, cash, credit cards, investments and loans. Balances follow linked transactions, and only the last four digits of a card or account number are stored.
- **Budget**: monthly limits per category. Spending is tracked from transactions automatically, and limits can be suggested from last month's spending.
- **Goals**: target amount and date, the monthly amount needed to get there, and add/withdraw money.
- **Clients**: a simple CRM with status, revenue, notes and CSV export.
- **Analytics**: net worth over time, spending by category, and income vs spending. The AI advisor (Gemini) only ever sees totals.
- **Accounts**: email and password sign-in, password change, sign out of other devices, JSON backup, workspace reset and account deletion.
- **Polish**: light, dark and system themes; responsive down to 375px; keyboard and screen-reader friendly; skeleton loaders; toasts; respects reduced motion.

## Tech stack

| Area | Choice |
| --- | --- |
| UI | React 19, TypeScript, Tailwind CSS 4, Radix UI primitives, Recharts, lucide icons |
| Data | [Convex](https://convex.dev) (database, server functions, auth, cron), read through **TanStack Query** via `@convex-dev/react-query` (live updates, optimistic edits) |
| Auth | Convex Auth: Password and Anonymous (guest) providers |
| Validation | Zod (forms) and Convex validators plus server-side checks |
| Tooling | Vite, Bun, Biome, Vitest, `convex-test`, GitHub Actions |

### Why Convex?

Supabase's free tier pauses projects after a week of inactivity, which is fatal for a portfolio demo. Convex's free tier doesn't pause, and it provides the database, auth and server functions together. That last part matters here: the Gemini API key lives on the server instead of in the browser bundle.

## Getting started

Prerequisites: [Bun](https://bun.sh) and Node 20+.

```bash
bun install

# Terminal 1: creates a Convex project (or a local one) and writes .env.local
bun run dev:backend

# Once, with the backend running: sign-in keys for Convex Auth
bun run setup:auth

# Terminal 2
bun dev        # http://localhost:3000
```

Optional, to enable the AI advisor:

```bash
npx convex env set GEMINI_API_KEY <your key>      # https://aistudio.google.com/apikey
npx convex env set GEMINI_MODEL gemini-2.5-flash  # optional override
```

## Scripts

| Command | What it does |
| --- | --- |
| `bun dev` / `bun run dev:backend` | Frontend and Convex dev servers |
| `bun run check` | Typecheck, lint, test and build (the same as CI) |
| `bun run test` | Unit tests (finance maths, CSV, money) and backend tests (balances, data isolation between users, guest lifecycle) |
| `bun run format` | Auto-fix formatting and lint issues |

## Deploying

1. **Backend**: `npx convex deploy`, then configure production:
   ```bash
   node scripts/setup-auth.mjs https://your-site.example --prod
   npx convex env set GEMINI_API_KEY <key> --prod   # optional
   ```
2. **Frontend**: any static host (Vercel, Netlify, Cloudflare Pages). Build command `bun run build`, output `dist/`, and set the environment variable `VITE_CONVEX_URL` to your production deployment URL. The app uses hash routing, so no rewrite rules are needed.

## How guest mode works

- On first visit the app signs in anonymously. A Convex Auth callback seeds about four months of realistic data, dated relative to today.
- There is no login wall: anyone not signed in (including after signing out) gets a guest workspace. Sign-up and sign-in are an optional dialog over the demo.
- Guests can't delete the account or set a password; the server enforces both.
- When a guest signs up, they get a one-time token first, and the new account uses it to take over the guest workspace. The server refuses to merge into an account that already has data.
- A daily cron (`convex/crons.ts`) removes guest workspaces older than 7 days, so the database stays small.
- AI requests are rate limited per user and globally, since guest accounts are free to create.

## Project structure

```
convex/            Backend: schema, queries/mutations, auth, cron, AI action, tests
src/app/           App shell, auth gate, error boundary, toaster
src/pages/         One folder per route
src/shared/
  components/      Button, forms, Table, Modal, Menu, BulkBar, …
  hooks/           TanStack Query hooks around Convex, form hook, alerts
  lib/             Pure logic: finance maths, CSV, money, schemas (unit tested)
scripts/           setup-auth.mjs (generates Convex Auth signing keys)
```
