import { db } from "@ccelog/db";
import type { DossierStatus, Prisma } from "@ccelog/db";
import { FolderOpen, CheckCircle2, Clock, PackageCheck, AlertCircle, MapPin, User, CalendarClock } from "lucide-react";
import { startDossierAction, completeDossierAction } from "./actions";

export const metadata = { title: "Dossiers de formation" };

// ─── Types ────────────────────────────────────────────────────────────────────

type SessionWithDossier = Prisma.TrainingSessionGetPayload<{
  include: {
    dossier: {
      include: {
        checkItems: {
          include: { dossierItem: true };
        };
      };
    };
    trainer: { select: { id: true; fullName: true; email: true } };
    theme: {
      select: {
        id: true;
        label: true;
        code: true;
        consumables: { include: { consumable: true } };
        dossierItems: true;
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

// ─── Priority logic (J-1 rule) ────────────────────────────────────────────────

// 0 = highest priority (overdue/critical), 3 = lowest (already done)
function getPriority(session: SessionWithDossier): 0 | 1 | 2 | 3 {
  const status = session.dossier?.status ?? "EN_ATTENTE";
  if (status === "PRET") return 3;

  const now = Date.now();
  const deadlineMs = new Date(session.startDate).getTime() - 24 * 60 * 60 * 1000; // J-1
  const msUntilDeadline = deadlineMs - now;
  const hoursUntilDeadline = msUntilDeadline / (1000 * 60 * 60);

  if (hoursUntilDeadline <= 0) return 0;       // CRITIQUE — deadline passée
  if (hoursUntilDeadline <= 24) return 1;      // URGENT — moins de 24 h
  if (hoursUntilDeadline <= 72) return 2;      // ATTENTION — moins de 3 jours
  return 2;                                    // NORMAL (still priority 2)
}

type UrgencyLevel = "OVERDUE" | "URGENT" | "SOON" | "OK" | "DONE";

function getUrgency(session: SessionWithDossier): UrgencyLevel {
  const status = session.dossier?.status ?? "EN_ATTENTE";
  if (status === "PRET") return "DONE";

  const now = Date.now();
  const deadlineMs = new Date(session.startDate).getTime() - 24 * 60 * 60 * 1000;
  const hoursUntilDeadline = (deadlineMs - now) / (1000 * 60 * 60);

  if (hoursUntilDeadline <= 0) return "OVERDUE";
  if (hoursUntilDeadline <= 24) return "URGENT";
  if (hoursUntilDeadline <= 72) return "SOON";
  return "OK";
}

// ─── Stock availability (R9) ──────────────────────────────────────────────────

function isStockAvailable(session: SessionWithDossier): boolean {
  return session.theme.consumables.every((tc) => tc.consumable.stockQty >= tc.quantity);
}

function getDossierStatus(session: SessionWithDossier): DossierStatus {
  return session.dossier?.status ?? "EN_ATTENTE";
}

// ─── Status display config ────────────────────────────────────────────────────

const DOSSIER_STATUS_CONFIG: Record<DossierStatus, { label: string; className: string; dot: string }> = {
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

const URGENCY_BORDER: Record<UrgencyLevel, string> = {
  OVERDUE: "border-red-500/60 bg-red-500/5",
  URGENT:  "border-orange-500/60 bg-orange-500/5",
  SOON:    "border-amber-500/40",
  OK:      "border-border",
  DONE:    "border-border opacity-70",
};

const PICKUP_TYPE_LABELS: Record<string, string> = {
  BUREAU: "Retrait au bureau",
  ARMOIRE: "Armoire de stock",
  COLIS_EXPRESS: "Colis express",
  PERSONNE: "Remise en main propre",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: DossierStatus }) {
  const cfg = DOSSIER_STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border ${cfg.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function UrgencyBadge({ urgency, deadlineDate }: { urgency: UrgencyLevel; deadlineDate: Date }) {
  if (urgency === "DONE") return null;

  const label = deadlineDate.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" });

  if (urgency === "OVERDUE") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
        <AlertCircle className="h-3 w-3" />
        En retard · J-1 dépassé
      </span>
    );
  }
  if (urgency === "URGENT") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 dark:text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full">
        <CalendarClock className="h-3 w-3" />
        Urgent · avant le {label}
      </span>
    );
  }
  if (urgency === "SOON") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
        <CalendarClock className="h-3 w-3" />
        Préparer avant le {label}
      </span>
    );
  }
  // OK
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
      <CalendarClock className="h-3 w-3" />
      Avant le {label}
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

function CompleteForm({ session }: { session: SessionWithDossier }) {
  const { dossier, theme, request } = session;
  const participants = (request as unknown as { participants: number }).participants ?? 1;

  // Merge theme dossierItems with existing check states
  const checkItems = theme.dossierItems.map((item, i) => {
    const existing = dossier?.checkItems?.find((ci) => ci.dossierItemId === item.id);
    return { index: i, item, checked: existing?.checked ?? false, qty: existing?.quantityConfirmed ?? participants };
  });

  const hasChecklist = checkItems.length > 0;
  const allRequiredChecked = checkItems
    .filter((ci) => ci.item.required)
    .every((ci) => ci.checked);

  return (
    <form action={completeDossierAction} className="mt-3 pt-3 border-t border-border space-y-3">
      <input type="hidden" name="sessionId" value={session.id} />
      <input type="hidden" name="itemCount" value={checkItems.length} />

      {/* Checklist */}
      {hasChecklist && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            Documents à préparer
            <span className="ml-1.5 font-normal normal-case">
              ({checkItems.filter((ci) => ci.checked).length}/{checkItems.length} cochés)
            </span>
          </p>

          <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
            {checkItems.map(({ index: i, item, checked, qty }) => (
              <div key={item.id} className={`flex items-center gap-3 px-3 py-2.5 ${checked ? "bg-emerald-500/5" : "bg-background"}`}>
                {/* Hidden id */}
                <input type="hidden" name={`item_${i}_id`} value={item.id} />

                {/* Checkbox */}
                <div className="flex-shrink-0">
                  <input
                    type="checkbox"
                    name={`item_${i}_checked`}
                    defaultChecked={checked}
                    className="w-4 h-4 rounded border-border text-primary accent-primary"
                    id={`check_${item.id}`}
                  />
                </div>

                {/* Label + badge */}
                <label
                  htmlFor={`check_${item.id}`}
                  className={`flex-1 text-xs cursor-pointer select-none ${checked ? "line-through text-muted-foreground" : "text-foreground"}`}
                >
                  {item.label}
                  {item.required && (
                    <span className="ml-1.5 text-[10px] text-orange-500 font-medium">obligatoire</span>
                  )}
                </label>

                {/* Quantity */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <label className="text-[10px] text-muted-foreground">Qté :</label>
                  <input
                    type="number"
                    name={`item_${i}_qty`}
                    defaultValue={qty}
                    min={1}
                    className="w-14 h-6 rounded border border-border bg-secondary px-1.5 text-xs text-foreground text-center focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>
            ))}
          </div>

          {!allRequiredChecked && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <AlertCircle className="h-3 w-3 flex-shrink-0" />
              Cochez tous les documents obligatoires avant de finaliser.
            </p>
          )}
        </div>
      )}

      {/* Pickup */}
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
          <option value="" disabled>Choisir…</option>
          {Object.entries(PICKUP_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
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
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-medium hover:bg-emerald-500/20 transition-colors"
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        Marquer comme prêt
      </button>
    </form>
  );
}

function SessionCard({ session, rank }: { session: SessionWithDossier; rank: number }) {
  const dossierStatus = getDossierStatus(session);
  const stockOk = isStockAvailable(session);
  const urgency = getUrgency(session);

  const startDate = new Date(session.startDate);
  const endDate = new Date(session.endDate);
  const deadlineDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000); // J-1

  const isSameDay = startDate.toDateString() === endDate.toDateString();
  const dateRange = isSameDay
    ? startDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
    : `${startDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} – ${endDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}`;

  return (
    <div className={`bg-card border rounded-xl p-4 transition-colors hover:shadow-sm ${URGENCY_BORDER[urgency]}`}>
      {/* Rank + header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-mono text-muted-foreground flex-shrink-0">#{rank}</span>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">{session.request.client.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{session.theme.code} · {session.theme.label}</p>
          </div>
        </div>
        <StatusBadge status={dossierStatus} />
      </div>

      {/* Deadline badge — prominently displayed */}
      <div className="mb-3">
        <UrgencyBadge urgency={urgency} deadlineDate={deadlineDate} />
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mb-3">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3 flex-shrink-0" />
          Formation : {dateRange}
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

      {/* Footer */}
      <div className="flex items-center justify-between gap-3">
        <StockIndicator available={stockOk} />
        {dossierStatus === "EN_ATTENTE" && <StartButton sessionId={session.id} />}
        {dossierStatus === "PRET" && session.dossier?.pickupType && (
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <PackageCheck className="h-3.5 w-3.5 text-emerald-500" />
            {PICKUP_TYPE_LABELS[session.dossier.pickupType]}
          </span>
        )}
      </div>

      {dossierStatus === "EN_PREPARATION" && <CompleteForm session={session} />}
    </div>
  );
}

// ─── KPI strip ────────────────────────────────────────────────────────────────

function KpiStrip({ sessions }: { sessions: SessionWithDossier[] }) {
  const enAttente = sessions.filter((s) => getDossierStatus(s) === "EN_ATTENTE").length;
  const enPrep = sessions.filter((s) => getDossierStatus(s) === "EN_PREPARATION").length;
  const prets = sessions.filter((s) => getDossierStatus(s) === "PRET").length;
  const overdue = sessions.filter((s) => getUrgency(s) === "OVERDUE").length;
  const stockKo = sessions.filter((s) => !isStockAvailable(s)).length;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "En attente", value: enAttente, color: "text-muted-foreground", icon: Clock },
          { label: "En préparation", value: enPrep, color: "text-blue-600 dark:text-blue-400", icon: FolderOpen },
          { label: "Prêts", value: prets, color: "text-emerald-600 dark:text-emerald-400", icon: CheckCircle2 },
          { label: "J-1 dépassé", value: overdue, color: overdue > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground", icon: AlertCircle },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`h-4 w-4 ${color}`} />
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
            <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
          </div>
        ))}
      </div>
      {stockKo > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {stockKo} session{stockKo > 1 ? "s" : ""} avec stock insuffisant — vérifier les réservations.
        </div>
      )}
    </div>
  );
}

