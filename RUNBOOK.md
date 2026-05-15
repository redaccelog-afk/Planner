# RUNBOOK — CCE LOG Planner

Guide de déploiement et d'exploitation en production.

---

## Prérequis

| Service | Fournisseur recommandé | Remarque |
|---------|----------------------|----------|
| Base de données PostgreSQL | Supabase (plan Pro) | Activer Row Level Security |
| Redis | Upstash (plan Pay-per-use) | Mode TLS requis (`rediss://`) |
| Hébergement Next.js | Vercel | Plan Pro pour les crons |
| Hébergement Worker | Railway ou Render | Service persistant (non serverless) |
| Stockage fichiers | Supabase Storage | Bucket `documents` en accès privé |

---

## Variables d'environnement de production

Toutes les variables sont documentées dans `.env.example`. Points critiques :

```
NEXTAUTH_SECRET=          # openssl rand -base64 32
NEXTAUTH_URL=             # https://planner.ccelog.ma
CRON_SECRET=              # openssl rand -base64 24
DATABASE_URL=             # Supabase Transaction Pooler (port 6543)
DIRECT_URL=               # Supabase Direct (port 5432) — pour les migrations
REDIS_URL=                # rediss://default:TOKEN@HOST.upstash.io:PORT
```

---

## Déploiement initial

### 1. Base de données

```bash
# Appliquer les migrations
pnpm --filter @ccelog/db exec prisma migrate deploy

# Seed initial (données de référence)
pnpm db:seed
```

### 2. Next.js (Vercel)

1. Connecter le repo GitHub à Vercel
2. Définir `Root Directory = apps/web`
3. Renseigner toutes les env vars dans le dashboard Vercel
4. Déployer — Vercel détecte automatiquement Next.js 15
5. Vérifier que `vercel.json` (cron) est pris en compte dans l'onglet Cron Jobs

### 3. Worker BullMQ (Railway)

```bash
# Dockerfile minimal — ou utiliser Nixpacks
Start command: pnpm --filter @ccelog/worker start
```

Env vars nécessaires : `DATABASE_URL`, `DIRECT_URL`, `REDIS_URL`, `ANTHROPIC_API_KEY`, `WA_*`, `M365_*`

---

## Migration des données historiques

```bash
# Dry run — vérifier sans écrire
npx ts-node scripts/migrate-from-excel.ts --file ./data/sessions.csv --dry-run

# Migration réelle
npx ts-node scripts/migrate-from-excel.ts --file ./data/sessions.csv
```

Format CSV : `client_nom;client_ville;theme_code;formateur_nom;date_debut;date_fin;participants;statut;cout_total`

---

## Checks post-déploiement

- [ ] `GET /api/cron/notifications?secret=CRON_SECRET` → `{ ok: true }`
- [ ] Login Microsoft SSO fonctionne
- [ ] Webhook WhatsApp répond 200 à `GET /api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=WA_VERIFY_TOKEN`
- [ ] Génération d'un document test (CONVOCATION) sur une session existante
- [ ] Email test envoyé via `POST /api/mails/send`
- [ ] Prisma Studio accessible localement (`pnpm db:studio`)

---

## Maintenance courante

### Rotation des tokens

- `AZURE_AD_CLIENT_SECRET` expire le **04/08/2028** → renouveler dans Azure App Registration
- `WA_API_TOKEN` : token permanent Meta, ne nécessite pas de rotation sauf révocation

### Backup base de données

Supabase Pro inclut des backups point-in-time sur 7 jours. Pour une rétention plus longue :

```bash
pg_dump $DIRECT_URL > backup_$(date +%Y%m%d).sql
```

### Monitoring

- Vercel Analytics : taux d'erreur, temps de réponse
- BullMQ dashboard : `bull-board` peut être ajouté comme route `/admin/queues` (protégée)
- Alertes stock : vérifiées à chaque chargement de la page `/stock`

---

## Rollback

```bash
# Revenir à la migration précédente
pnpm --filter @ccelog/db exec prisma migrate resolve --rolled-back <migration_name>

# Redéployer la version précédente sur Vercel
vercel rollback [deployment-url]
```

---

## Contacts

| Rôle | Contact |
|------|---------|
| Développeur principal | Med Rida BOUCHEBKAT |
| Azure AD / M365 | Admin IT CCE LOG |
| Meta WhatsApp Business | Compte Business Manager CCE LOG |
