# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install (pnpm required — node ≥ 20)
pnpm install

# Dev (all apps in parallel via Turbo)
pnpm dev

# Individual apps
pnpm --filter @ccelog/web dev        # Next.js on :3000
pnpm --filter @ccelog/worker dev     # BullMQ worker

# Build
pnpm build
pnpm --filter @ccelog/web build

# Type-check & lint
pnpm type-check
pnpm lint

# Tests
pnpm test
pnpm --filter @ccelog/web test       # Vitest
pnpm --filter @ccelog/web test -- --reporter=verbose src/path/to/file.test.ts

# E2E (Playwright)
pnpm e2e                             # Run all e2e tests (headless)
pnpm e2e:ui                          # Run with Playwright UI
# Requires: TEST_SESSION_TOKEN env var pointing to a seeded admin session

# Database
pnpm db:generate        # After schema changes
pnpm db:migrate         # Apply migrations (dev)
pnpm --filter @ccelog/db exec prisma migrate deploy   # Production
pnpm db:seed            # Insert initial data (trainers, clients, themes, etc.)
pnpm db:studio          # Prisma Studio GUI

# Migration historique
npx ts-node scripts/migrate-from-excel.ts --file ./data/sessions.csv --dry-run
npx ts-node scripts/migrate-from-excel.ts --file ./data/sessions.csv
```

## Architecture

**Monorepo (pnpm workspaces + Turbo)**

```
apps/web/       Next.js 15 App Router — UI + all API routes + Server Actions
apps/worker/    BullMQ workers — async jobs (notifications, Outlook sync, IA parsing, cost recalc)
packages/db/    Prisma client + schema — imported as @ccelog/db
packages/shared/ Zod schemas, business utils, IA prompts — imported as @ccelog/shared
packages/integrations/ MS Graph, WhatsApp Cloud API, Google Maps — @ccelog/integrations
packages/ui/    shadcn-style shared components — @ccelog/ui
```

**apps/web routing** uses the Next.js route group `(dashboard)/` for all authenticated pages. The root `/` is the public login page. Middleware (`src/middleware.ts`) redirects unauthenticated users to `/`.

**Cron**: `GET /api/cron/notifications` is called daily (Vercel Cron, 06:00 Casablanca). Requires `x-cron-secret` header matching `CRON_SECRET` env var. Creates `Notification` rows and enqueues them for the worker. Config in `apps/web/vercel.json`.

**Analytics**: `/analytiques` page (server component) provides 12-month session/revenue charts, top clients/themes, trainer utilization. Sourced entirely from the `TrainingSession` table — no external analytics service.

**apps/web API routes** follow the pattern `src/app/api/<resource>/route.ts` (collection) and `src/app/api/<resource>/[id]/route.ts` (item). Each route calls `auth()` at the top and returns 401 if missing.

**Workers** (`apps/worker/src/jobs/`) are BullMQ processors imported by `src/index.ts`. Queue names: `ping`, `notifications`, `outlook-sync`, `wa-parse`, `cost-recalc`. Enqueue jobs from API routes via `import { queues } from "@ccelog/worker"` wrapped in try/catch (worker may be unavailable in dev).

## Key Domain Rules (enforce these)

| Rule | Code impact |
|---|---|
| R1 — Max 3 sessions consécutives par formateur | Check in matching algo (`packages/shared/src/utils/matching.ts`) |
| R2 — CONFIRMEE = trainerConfirmed AND clientConfirmed | Enforced in `PATCH /api/sessions/[id]` |
| R3 — Couleurs : Confirmée=blanc, Provisoire=jaune, Annulée=rouge | `SESSION_STATUS_COLORS` in `packages/shared/src/constants.ts` |
| R4 — Outlook sync on status change | `showAs: "busy"` (CONFIRMEE) / `"tentative"` (PROVISOIRE) / delete (ANNULEE) |
| R5 — Hôtel si distance > 150 km ou J+1 même ville | `shouldRequireHotel()` in `packages/shared/src/utils/cost.ts` |
| R6 — `Session.totalCost` recalculated on every change | Enqueue `cost-recalc` job after any session PATCH |
| R7 — No auto-send of client emails | API routes prepare payload, UI renders a confirm button |
| R8 — WhatsApp uses Meta-approved templates outside 24h window | `WA_TEMPLATES` constants, never send freeform text |
| R9 — Stock check before CONFIRMEE | Query `ConsumableUsage` vs `Consumable.stockQty` |
| R10 — All dates in Africa/Casablanca | Use `toMarocDate()` / `fromMarocDate()` from `@ccelog/shared` |
| R11 — Audit log on sensitive mutations | `db.auditLog.create()` in PATCH/DELETE routes |
| R13 — Formateurs INTERNE prioritaires dans le matching | `Trainer.type === "INTERNE"` gets score bonus in matching algo |
| R14 — Formateur externe doit avoir une convention cadre active | Check `Framework.status === "ACTIF"` before assigning EXTERNE to a session |
| R15 — Cohérence BdC / facture externe (±5% tolérance) | `Prestation.coherenceCheck` calculated in `recordInvoiceReceivedAction` |
| R16 — Facture client auto-proposée à la clôture de session | Create `Invoice` draft when session moves to CONFIRMEE (M13) |
| R17 — Relances automatiques J+30/J+45/J+60 | `NotificationType.RELANCE_PAIEMENT_*` triggered by scheduler |

## Data Model Highlights

- **`TrainingSession`** is the central entity. It links Trainer + Theme + TrainingRequest (which links Client + Site). Status: `PROVISOIRE → CONFIRMEE → ANNULEE`.
- **`Session_Auth`** is NextAuth's session table (mapped to `auth_sessions`). Do not confuse with `TrainingSession`.
- **`outlookEventId`** stores long Outlook IDs (`AAMkAD...`). Never truncate or transform them.
- **`costBreakdown`** is a JSON column storing `{ honoraires, transport, hotel, perDiem, consommables, total }`.
- **`AppConfig`** table stores runtime-configurable thresholds (`hotel_distance_threshold_km`, `max_consecutive_sessions`).

### v2 entities (migration `v2_billing_preselection`)

- **`Trainer.type`** — `INTERNE` (salarié CCE LOG) or `EXTERNE` (prestataire). INTERNE fields: `employeeId`, `employerCost`. EXTERNE fields: `legalStatus`, `ice`, `rc`, `ifFiscal`, `cnss`, `iban`, `bankName`, `defaultDayRate`, `paymentTerms`.
- **`Preselection`** — candidature pipeline: `CANDIDAT → EN_EVALUATION → ACCEPTE / REFUSE`. Trainer is `active: false` until ACCEPTE.
- **`Framework`** — convention cadre signée avec un formateur EXTERNE. Required before assigning (R14). Status: `ACTIF / EXPIRE / RESILIE`.
- **`NegotiationStep`** — historique de négociation tarifaire par theme. Tracks `proposedRate`, `counterRate`, `agreedRate`.
- **`Prestation`** — une engagement externe par session: émet un BdC (`poReference`), reçoit une facture, vérifie cohérence R15.
- **`Invoice`** — facture émise au client (M13). Contains `InvoiceLine[]` linking to sessions. Relances via `reminderSentJ30/J45/J60`.
- **`InvoiceLine`** — ligne de facture, optionnellement liée à une `TrainingSession`.
- **`Role.COMPTABILITE`** — nouvel accès pour la comptabilité (facturation + achats).

## Integrations

**Microsoft Graph** (`packages/integrations/src/m365/index.ts`): wraps Graph REST calls. Requires `M365_ACCESS_TOKEN` env var (obtained via NextAuth OAuth flow). The MCP server at `https://ccelog-m365-mcp.onrender.com/mcp` is an alternative path for calendar ops — same Graph operations, different transport.

