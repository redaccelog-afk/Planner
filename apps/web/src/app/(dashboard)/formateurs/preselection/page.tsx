import type { ReactNode } from "react";
import { db } from "@ccelog/db";
import { PreselectionStatus } from "@ccelog/db";
import { UserPlus, CheckCircle2, XCircle, Clock, Star, ChevronRight } from "lucide-react";
import Link from "next/link";
import { addCandidateAction, updateStatusAction } from "./actions";

export const metadata = { title: "Présélection formateurs" };

const COLUMNS: { status: PreselectionStatus; label: string; color: string; icon: ReactNode }[] = [
  {
    status: "CANDIDAT",
    label: "Candidats",
    color: "border-blue-500/30 bg-blue-500/5",
    icon: <Clock className="h-4 w-4 text-blue-400" />,
  },
  {
    status: "EN_EVALUATION",
    label: "En évaluation",
    color: "border-amber-500/30 bg-amber-500/5",
    icon: <Star className="h-4 w-4 text-amber-400" />,
  },
  {
    status: "ACCEPTE",
    label: "Acceptés",
    color: "border-emerald-500/30 bg-emerald-500/5",
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
  },
  {
    status: "REFUSE",
    label: "Refusés",
    color: "border-red-500/30 bg-red-500/5",
    icon: <XCircle className="h-4 w-4 text-red-400" />,
  },
];

export default async function PreselectionPage() {
  const preselections = await db.preselection.findMany({
    include: {
      trainer: {
        include: {
          themes: { include: { theme: true } },
          rates: { orderBy: { validFrom: "desc" }, take: 1 },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Group by status
  const byStatus = Object.fromEntries(
    COLUMNS.map((col) => [col.status, preselections.filter((p) => p.status === col.status)])
  ) as Record<PreselectionStatus, typeof preselections>;

  const totalActive = byStatus.CANDIDAT.length + byStatus.EN_EVALUATION.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link href="/formateurs" className="hover:text-foreground transition-colors">
              Formateurs
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span>Présélection</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Pipeline de présélection</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalActive} candidat(s) en cours · {byStatus.ACCEPTE.length} accepté(s) · {byStatus.REFUSE.length} refusé(s)
          </p>
        </div>

        {/* Add candidate form (inline) */}
        <AddCandidateDialog />
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map((col) => (
          <div key={col.status} className={`border rounded-xl p-4 ${col.color}`}>
            {/* Column header */}
            <div className="flex items-center gap-2 mb-4">
              {col.icon}
              <span className="font-semibold text-sm text-foreground">{col.label}</span>
              <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-card border border-border text-muted-foreground">
                {byStatus[col.status].length}
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-3">
              {byStatus[col.status].map((pre) => (
                <PreselectionCard key={pre.id} preselection={pre} />
              ))}

              {byStatus[col.status].length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">
                  Aucun candidat
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Card component ────────────────────────────────────────────────────────────

type PreselectionWithRelations = Awaited<ReturnType<typeof db.preselection.findMany<{
  include: {
    trainer: { include: { themes: { include: { theme: true } }; rates: true } };
  };
}>>>[number];

function PreselectionCard({ preselection }: { preselection: PreselectionWithRelations }) {
  const { trainer, status, evaluationScore, source, createdAt } = preselection;
  const lastRate = trainer.rates[0];

  return (
    <div className="bg-card border border-border rounded-lg p-3 space-y-2 hover:border-primary/50 transition-colors">
      {/* Name + type */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-sm text-foreground leading-tight">{trainer.fullName}</p>
          <p className="text-xs text-muted-foreground">{trainer.city}</p>
        </div>
        {evaluationScore !== null && evaluationScore !== undefined && (
          <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
            {evaluationScore}/100
          </span>
        )}
      </div>

      {/* Themes */}
      <div className="flex flex-wrap gap-1">
        {trainer.themes.slice(0, 2).map((tt) => (
          <span key={tt.themeId} className="text-[10px] px-1.5 py-0.5 bg-secondary rounded text-muted-foreground">
            {tt.theme.code}
          </span>
        ))}
        {trainer.themes.length > 2 && (
          <span className="text-[10px] text-muted-foreground">+{trainer.themes.length - 2}</span>
        )}
      </div>

      {/* Rate + source */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {lastRate ? (
          <span>{lastRate.ratePerDay.toLocaleString("fr-MA")} MAD/j</span>
        ) : trainer.defaultDayRate ? (
          <span>{trainer.defaultDayRate.toLocaleString("fr-MA")} MAD/j</span>
        ) : (
          <span>Tarif non défini</span>
        )}
        {source && <span className="capitalize">{source}</span>}
      </div>

      {/* Actions */}
      <div className="pt-1 border-t border-border flex gap-1">
        {status === "CANDIDAT" && (
          <MoveButton preselectionId={preselection.id} nextStatus="EN_EVALUATION" label="Évaluer →" />
        )}
        {status === "EN_EVALUATION" && (
          <>
            <MoveButton preselectionId={preselection.id} nextStatus="ACCEPTE" label="Accepter" accent="success" />
            <MoveButton preselectionId={preselection.id} nextStatus="REFUSE" label="Refuser" accent="danger" />
          </>
        )}
        {(status === "ACCEPTE" || status === "REFUSE") && (
          <span className="text-[10px] text-muted-foreground">
            {new Date(createdAt).toLocaleDateString("fr-FR")}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Move button (server action form) ─────────────────────────────────────────

function MoveButton({
  preselectionId,
  nextStatus,
  label,
  accent = "default",
}: {
  preselectionId: string;
  nextStatus: PreselectionStatus;
  label: string;
  accent?: "default" | "success" | "danger";
}) {
  const colorMap = {
    default: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    success: "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20",
    danger: "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20",
  };

  return (
    <form action={updateStatusAction}>
      <input type="hidden" name="id" value={preselectionId} />
      <input type="hidden" name="status" value={nextStatus} />
      <button
        type="submit"
        className={`text-[10px] font-medium px-2 py-1 rounded transition-colors ${colorMap[accent]}`}
      >
        {label}
      </button>
    </form>
  );
}

// ── Add candidate dialog ──────────────────────────────────────────────────────

function AddCandidateDialog() {
  return (
    <details className="relative">
      <summary className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer list-none">
        <UserPlus className="h-4 w-4" />
        Nouveau candidat
      </summary>
      <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-xl p-4 z-10">
        <h3 className="font-semibold text-sm mb-3">Ajouter un candidat formateur</h3>
        <form action={addCandidateAction} className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Nom complet *</label>
            <input
              name="fullName"
              required
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Mohammed Alaoui"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Téléphone WhatsApp *</label>
            <input
              name="phone"
              required
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="+212600000000"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Email</label>
            <input
              name="email"
              type="email"
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="formateur@email.com"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Ville *</label>
            <input
              name="city"
              required
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Casablanca"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Tarif journalier (MAD)</label>
            <input
              name="defaultDayRate"
              type="number"
              min="0"
              step="50"
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="1500"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Source</label>
            <select
              name="source"
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">— Choisir —</option>
              <option value="prospection">Prospection</option>
              <option value="candidature">Candidature spontanée</option>
              <option value="recommandation">Recommandation</option>
              <option value="linkedin">LinkedIn</option>
            </select>
          </div>
          <button
            type="submit"
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Ajouter le candidat
          </button>
        </form>
      </div>
    </details>
  );
}
