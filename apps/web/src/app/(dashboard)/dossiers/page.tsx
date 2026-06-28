import { db } from "@ccelog/db";
import type { DossierStatus, Prisma } from "@ccelog/db";
import { FolderOpen, CheckCircle2, Clock, PackageCheck, AlertCircle, MapPin, User } from "lucide-react";
import { startDossierAction, completeDossierAction } from "./actions";

export const metadata = { title: "Dossiers de formation" };

// ─── Types ────────────────────────────────────────────────────────────────────

type SessionWithDossier = Prisma.TrainingSessionGetPayload<{
  include: {
    dossier: true;
    trainer: { select: { id: true; fullName: true; email: true } };
    theme: {
      select: {
        id: true;
        label: true;
        code: true;
        consumables: { include: { consumable: true } };
      };
    };
    request: {
      include: {
        client: { select: { name: true } };
        site: { select: { city: true } };
      };
    };
  };
}>;

// ─── Stock availability (R9) ───────────────────────────────────────────────

function isStockAvailable(session: SessionWithDossier): boolean {
  return session.theme.consumables.every(
    (tc) => tc.consumable.stockQty >= tc.quantity
  );
}

// ─── Status display config ────────────────────────────────────────────────────

const DOSSIER_STATUS_CONFIG: Record<
  DossierStatus,
  { label: string; className: string; dot: string }
