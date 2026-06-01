# ─────────────────────────────────────────────────────────────
# CCE LOG Planner — Worker (BullMQ)
# Multi-stage build pour monorepo pnpm
# ─────────────────────────────────────────────────────────────

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate


# ── 1. Installer les dépendances ──────────────────────────────
FROM base AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/worker/package.json                ./apps/worker/
COPY packages/db/package.json                ./packages/db/
COPY packages/shared/package.json            ./packages/shared/
COPY packages/integrations/package.json      ./packages/integrations/

RUN pnpm install --frozen-lockfile --ignore-scripts


# ── 2. Builder ───────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules            ./node_modules
COPY --from=deps /app/apps/worker/node_modules ./apps/worker/node_modules

COPY . .

# Génère le client Prisma
RUN pnpm db:generate

# Compile TypeScript → dist/
RUN pnpm --filter @ccelog/worker build


# ── 3. Image de production ───────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 worker

# node_modules + dist compilé
COPY --from=builder --chown=worker:nodejs /app/node_modules              ./node_modules
COPY --from=builder --chown=worker:nodejs /app/apps/worker/dist          ./apps/worker/dist
COPY --from=builder --chown=worker:nodejs /app/apps/worker/node_modules  ./apps/worker/node_modules
COPY --from=builder --chown=worker:nodejs /app/packages                  ./packages

USER worker

CMD ["node", "apps/worker/dist/index.js"]
