# ─────────────────────────────────────────────────────────────
# CCE LOG Planner — Web (Next.js 15)
# Multi-stage build pour monorepo pnpm
# ─────────────────────────────────────────────────────────────

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate


# ── 1. Installer les dépendances ──────────────────────────────
FROM base AS deps
WORKDIR /app

# Copier les manifestes de tout le workspace (nécessaire pour pnpm workspaces)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json                   ./apps/web/
COPY apps/worker/package.json                ./apps/worker/
COPY packages/db/package.json                ./packages/db/
COPY packages/shared/package.json            ./packages/shared/
COPY packages/integrations/package.json      ./packages/integrations/
COPY packages/ui/package.json                ./packages/ui/

RUN pnpm install --frozen-lockfile --ignore-scripts


# ── 2. Builder ───────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules         ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

# Source complète
COPY . .

# Génère le client Prisma
RUN pnpm db:generate

# Build Next.js (mode standalone activé dans next.config.ts)
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @ccelog/web build


# ── 3. Image de production ───────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Utilisateur non-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Fichiers standalone (contiennent les node_modules nécessaires)
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
# Assets statiques
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static     ./apps/web/.next/static
# Dossier public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public           ./apps/web/public

USER nextjs
EXPOSE 3000

CMD ["node", "apps/web/server.js"]
