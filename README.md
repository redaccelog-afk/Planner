# CCE LOG — Planification des formations

Application web de planification et d'automatisation des formations pour **CCE LOG**, organisme marocain de formation et certification (CACES, VR, Sécurité industrielle).

---

## Architecture

```
ccelog-planner/
├── apps/
│   ├── web/          # Next.js 15 App Router (UI + API routes + Server Actions)
│   └── worker/       # Workers BullMQ (notifications, sync Outlook, parsing IA)
├── packages/
│   ├── db/           # Prisma schema + client PostgreSQL
│   ├── shared/       # Types Zod, utils, constantes métier, prompts IA
│   ├── integrations/ # Wrappers MS Graph, WhatsApp Cloud API, Google Maps
│   └── ui/           # Composants shadcn/ui partagés
└── .github/
    └── workflows/    # CI : lint, type-check, tests, migrations
```

**Stack** : Next.js 15 · TypeScript strict · Tailwind CSS · shadcn/ui · Prisma · PostgreSQL (Supabase) · BullMQ + Redis (Upstash) · NextAuth v5 (Microsoft SSO) · Vercel (web) · Render (worker)

---

## Prérequis

- **Node.js** ≥ 20
- **pnpm** ≥ 9 (`npm i -g pnpm@9`)
- **PostgreSQL** (Supabase ou local)
- **Redis** (Upstash ou local)

---

## Installation

```bash
# 1. Cloner
git clone https://github.com/redaccelog-afk/ccelog-planner.git
cd ccelog-planner

# 2. Installer les dépendances
pnpm install

# 3. Variables d'environnement
cp .env.example .env.local
# Éditer .env.local avec vos valeurs (voir section Variables ci-dessous)

# 4. Générer le client Prisma
pnpm db:generate

# 5. Appliquer les migrations
pnpm db:migrate

# 6. Seeder les données initiales
pnpm db:seed

# 7. Lancer le développement
pnpm dev
```

L'app sera disponible sur http://localhost:3000

---

## Variables d'environnement

Copier `.env.example` vers `.env.local` et renseigner :

| Variable | Description | Où l'obtenir |
|---|---|---|
| `DATABASE_URL` | URL PostgreSQL (pooler) | Supabase → Settings → Database |
| `DIRECT_URL` | URL PostgreSQL directe | Supabase → Settings → Database |
| `NEXTAUTH_SECRET` | Secret JWT | `openssl rand -base64 32` |
| `AZURE_AD_CLIENT_ID` | `ce94b85e-d038-4b49-8cf3-8e9df5f33b6c` | Azure Portal (déjà configuré) |
| `AZURE_AD_CLIENT_SECRET` | Secret Azure | Azure Portal → App Registration → Certificates & secrets |
| `AZURE_AD_TENANT_ID` | `c3e845fd-4d96-49d6-aeaf-409efb5ddbe5` | Azure Portal (déjà configuré) |
| `WA_PHONE_NUMBER_ID` | ID numéro WhatsApp Business | Meta Business Manager |
| `WA_API_TOKEN` | Token API WhatsApp | Meta Business Manager |
| `WA_APP_SECRET` | Secret app Meta | Meta Business Manager |
| `ANTHROPIC_API_KEY` | Clé API Anthropic | console.anthropic.com |
| `GOOGLE_MAPS_API_KEY` | Clé Google Maps | console.cloud.google.com |
| `REDIS_URL` | URL Redis | Upstash → Redis → Connect |
| `SUPABASE_URL` | URL Supabase | Supabase → Project Settings |
| `SUPABASE_ANON_KEY` | Clé anonyme Supabase | Supabase → Project Settings |
| `SUPABASE_SERVICE_KEY` | Clé service Supabase | Supabase → Project Settings |

---

## Services externes à provisionner