> = {
  EN_ATTENTE: {
    label: "En attente",
    className: "bg-secondary text-muted-foreground border-border",
    dot: "bg-muted-foreground",
  },
  EN_PREPARATION: {
    label: "En préparation",
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  PRET: {
    label: "Prêt",
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
};

const PICKUP_TYPE_LABELS: Record<string, string> = {
  BUREAU: "Retrait au bureau",
  ARMOIRE: "Armoire de stock",
  COLIS_EXPRESS: "Colis express",
  PERSONNE: "Remise en main propre",
};

// ─── Filter tabs ───────────────────────────────────────────────────────────────

type FilterTab = "TOUS" | DossierStatus;

function getDossierStatus(session: SessionWithDossier): DossierStatus {
  return session.dossier?.status ?? "EN_ATTENTE";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: DossierStatus }) {
  const cfg = DOSSIER_STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border ${cfg.className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function StockIndicator({ available }: { available: boolean }) {
  if (available) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
        <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
        Stock OK
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400">
      <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
      Stock insuffisant
    </span>
  );
}

function StartButton({ sessionId }: { sessionId: string }) {
  return (
    <form
      action={async () => {
        "use server";
        await startDossierAction(sessionId);
      }}
    >
      <button
        type="submit"
        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <FolderOpen className="h-3.5 w-3.5" />
        Commencer
      </button>
    </form>
  );
}

function CompleteForm({ sessionId }: { sessionId: string }) {
  return (
    <form
      action={completeDossierAction}
      className="mt-3 pt-3 border-t border-border space-y-3"
    >
      <input type="hidden" name="sessionId" value={sessionId} />

      <div className="space-y-1.5">
        <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          Mode de remise
        </label>
        <select
          name="pickupType"
          required
          defaultValue=""
          className="w-full bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="" disabled>
            Choisir…
          </option>
          {Object.entries(PICKUP_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          Détail (optionnel)
        </label>
        <input
          type="text"
          name="pickupDetail"
          placeholder="Ex. : casier 3B, nom du destinataire…"
          className="w-full bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <button
        type="submit"
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-medium hover:bg-emerald-500/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        Marquer comme prêt
      </button>
    </form>
  );
}

function SessionCard({ session }: { session: SessionWithDossier }) {
  const dossierStatus = getDossierStatus(session);
  const stockOk = isStockAvailable(session);
  const startDate = new Date(session.startDate);
  const endDate = new Date(session.endDate);
  const isSameDay = startDate.toDateString() === endDate.toDateString();

  const dateRange = isSameDay
    ? startDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
    : `${startDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} – ${endDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}`;

  const daysUntil = Math.ceil((startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div className="bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-colors">
      {/* Card header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">
            {session.request.client.name}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {session.theme.code} · {session.theme.label}
          </p>
        </div>
        <StatusBadge status={dossierStatus} />
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mb-3">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3 flex-shrink-0" />
          {dateRange}
        </span>
        {session.request.site.city && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            {session.request.site.city}
          </span>
        )}
        {session.trainer && (
          <span className="flex items-center gap-1">
            <User className="h-3 w-3 flex-shrink-0" />
            {session.trainer.fullName}
          </span>
        )}
      </div>

      {/* Footer row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <StockIndicator available={stockOk} />
          {daysUntil <= 7 && daysUntil > 0 && (
            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
              J-{daysUntil}
            </span>
          )}
          {daysUntil === 0 && (
            <span className="text-[11px] font-medium text-red-600 dark:text-red-400">
              Aujourd&apos;hui
            </span>
          )}
        </div>

        {dossierStatus === "EN_ATTENTE" && <StartButton sessionId={session.id} />}

        {dossierStatus === "PRET" && session.dossier?.pickupType && (
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <PackageCheck className="h-3.5 w-3.5 text-emerald-500" />
            {PICKUP_TYPE_LABELS[session.dossier.pickupType]}
          </span>
        )}
      </div>

      {/* In-preparation: show complete form */}
      {dossierStatus === "EN_PREPARATION" && <CompleteForm sessionId={session.id} />}
    </div>
  );
}

// ─── KPI strip ────────────────────────────────────────────────────────────────

function KpiStrip({ sessions }: { sessions: SessionWithDossier[] }) {
  const total = sessions.length;
  const enAttente = sessions.filter((s) => getDossierStatus(s) === "EN_ATTENTE").length;
  const enPrep = sessions.filter((s) => getDossierStatus(s) === "EN_PREPARATION").length;
  const prets = sessions.filter((s) => getDossierStatus(s) === "PRET").length;
  const stockKo = sessions.filter((s) => !isStockAvailable(s)).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[
        { label: "Total à traiter", value: total, color: "text-foreground", icon: FolderOpen },
        { label: "En attente", value: enAttente, color: "text-muted-foreground", icon: Clock },
        { label: "En préparation", value: enPrep, color: "text-blue-600 dark:text-blue-400", icon: PackageCheck },
        { label: "Prêts", value: prets, color: "text-emerald-600 dark:text-emerald-400", icon: CheckCircle2 },
      ].map(({ label, value, color, icon: Icon }) => (
        <div key={label} className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Icon className={`h-4 w-4 ${color}`} />
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
          <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
        </div>
      ))}
      {stockKo > 0 && (
        <div className="md:col-span-4 flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {stockKo} session{stockKo > 1 ? "s" : ""} avec un stock insuffisant — vérifier les réservations.
        </div>
      )}
    </div>
  );
}

// ─── Filter tabs UI ────────────────────────────────────────────────────────────

function FilterTabs({
  active,
  counts,
}: {
  active: FilterTab;
  counts: Record<FilterTab, number>;
}) {
  const tabs: { key: FilterTab; label: string }[] = [
    { key: "TOUS", label: "Tous" },
    { key: "EN_ATTENTE", label: "En attente" },
    { key: "EN_PREPARATION", label: "En préparation" },
    { key: "PRET", label: "Prêts" },
  ];

  return (
    <div className="flex items-center gap-1 bg-secondary rounded-lg p-1 w-fit">
      {tabs.map(({ key, label }) => (
        <a
          key={key}
          href={key === "TOUS" ? "/dossiers" : `/dossiers?filtre=${key}`}
          aria-current={active === key ? "page" : undefined}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            active === key
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {label}
          <span
            className={`text-[10px] tabular-nums ${
              active === key ? "text-muted-foreground" : "text-muted-foreground/50"
            }`}
          >
            {counts[key]}
          </span>
        </a>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DossiersPage({
  searchParams,
}: {
  searchParams: Promise<{ filtre?: string }>;
}) {
  const params = await searchParams;
  const activeFilter = (params.filtre as DossierStatus | undefined) ?? "TOUS";

  const sessions = (await db.trainingSession.findMany({
    where: {
      status: "CONFIRMEE",
      startDate: { gte: new Date() },
    },
    include: {
      dossier: true,
      trainer: { select: { id: true, fullName: true, email: true } },
      theme: {
        select: {
          id: true,
          label: true,
          code: true,
          consumables: { include: { consumable: true } },
        },
      },
      request: {
        include: {
          client: { select: { name: true } },
          site: { select: { city: true } },
        },
      },
    },
    orderBy: { startDate: "asc" },
  })) as unknown as SessionWithDossier[];

  // Build counts for filter tabs
  const counts: Record<FilterTab, number> = {
    TOUS: sessions.length,
    EN_ATTENTE: sessions.filter((s) => getDossierStatus(s) === "EN_ATTENTE").length,
    EN_PREPARATION: sessions.filter((s) => getDossierStatus(s) === "EN_PREPARATION").length,
    PRET: sessions.filter((s) => getDossierStatus(s) === "PRET").length,
  };

  const filtered =
    activeFilter === "TOUS"
      ? sessions
      : sessions.filter((s) => getDossierStatus(s) === activeFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dossiers de formation à préparer</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sessions confirmées dont le dossier matériel reste à constituer
        </p>
      </div>

      {/* KPIs */}
      <KpiStrip sessions={sessions} />

      {/* Filter tabs */}
      <FilterTabs active={activeFilter as FilterTab} counts={counts} />

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-card border border-border rounded-xl gap-3">
          <CheckCircle2 className="h-10 w-10 text-emerald-500/40" />
          <p className="text-muted-foreground text-sm">
            {activeFilter === "TOUS"
              ? "Aucune session confirmée à venir."
              : "Aucun dossier dans cette catégorie."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}