**WhatsApp** (`packages/integrations/src/whatsapp/index.ts`): Meta Cloud API. Webhook at `/api/whatsapp/webhook` verifies `X-Hub-Signature-256` with `WA_APP_SECRET`, then enqueues `wa-parse` job. Only template messages are sent (R8).

**Google Maps** (`packages/integrations/src/maps/index.ts`): `getDistance()` checks `DistanceCache` first (30-day TTL), calls Distance Matrix API on miss. Falls back to haversine × 1.3 if `GOOGLE_MAPS_API_KEY` is absent.

**Anthropic** (used in `apps/worker/src/jobs/wa-parse.ts` and the email-parsing route): model `claude-sonnet-4-5`. All AI calls are server-side only (never from browser). Prompts are versioned in `packages/shared/src/prompts/index.ts`.

## Auth

NextAuth v5 with `@auth/prisma-adapter`. Microsoft Entra ID is the only provider for staff. Trainers get a `magicLinkToken` on `Trainer` (short-lived, stored hashed) that gives access to `/formateur/acces` — limited to their own sessions only.

Azure App Registration: Client ID `ce94b85e-d038-4b49-8cf3-8e9df5f33b6c`, Tenant `c3e845fd-4d96-49d6-aeaf-409efb5ddbe5`. The client secret expires **04/08/2028**.

## i18n

All UI strings go through `next-intl`. The only locale is `fr` (file: `apps/web/messages/fr.json`). Never hardcode French labels in components — reference the messages file instead.

## TypeScript

`strict: true` everywhere. `noUnusedLocals` and `noUnusedParameters` are enabled — fix them, do not disable. `any` is banned unless accompanied by a comment explaining why.

Zod schemas live in `packages/shared/src/types/index.ts` and are the single source of truth for validation. Import and use them in both API routes and forms — don't duplicate validation logic.