### Obligatoires (Phase 0-1)
- [ ] **Supabase** : créer un projet, récupérer `DATABASE_URL` et `DIRECT_URL`
- [ ] **Upstash Redis** : créer une instance Redis, récupérer `REDIS_URL`
- [ ] **Vercel** : connecter le repo GitHub, ajouter les variables d'env
- [ ] **Render** : déployer `apps/worker` (le MCP existant est déjà sur Render)

### Phase 2 (Outlook/Calendrier)
- [ ] **Azure App Registration** : déjà configurée (`ce94b85e-...`), récupérer le client secret

### Phase 3 (Parsing IA)
- [ ] **Anthropic API** : créer un compte sur console.anthropic.com

### Phase 4 (WhatsApp)
- [ ] **Meta WhatsApp Cloud API** : créer compte Business Manager, vérifier le numéro
- [ ] Faire approuver les templates WhatsApp (délai : 24-72h)

### Phase 5 (Cartographie)
- [ ] **Google Maps Platform** : activer Distance Matrix API et Geocoding API

---

## Scripts disponibles

```bash
pnpm dev          # Démarre web + worker en mode dev
pnpm build        # Build de toutes les apps
pnpm lint         # ESLint sur tout le monorepo
pnpm type-check   # TypeScript --noEmit
pnpm test         # Vitest (unitaires)
pnpm db:generate  # Génère le client Prisma
pnpm db:migrate   # Applique les migrations (dev)
pnpm db:seed      # Insère les données initiales
pnpm db:studio    # Prisma Studio (UI base de données)
```

---

## Phases de développement

| Phase | Module | Statut |
|---|---|---|
| 0 | Bootstrap — monorepo, auth, CI | ✅ Terminée |
| 1 | Référentiels (M1) — CRUD formateurs, clients, thèmes | 🚧 En cours |
| 2 | Sessions & calendrier (M7) — Gantt, sync Outlook | ⏳ À venir |
| 3 | Demandes & matching (M2+M3) — Inbox, scoring | ⏳ À venir |
| 4 | Communication (M4+M5) — WhatsApp, mails | ⏳ À venir |
| 5 | Optimisation logistique (M6+M8) — Distance, hôtel | ⏳ À venir |
| 6 | Documents & matériel (M9) — .docx/PDF | ⏳ À venir |
| 7 | Suivi post-formation & stock (M10+M11) | ⏳ À venir |
| 8 | Dashboards & notifications (M12+M13) | ⏳ À venir |
| 9 | Migration & production | ⏳ À venir |

---

## Règles métier critiques

- **R1** : Max 3 formations consécutives par formateur
- **R2** : Session CONFIRMÉE = confirmation formateur ET client
- **R3** : Code couleur — Confirmée (blanc) · Provisoire (jaune) · Annulée (rouge)
- **R4** : Sync Outlook — Confirmée→busy · Provisoire→tentative · Annulée→supprimé
- **R5** : Hôtel obligatoire si distance > 150 km OU J+1 même ville
- **R7** : Aucun mail client sans validation humaine (bouton Envoyer manuel)
- **R10** : Timezone Africa/Casablanca partout

---

## Intégrations

| Service | Détail |
|---|---|
| **MCP CCE LOG** | `https://ccelog-m365-mcp.onrender.com/mcp` (Render) |
| **Azure App Registration** | Client ID `ce94b85e-...` · Tenant `c3e845fd-...` |
| **Outlook Calendar** | Sync via Graph API — IDs `AAMkAD...` préservés exactement |
| **WhatsApp** | Templates Meta approuvés — webhook `/api/whatsapp/webhook` |

---

## Structure des pages

```
/              → Page connexion + branding CCE LOG
/dashboard     → Inbox d'actions (tableau de bord)
/demandes      → Liste des demandes de formation
/sessions      → Calendrier + Gantt + carte
/sessions/[id] → Détail session complète
/formateurs    → Référentiel formateurs
/clients       → Référentiel clients & sites
/themes        → Catalogue thèmes
/stock         → Consommables & matériel
/rapports      → Pipeline rapports
/parametres    → Configuration & audit log
```

---

## Licence

Propriétaire — CCE LOG · Maroc · 2024-2025
