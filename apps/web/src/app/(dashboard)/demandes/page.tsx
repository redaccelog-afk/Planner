import { db } from "@ccelog/db";
import Link from "next/link";
import { RefreshCw, AlertCircle, Clock, CheckCircle, XCircle, Archive, Workflow, ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { InboxSyncButton } from "@/components/demandes/inbox-sync-button";
import { NewRequestModal } from "@/components/demandes/new-request-modal";
import { TriggerPipelineButton } from "@/components/demandes/trigger-pipeline-button";

export const metadata = { title: "Demandes de formation" };

const STATUS_CONFIG = {
  NOUVELLE:                        { label: "Nouvelle",                icon: AlertCircle,   className: "text-blue-400 bg-blue-500/10",    dot: "bg-blue-400" },
  EN_ATTENTE_VALIDATION_FORMATEUR: { label: "En attente formateur",   icon: Clock,         className: "text-purple-400 bg-purple-500/10", dot: "bg-purple-400" },
  VALIDEE_FORMATEUR:               { label: "Validée formateur",      icon: CheckCircle,   className: "text-teal-400 bg-teal-500/10",     dot: "bg-teal-400" },
  EN_ATTENTE_VALIDATION_BO:        { label: "En attente Back Office", icon: Clock,         className: "text-orange-400 bg-orange-500/10", dot: "bg-orange-400" },
  EN_RECHERCHE:                    { label: "En recherche",            icon: RefreshCw,     className: "text-purple-400 bg-purple-500/10", dot: "bg-purple-400" },
  PROPOSEE:                        { label: "Proposée",                icon: Clock,         className: "text-yellow-400 bg-yellow-500/10", dot: "bg-yellow-400" },
  CONFIRMEE:                       { label: "Confirmée",               icon: CheckCircle,   className: "text-green-400 bg-green-500/10",  dot: "bg-green-400" },
  TERMINEE:                        { label: "Terminée",                icon: Archive,       className: "text-gray-400 bg-gray-500/10",    dot: "bg-gray-400" },
  ANNULEE:                         { label: "Annulée",                 icon: XCircle,       className: "text-red-400 bg-red-500/10",      dot: "bg-red-400" },
  CLOTUREE:                        { label: "Clôturée",                icon: Archive,       className: "text-gray-400 bg-gray-500/10",    dot: "bg-gray-400" },
} as const;

const URGENCY_LABEL = ["Normal", "Assez urgent", "Urgent", "Très urgent"];
const URGENCY_COLOR = ["text-muted-foreground", "text-yellow-400", "text-orange-400", "text-red-400"];

const KPI_STATUSES = ["NOUVELLE", "EN_ATTENTE_VALIDATION_FORMATEUR", "VALIDEE_FORMATEUR", "EN_ATTENTE_VALIDATION_BO", "CONFIRMEE"] as const;

const WORKFLOW_STEPS = [
  { key: "NOUVELLE",                        label: "Création" },
  { key: "EN_ATTENTE_VALIDATION_FORMATEUR", label: "Attente formateur" },
  { key: "VALIDEE_FORMATEUR",               label: "Validée formateur" },
  { key: "EN_ATTENTE_VALIDATION_BO",        label: "Attente BO" },
  { key: "CONFIRMEE",                       label: "Confirmée" },
  { key: "TERMINEE",                        label: "Terminée" },
] as const;

export default async function DemandesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; theme?: string }>;
}) {
  const params = await searchParams;
  const statusFilter = params.status as keyof typeof STATUS_CONFIG | undefined;
  const themeFilter = params.theme as string | undefined;

  // Récupère les thèmes pour le filtre et le formulaire
  const allThemes = await db.theme.findMany({
    where: { active: true },
    select: { id: true, code: true, label: true, durationDays: true },
    orderBy: { code: "asc" },
  });

  // Récupère clients et sites pour le formulaire
  const allClients = await db.client.findMany({
    where: { active: true },
    select: { id: true, name: true, sites: { where: { active: true }, select: { id: true, label: true, city: true } } },
    orderBy: { name: "asc" },
  });

  // Filtre demandes
  const requests = await db.trainingRequest.findMany({
    where: {
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(themeFilter ? { themes: { some: { theme: { code: themeFilter } } } } : {}),
    },
    include: {
      client: true,
      site: true,
      themes: { include: { theme: true } },
      sessions: { select: { id: true, status: true }, take: 1 },
    },
    orderBy: [{ urgency: "desc" }, { createdAt: "desc" }],
  });

  // Compteurs par statut (tous statuts, sans filtre)
  const counts = await db.trainingRequest.groupBy({
    by: ["status"],
    _count: true,
  });
  const countMap = Object.fromEntries(counts.map((c) => [c.status, c._count]));

  // Pipelines existants pour savoir quelles demandes ont déjà un pipeline
  const pipelineRequestIds = new Set(
    (
      await db.demandePipeline.findMany({
        where: { requestId: { not: null } },
        select: { requestId: true },
      })
    )
      .map((p) => p.requestId)
      .filter((id): id is string => id !== null)
  );

  // Pipelines pour afficher les liens
  const pipelinesMap = Object.fromEntries(
    (
      await db.demandePipeline.findMany({
        where: { requestId: { in: requests.map((r) => r.id) } },
        select: { id: true, requestId: true, status: true },
      })
    ).map((p) => [p.requestId, p])
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Demandes de formation</h1>
          <p className="text-sm text-muted-foreground mt-1">{requests.length} demande(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <InboxSyncButton />
          <NewRequestModal clients={allClients} themes={allThemes} />
        </div>
      </div>

      {/* Workflow CDC — chaîne de validation */}
      <div className="flex flex-wrap items-center gap-1 bg-card border border-border rounded-xl px-4 py-3">
        <span className="text-xs font-medium text-muted-foreground mr-2 flex-shrink-0">Workflow CDC :</span>
        {WORKFLOW_STEPS.map((step, i) => {
          const isActive = statusFilter === step.key;
          const cfg = STATUS_CONFIG[step.key as keyof typeof STATUS_CONFIG];
          return (
            <span key={step.key} className="flex items-center gap-1">
              <Link
                href={`/demandes?status=${step.key}`}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  isActive ? cfg.className + " ring-1 ring-current" : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {step.label}
              </Link>
              {i < WORKFLOW_STEPS.length - 1 && (
                <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              )}
            </span>
          );
        })}
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {KPI_STATUSES.map((s) => {
          const cfg = STATUS_CONFIG[s];
          const StatusIcon = cfg.icon;
          const count = countMap[s] ?? 0;
          return (
            <Link
              key={s}
              href={`/demandes?status=${s}`}
              className={`flex items-center gap-3 bg-card border rounded-xl px-4 py-3 transition-colors hover:border-primary/40 ${statusFilter === s ? "border-primary/50" : "border-border"}`}
            >
              <div className={`p-2 rounded-lg ${cfg.className}`}>
                <StatusIcon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground leading-none">{count}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{cfg.label}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Filtres statut + thème */}
      <div className="flex flex-wrap gap-2 items-center">
        <Link
          href="/demandes"
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            !statusFilter && !themeFilter
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          Toutes
        </Link>
        {(Object.keys(STATUS_CONFIG) as Array<keyof typeof STATUS_CONFIG>).map((status) => {
          const cfg = STATUS_CONFIG[status];
          const count = countMap[status] ?? 0;
          return (
            <Link
              key={status}
              href={`/demandes?status=${status}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                statusFilter === status ? cfg.className : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label} ({count})
            </Link>
          );
        })}

        {/* Filtre thème */}
        {allThemes.length > 0 && (
          <div className="h-5 border-l border-border mx-1" />
        )}
        {allThemes.map((t) => (
          <Link
            key={t.code}
            href={`/demandes?theme=${t.code}`}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              themeFilter === t.code
                ? "bg-primary/10 text-primary border border-primary/30"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.code}
          </Link>
        ))}
      </div>

      {/* Liste */}
      <div className="space-y-3">
        {requests.map((req) => {
          const cfg = STATUS_CONFIG[req.status];
          const StatusIcon = cfg.icon;
          const pipeline = pipelinesMap[req.id];
          const hasPipeline = pipelineRequestIds.has(req.id);
          const canTriggerPipeline =
            (req.status === "NOUVELLE" || req.status === "EN_RECHERCHE") && !hasPipeline;

          return (
            <div
              key={req.id}
              className="flex items-center gap-4 bg-card border border-border rounded-xl px-6 py-4 hover:border-primary/50 transition-colors group"
            >
              {/* Statut */}
              <div className={`p-2 rounded-lg flex-shrink-0 ${cfg.className}`}>
                <StatusIcon className="h-4 w-4" />
              </div>

              {/* Info principale */}
              <Link href={`/demandes/${req.id}`} className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground truncate">{req.client.name}</p>
                  {req.urgency > 0 && (
                    <span className={`text-xs font-medium ${URGENCY_COLOR[req.urgency]}`}>
                      ⚡ {URGENCY_LABEL[req.urgency]}
                    </span>
                  )}
                  {pipeline && (
                    <Link
                      href="/pipeline"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-500/10 text-purple-400 rounded text-[10px] border border-purple-500/20 hover:bg-purple-500/20 transition-colors"
                    >
                      <Workflow className="h-2.5 w-2.5" />
                      Pipeline
                    </Link>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {req.site.city} · {req.participants} participant(s)
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {req.themes.map((rt) => (
                    <span key={rt.themeId} className="px-1.5 py-0.5 bg-secondary text-xs text-muted-foreground rounded">
                      {rt.theme.code}
                    </span>
                  ))}
                </div>
              </Link>

              {/* Dates souhaitées */}
              {(req.desiredDateFrom || req.desiredDateTo) && (
                <div className="text-right flex-shrink-0 hidden sm:block">
                  <p className="text-xs text-muted-foreground">Période souhaitée</p>
                  <p className="text-sm text-foreground">
                    {req.desiredDateFrom ? formatDate(req.desiredDateFrom) : "—"}
                    {req.desiredDateTo && ` → ${formatDate(req.desiredDateTo)}`}
                  </p>
                </div>
              )}

              {/* Date création */}
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-muted-foreground">Reçue le</p>
                <p className="text-sm text-foreground">{formatDate(req.createdAt)}</p>
              </div>

              {/* Bouton pipeline */}
              {canTriggerPipeline && (
                <div className="flex-shrink-0">
                  <TriggerPipelineButton requestId={req.id} />
                </div>
              )}
            </div>
          );
        })}

        {requests.length === 0 && (
          <div className="text-center py-16 bg-card border border-border rounded-xl">
            <p className="text-muted-foreground">
              Aucune demande{statusFilter ? ` avec ce statut` : themeFilter ? ` pour ce thème` : ""}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