// ─── Filter tabs ──────────────────────────────────────────────────────────────

type FilterTab = "TOUS" | DossierStatus;

function FilterTabs({ active, counts }: { active: FilterTab; counts: Record<FilterTab, number> }) {
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
            active === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {label}
          <span className={`text-[10px] tabular-nums ${active === key ? "text-muted-foreground" : "text-muted-foreground/50"}`}>
            {counts[key]}
          </span>
        </a>
      ))}
    </div>
  );
}

// ─── Priority section headers ─────────────────────────────────────────────────

function PriorityDivider({ label, count, color }: { label: string; count: number; color: string }) {
  if (count === 0) return null;
  return (
    <div className={`flex items-center gap-2 py-1 ${color}`}>
      <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      <span className="text-xs font-medium opacity-70">({count})</span>
      <div className="flex-1 h-px bg-current opacity-20" />
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

  // Include sessions up to 3 days past their start to catch missed J-1 deadlines
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 3);

  const sessions = (await db.trainingSession.findMany({
    where: {
      status: "CONFIRMEE",
      startDate: { gte: cutoff },
    },
    include: {
      dossier: {
        include: {
          checkItems: {
            include: { dossierItem: true },
            orderBy: { dossierItem: { order: "asc" } },
          },
        },
      },
      trainer: { select: { id: true, fullName: true, email: true } },
      theme: {
        select: {
          id: true,
          label: true,
          code: true,
          consumables: { include: { consumable: true } },
          dossierItems: { orderBy: { order: "asc" } },
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

  // Sort by priority band first, then by startDate within each band
  const sorted = [...sessions].sort((a, b) => {
    const pa = getPriority(a);
    const pb = getPriority(b);
    if (pa !== pb) return pa - pb;
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
  });

  // Filter by tab
  const filtered =
    activeFilter === "TOUS"
      ? sorted
      : sorted.filter((s) => getDossierStatus(s) === activeFilter);

  const counts: Record<FilterTab, number> = {
    TOUS: sessions.length,
    EN_ATTENTE: sessions.filter((s) => getDossierStatus(s) === "EN_ATTENTE").length,
    EN_PREPARATION: sessions.filter((s) => getDossierStatus(s) === "EN_PREPARATION").length,
    PRET: sessions.filter((s) => getDossierStatus(s) === "PRET").length,
  };

  // Group for section headers (only in "Tous" view)
  const overdue = filtered.filter((s) => getUrgency(s) === "OVERDUE");
  const urgent  = filtered.filter((s) => getUrgency(s) === "URGENT");
  const soon    = filtered.filter((s) => getUrgency(s) === "SOON");
  const ok      = filtered.filter((s) => getUrgency(s) === "OK");
  const done    = filtered.filter((s) => getUrgency(s) === "DONE");

  const showGroups = activeFilter === "TOUS";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dossiers de formation</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sessions confirmées — classées par urgence J-1 (à préparer la veille de la formation)
        </p>
      </div>

      <KpiStrip sessions={sessions} />

      <FilterTabs active={activeFilter as FilterTab} counts={counts} />

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-card border border-border rounded-xl gap-3">
          <CheckCircle2 className="h-10 w-10 text-emerald-500/40" />
          <p className="text-muted-foreground text-sm">
            {activeFilter === "TOUS" ? "Aucune session confirmée à venir." : "Aucun dossier dans cette catégorie."}
          </p>
        </div>
      ) : showGroups ? (
        <div className="space-y-6">
          {overdue.length > 0 && (
            <div className="space-y-3">
              <PriorityDivider label="En retard — J-1 dépassé" count={overdue.length} color="text-red-600 dark:text-red-400" />
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {overdue.map((s, i) => <SessionCard key={s.id} session={s} rank={i + 1} />)}
              </div>
            </div>
          )}
          {urgent.length > 0 && (
            <div className="space-y-3">
              <PriorityDivider label="Urgent — moins de 24 h" count={urgent.length} color="text-orange-600 dark:text-orange-400" />
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {urgent.map((s, i) => <SessionCard key={s.id} session={s} rank={overdue.length + i + 1} />)}
              </div>
            </div>
          )}
          {soon.length > 0 && (
            <div className="space-y-3">
              <PriorityDivider label="À préparer bientôt" count={soon.length} color="text-amber-600 dark:text-amber-400" />
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {soon.map((s, i) => <SessionCard key={s.id} session={s} rank={overdue.length + urgent.length + i + 1} />)}
              </div>
            </div>
          )}
          {ok.length > 0 && (
            <div className="space-y-3">
              <PriorityDivider label="Planifiés" count={ok.length} color="text-muted-foreground" />
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {ok.map((s, i) => <SessionCard key={s.id} session={s} rank={overdue.length + urgent.length + soon.length + i + 1} />)}
              </div>
            </div>
          )}
          {done.length > 0 && (
            <div className="space-y-3">
              <PriorityDivider label="Prêts" count={done.length} color="text-emerald-600 dark:text-emerald-400" />
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {done.map((s, i) => <SessionCard key={s.id} session={s} rank={overdue.length + urgent.length + soon.length + ok.length + i + 1} />)}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((s, i) => <SessionCard key={s.id} session={s} rank={i + 1} />)}
        </div>
      )}
    </div>
  );
}
