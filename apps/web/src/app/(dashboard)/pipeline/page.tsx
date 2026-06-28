import { db } from "@ccelog/db";
import { PipelineStatus, IntakeChannel } from "@ccelog/db";
import {
  Mail, MessageCircle, Phone, Send, CheckCircle2, XCircle,
  AlertCircle, Clock, Zap, ArrowRight, Users, RefreshCw
} from "lucide-react";
import Link from "next/link";
import { validateTrainersAction, confirmDatesAction, cancelPipelineAction } from "./actions";

export const metadata = { title: "Pipeline de demandes" };
export const revalidate = 10; // revalide toutes les 10s

// ── Icônes et couleurs ─────────────────────────────────────────────

const CHANNEL_ICON: Record<IntakeChannel, React.ReactNode> = {
  EMAIL:    <Mail className="h-3.5 w-3.5" />,
  WHATSAPP: <MessageCircle className="h-3.5 w-3.5" />,
  SMS:      <Phone className="h-3.5 w-3.5" />,
  TELEGRAM: <Send className="h-3.5 w-3.5" />,
};

const CHANNEL_COLOR: Record<IntakeChannel, string> = {
  EMAIL:    "bg-blue-500/10 text-blue-400 border-blue-500/20",
  WHATSAPP: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  SMS:      "bg-violet-500/10 text-violet-400 border-violet-500/20",
  TELEGRAM: "bg-sky-500/10 text-sky-400 border-sky-500/20",
};

const STATUS_CONFIG: Record<PipelineStatus, { label: string; color: string; icon: React.ReactNode }> = {
  RECEIVED:           { label: "Reçue",             color: "text-muted-foreground", icon: <Clock className="h-3.5 w-3.5" /> },
  PARSING:            { label: "Analyse IA…",       color: "text-amber-400",        icon: <Zap className="h-3.5 w-3.5 animate-pulse" /> },
  PARSED:             { label: "⚡ À valider",       color: "text-amber-400",        icon: <AlertCircle className="h-3.5 w-3.5" /> },
  TRAINER_SELECTION:  { label: "⚡ Ordonner formateurs", color: "text-amber-400",   icon: <Users className="h-3.5 w-3.5" /> },
  CONTACTING_TRAINER: { label: "Contact formateur…", color: "text-blue-400",        icon: <RefreshCw className="h-3.5 w-3.5 animate-spin" /> },
  WAITING_PLANNER:    { label: "⚡ Confirmer dates", color: "text-amber-400",        icon: <AlertCircle className="h-3.5 w-3.5" /> },
  WAITING_CLIENT:     { label: "Attente client",     color: "text-sky-400",          icon: <Clock className="h-3.5 w-3.5" /> },
  CLIENT_CONFIRMED:   { label: "Client OK",          color: "text-emerald-400",      icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  COMPLETED:          { label: "Terminé ✓",          color: "text-emerald-400",      icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  FAILED:             { label: "Échoué",             color: "text-red-400",          icon: <XCircle className="h-3.5 w-3.5" /> },
  CANCELLED:          { label: "Annulé",             color: "text-muted-foreground", icon: <XCircle className="h-3.5 w-3.5" /> },
};

// Statuts nécessitant une action planner
const ACTION_REQUIRED: PipelineStatus[] = ["PARSED", "TRAINER_SELECTION", "WAITING_PLANNER"];

export default async function PipelinePage() {
  const pipelines = await db.demandePipeline.findMany({
    include: {
      candidates: {
        include: { trainer: { select: { id: true, fullName: true, phone: true, type: true } } },
        orderBy: { rank: "asc" },
      },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: [
      { status: "asc" }, // PARSED / WAITING_PLANNER d'abord
      { createdAt: "desc" },
    ],
  });

  const actionRequired = pipelines.filter((p) => ACTION_REQUIRED.includes(p.status));
  const active = pipelines.filter((p) => !ACTION_REQUIRED.includes(p.status) && !["COMPLETED", "FAILED", "CANCELLED"].includes(p.status));
  const archived = pipelines.filter((p) => ["COMPLETED", "FAILED", "CANCELLED"].includes(p.status));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pipeline de demandes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {actionRequired.length > 0 && (
              <span className="text-amber-400 font-medium">{actionRequired.length} action(s) requise(s) · </span>
            )}
            {active.length} en cours · {archived.length} archivé(s)
          </p>
        </div>
        {/* Canaux actifs */}
        <div className="flex items-center gap-2 text-xs">
          {(["EMAIL", "WHATSAPP", "SMS", "TELEGRAM"] as IntakeChannel[]).map((c) => (
            <span key={c} className={`flex items-center gap-1 px-2 py-1 rounded-full border ${CHANNEL_COLOR[c]}`}>
              {CHANNEL_ICON[c]} {c}
            </span>
          ))}
        </div>
      </div>

      {/* Section actions requises */}
      {actionRequired.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Actions requises ({actionRequired.length})
          </h2>
          <div className="space-y-3">
            {actionRequired.map((p) => (
              <PipelineCard key={p.id} pipeline={p} highlighted />
            ))}
          </div>
        </section>
      )}

      {/* Section actifs */}
      {active.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">En cours ({active.length})</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {active.map((p) => (
              <PipelineCard key={p.id} pipeline={p} />
            ))}
          </div>
        </section>
      )}

      {/* Section archivée */}
      {archived.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Archivés ({archived.length})</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 opacity-70">
            {archived.slice(0, 12).map((p) => (
              <PipelineCard key={p.id} pipeline={p} compact />
            ))}
          </div>
        </section>
      )}

      {pipelines.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">Aucune demande dans le pipeline.</p>
          <p className="text-sm mt-1">Les demandes reçues par Email, WhatsApp, SMS ou Telegram apparaîtront ici automatiquement.</p>
        </div>
      )}
    </div>
  );
}

// ── Pipeline Card ──────────────────────────────────────────────────

type PipelineWithRelations = Awaited<ReturnType<typeof db.demandePipeline.findMany<{
  include: {
    candidates: { include: { trainer: { select: { id: true; fullName: true; phone: true; type: true } } }; orderBy: { rank: "asc" } };
    messages: { orderBy: { createdAt: "desc" }; take: 1 };
  };
}>>>[number];

function PipelineCard({
  pipeline: p,
  highlighted = false,
  compact = false,
}: {
  pipeline: PipelineWithRelations;
  highlighted?: boolean;
  compact?: boolean;
}) {
  const statusCfg = STATUS_CONFIG[p.status];
  const candidateWithDates = p.candidates.find((c) => c.status === "proposed_dates");
  const proposedDates = (candidateWithDates?.proposedDates as string[] | null) ?? [];

  return (
    <div className={`relative bg-card border rounded-xl p-4 space-y-3 transition-colors ${
      highlighted ? "border-amber-500/40 shadow-amber-500/5 shadow-lg" : "border-border hover:border-primary/30"
    }`}>
      {/* Stretched link covering the whole card — interactive children sit above it via z-10 */}
      <Link
        href={`/demandes/${p.id}`}
        className="absolute inset-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={`Voir la demande de ${p.parsedClientName ?? p.fromAddress}`}
      />

      {/* Top row */}
      <div className="relative z-10 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {/* Canal */}
            <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border ${CHANNEL_COLOR[p.channel]}`}>
              {CHANNEL_ICON[p.channel]} {p.channel}
            </span>
            {/* Statut */}
            <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${statusCfg.color}`}>
              {statusCfg.icon} {statusCfg.label}
            </span>
            {/* Urgence */}
            {(p.parsedUrgency ?? 0) >= 2 && (
              <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                URGENT
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-foreground truncate">
            {p.parsedClientName ?? p.fromAddress}
          </p>
          <p className="text-xs text-muted-foreground">
            {p.parsedThemeCode ?? p.parsedThemeLabel ?? "Thème en cours d'analyse"}
            {p.parsedDateFrom && ` · ${new Date(p.parsedDateFrom).toLocaleDateString("fr-FR")}`}
            {p.parsedParticipants && ` · ${p.parsedParticipants} participants`}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[10px] text-muted-foreground">
            {new Date(p.createdAt).toLocaleDateString("fr-FR")}
          </p>
          {p.aiConfidence !== null && p.aiConfidence !== undefined && (
            <p className="text-[10px] text-muted-foreground">
              IA: {Math.round(p.aiConfidence * 100)}%
            </p>
          )}
        </div>
      </div>

      {/* Message brut (compact=false) */}
      {!compact && (
        <p className="relative z-10 text-xs text-muted-foreground bg-secondary/50 rounded-lg px-3 py-2 line-clamp-2 italic">
          "{p.rawMessage.slice(0, 120)}{p.rawMessage.length > 120 ? "…" : ""}"
        </p>
      )}

      {/* Liste formateurs */}
      {!compact && p.candidates.length > 0 && (
        <div className="relative z-10 space-y-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Formateurs ({p.candidates.length})</p>
          {p.candidates.slice(0, 3).map((c) => (
            <div key={c.id} className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground w-4 text-center font-mono">#{c.rank}</span>
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                c.status === "accepted" ? "bg-emerald-400" :
                c.status === "declined" ? "bg-red-400" :
                c.status === "contacted" ? "bg-blue-400 animate-pulse" :
                c.status === "proposed_dates" ? "bg-amber-400" :
                "bg-muted"
              }`} />
              <span className="text-foreground font-medium flex-1 truncate">{c.trainer.fullName}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                c.trainer.type === "INTERNE" ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-400"
              }`}>{c.trainer.type === "INTERNE" ? "INT" : "EXT"}</span>
            </div>
          ))}
          {p.candidates.length > 3 && (
            <p className="text-[10px] text-muted-foreground pl-6">+{p.candidates.length - 3} autre(s)</p>
          )}
        </div>
      )}

      {/* Dates proposées par formateur */}
      {proposedDates.length > 0 && (
        <div className="relative z-10 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">
          <p className="text-[10px] font-semibold text-amber-400 mb-1">Dates proposées par {candidateWithDates?.trainer.fullName}</p>
          <div className="flex flex-wrap gap-1">
            {proposedDates.map((d) => (
              <span key={d} className="text-xs bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded">
                {new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {!compact && (
        <div className="relative z-10">
          <PipelineActions pipeline={p} proposedDates={proposedDates} />
        </div>
      )}
    </div>
  );
}

// ── Actions selon l'état ───────────────────────────────────────────

function PipelineActions({
  pipeline: p,
  proposedDates,
}: {
  pipeline: PipelineWithRelations;
  proposedDates: string[];
}) {
  if (p.status === "PARSED" || p.status === "TRAINER_SELECTION") {
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Validez l'ordre de contact des formateurs puis lancez le pipeline.
        </p>
        <form action={validateTrainersAction} className="flex gap-2">
          <input type="hidden" name="pipelineId" value={p.id} />
          <input
            type="hidden"
            name="trainerOrder"
            value={p.candidates.map((c) => c.trainerId).join(",")}
          />
          <button
            type="submit"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            Valider et contacter formateur #1
          </button>
          <form action={cancelPipelineAction}>
            <input type="hidden" name="pipelineId" value={p.id} />
            <button type="submit" className="px-3 py-2 text-xs text-muted-foreground hover:text-red-400 transition-colors">
              Annuler
            </button>
          </form>
        </form>
      </div>
    );
  }

  if (p.status === "WAITING_PLANNER" && proposedDates.length > 0) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Choisissez une date à proposer au client :</p>
        <div className="flex flex-wrap gap-2">
          {proposedDates.map((d) => (
            <form key={d} action={confirmDatesAction}>
              <input type="hidden" name="pipelineId" value={p.id} />
              <input type="hidden" name="confirmedDate" value={d} />
              <button
                type="submit"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-medium hover:bg-emerald-500/20 transition-colors"
              >
                <CheckCircle2 className="h-3 w-3" />
                {new Date(d).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
              </button>
            </form>
          ))}
        </div>
      </div>
    );
  }

  if (p.status === "CONTACTING_TRAINER") {
    const current = p.candidates[p.currentTrainerIndex];
    return (
      <p className="text-xs text-blue-400 flex items-center gap-1.5">
        <RefreshCw className="h-3 w-3 animate-spin" />
        En attente de réponse de {current?.trainer.fullName ?? "…"}
      </p>
    );
  }

  if (p.status === "WAITING_CLIENT") {
    return (
      <p className="text-xs text-sky-400 flex items-center gap-1.5">
        <Clock className="h-3 w-3" />
        Message envoyé au client, en attente de confirmation.
      </p>
    );
  }

  if (p.status === "FAILED") {
    return (
      <p className="text-xs text-red-400 flex items-center gap-1.5">
        <XCircle className="h-3 w-3" />
        {p.errorReason ?? "Pipeline échoué"}
      </p>
    );
  }

  if (p.status === "COMPLETED" && p.sessionId) {
    return (
      <Link
        href={`/sessions/${p.sessionId}`}
        className="text-xs text-emerald-400 flex items-center gap-1.5 hover:underline"
      >
        <CheckCircle2 className="h-3 w-3" />
        Session créée → voir le détail
      </Link>
    );
  }

  return null;
}
