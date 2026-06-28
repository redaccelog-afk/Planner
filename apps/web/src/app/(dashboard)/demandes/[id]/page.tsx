import { db } from "@ccelog/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  Calendar,
  MapPin,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Archive,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { MatchingPanel } from "@/components/demandes/matching-panel";
import { WorkflowActionButton } from "@/components/demandes/workflow-action-button";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const req = await db.trainingRequest.findUnique({ where: { id }, include: { client: true } });
  return { title: req ? `Demande — ${req.client.name}` : "Demande introuvable" };
}

const STATUS_CONFIG = {
  NOUVELLE:                        { label: "Nouvelle",                icon: AlertCircle,  className: "text-blue-400 bg-blue-500/10",    dot: "bg-blue-400",    step: 0 },
  EN_ATTENTE_VALIDATION_FORMATEUR: { label: "En attente formateur",   icon: Clock,        className: "text-purple-400 bg-purple-500/10", dot: "bg-purple-400",  step: 1 },
  VALIDEE_FORMATEUR:               { label: "Validée formateur",      icon: CheckCircle,  className: "text-teal-400 bg-teal-500/10",     dot: "bg-teal-400",    step: 2 },
  EN_ATTENTE_VALIDATION_BO:        { label: "En attente Back Office", icon: Clock,        className: "text-orange-400 bg-orange-500/10", dot: "bg-orange-400",  step: 3 },
  EN_RECHERCHE:                    { label: "En recherche",            icon: RefreshCw,    className: "text-purple-400 bg-purple-500/10", dot: "bg-purple-400",  step: -1 },
  PROPOSEE:                        { label: "Proposée",                icon: Clock,        className: "text-yellow-400 bg-yellow-500/10", dot: "bg-yellow-400",  step: -1 },
  CONFIRMEE:                       { label: "Confirmée",               icon: CheckCircle,  className: "text-green-400 bg-green-500/10",  dot: "bg-green-400",   step: 4 },
  TERMINEE:                        { label: "Terminée",                icon: Archive,      className: "text-gray-400 bg-gray-500/10",    dot: "bg-gray-400",    step: 5 },
  ANNULEE:                         { label: "Annulée",                 icon: XCircle,      className: "text-red-400 bg-red-500/10",      dot: "bg-red-400",     step: -1 },
  CLOTUREE:                        { label: "Clôturée",                icon: Archive,      className: "text-gray-400 bg-gray-500/10",    dot: "bg-gray-400",    step: -1 },
} as const;

const URGENCY_LABEL = ["Normal", "Assez urgent", "Urgent", "Très urgent"];
const URGENCY_COLOR = ["text-muted-foreground", "text-yellow-400", "text-orange-400", "text-red-400"];

const WORKFLOW_STEPS = [
  { key: "NOUVELLE",                        label: "Création" },
  { key: "EN_ATTENTE_VALIDATION_FORMATEUR", label: "Attente formateur" },
  { key: "VALIDEE_FORMATEUR",               label: "Validée formateur" },
  { key: "EN_ATTENTE_VALIDATION_BO",        label: "Attente BO" },
  { key: "CONFIRMEE",                       label: "Confirmée" },
  { key: "TERMINEE",                        label: "Terminée" },
] as const;

export default async function DemandeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const request = await db.trainingRequest.findUnique({
    where: { id },
    include: {
      client: { include: { contacts: true } },
      site: true,
      themes: { include: { theme: true } },
      sessions: {
        include: { trainer: true, theme: true },
        orderBy: { startDate: "asc" },
      },
      emailThread: {
        include: { messages: { orderBy: { receivedAt: "desc" }, take: 5 } },
      },
    },
  });

  if (!request) notFound();

  const cfg = STATUS_CONFIG[request.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.NOUVELLE;
  const StatusIcon = cfg.icon;
  const currentStep = cfg.step;

  // Determine available workflow actions
  const canSendToFormateur =
    request.status === "NOUVELLE" || request.status === "EN_RECHERCHE" || request.status === "PROPOSEE";
  const canValidateFormateur = request.status === "EN_ATTENTE_VALIDATION_FORMATEUR";
  const canValidateBO = request.status === "VALIDEE_FORMATEUR";
  const canTerminer = request.status === "CONFIRMEE";
  const canAnnuler = !["ANNULEE", "CLOTUREE", "TERMINEE"].includes(request.status);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Link href="/demandes" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Retour aux demandes
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.className}`}>
              <StatusIcon className="h-3.5 w-3.5" />
              {cfg.label}
            </span>
            {request.urgency > 0 && (
              <span className={`text-xs font-medium ${URGENCY_COLOR[request.urgency]}`}>
                ⚡ {URGENCY_LABEL[request.urgency]}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            <Link href={`/clients/${request.client.id}`} className="text-primary hover:underline font-medium">
              {request.client.name}
            </Link>
          </h1>
          <p className="text-muted-foreground mt-1">{request.site.city} · {request.site.label}</p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {canSendToFormateur && (
            <WorkflowActionButton
              requestId={request.id}
              targetStatus="EN_ATTENTE_VALIDATION_FORMATEUR"
              label="Envoyer au formateur"
              variant="purple"
            />
          )}
          {canValidateFormateur && (
            <WorkflowActionButton
              requestId={request.id}
              targetStatus="VALIDEE_FORMATEUR"
              label="Valider (formateur)"
              variant="teal"
            />
          )}
          {canValidateBO && (
            <WorkflowActionButton
              requestId={request.id}
              targetStatus="CONFIRMEE"
              label="Valider (Back Office)"
              variant="green"
            />
          )}
          {canTerminer && (
            <WorkflowActionButton
              requestId={request.id}
              targetStatus="TERMINEE"
              label="Marquer terminée"
              variant="gray"
            />
          )}
          {canAnnuler && (
            <WorkflowActionButton
              requestId={request.id}
              targetStatus="ANNULEE"
              label="Annuler"
              variant="red"
            />
          )}
        </div>
      </div>

      {/* Workflow progression */}
      <div className="bg-card border border-border rounded-xl px-4 py-3">
        <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Progression du workflow CDC</p>
        <div className="flex flex-wrap items-center gap-1">
          {WORKFLOW_STEPS.map((step, i) => {
            const stepCfg = STATUS_CONFIG[step.key as keyof typeof STATUS_CONFIG];
            const isActive = request.status === step.key;
            const isDone = currentStep > i && currentStep >= 0;
            return (
              <span key={step.key} className="flex items-center gap-1">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    isActive
                      ? stepCfg.className + " ring-1 ring-current font-semibold"
                      : isDone
                      ? "bg-green-500/10 text-green-500"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {isDone && !isActive && "✓ "}
                  {step.label}
                </span>
                {i < WORKFLOW_STEPS.length - 1 && (
                  <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                )}
              </span>
            );
          })}
        </div>
      </div>

      {/* Info cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <InfoCard icon={<Users className="h-4 w-4" />} label="Participants">
          <p className="text-2xl font-bold text-foreground">{request.participants}</p>
        </InfoCard>

        <InfoCard icon={<Calendar className="h-4 w-4" />} label="Période souhaitée">
          {request.desiredDateFrom ? (
            <>
              <p className="font-medium text-foreground">{formatDate(request.desiredDateFrom)}</p>
              {request.desiredDateTo && (
                <p className="text-sm text-muted-foreground">→ {formatDate(request.desiredDateTo)}</p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">Non précisée</p>
          )}
        </InfoCard>

        <InfoCard icon={<MapPin className="h-4 w-4" />} label="Site">
          <p className="font-medium text-foreground">{request.site.label}</p>
          <p className="text-sm text-muted-foreground">{request.site.address}</p>
        </InfoCard>
      </div>

      {/* Thèmes */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold text-foreground mb-4">Thèmes demandés</h2>
        <div className="flex flex-wrap gap-3">
          {request.themes.map((rt) => (
            <div key={rt.themeId} className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg">
              <span className="text-xs font-mono text-muted-foreground">{rt.theme.code}</span>
              <span className="text-sm text-foreground">{rt.theme.label}</span>
              <span className="text-xs text-muted-foreground">{rt.theme.durationDays}j</span>
            </div>
          ))}
        </div>
      </div>

      {/* Contacts client */}
      {request.client.contacts.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold text-foreground mb-4">Contacts client</h2>
          <div className="space-y-2">
            {request.client.contacts.map((contact) => (
              <div key={contact.id} className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">{contact.name}</p>
                  {contact.role && <p className="text-xs text-muted-foreground">{contact.role}</p>}
                </div>
                <div className="text-right">
                  {contact.email && <p className="text-xs text-muted-foreground">{contact.email}</p>}
                  {contact.phone && <p className="text-xs text-muted-foreground">{contact.phone}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Extraction IA */}
      {request.aiExtracted && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold text-foreground mb-2">Extraction IA</h2>
          <p className="text-xs text-muted-foreground mb-3">Données extraites automatiquement du message source</p>
          <pre className="text-xs text-muted-foreground bg-secondary rounded-lg p-3 overflow-x-auto">
            {JSON.stringify(request.aiExtracted, null, 2)}
          </pre>
        </div>
      )}

      {/* Matching formateurs */}
      {(request.status === "NOUVELLE" || request.status === "EN_RECHERCHE") && (
        <MatchingPanel requestId={request.id} />
      )}

      {/* Sessions associées */}
      {request.sessions.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Sessions planifiées</h2>
          </div>
          <div className="divide-y divide-border">
            {request.sessions.map((s) => (
              <Link
                key={s.id}
                href={`/sessions/${s.id}`}
                className="flex items-center gap-4 px-6 py-3 hover:bg-secondary/50 transition-colors"
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  s.status === "CONFIRMEE" ? "bg-green-400" : s.status === "PROVISOIRE" ? "bg-yellow-400" : "bg-red-400"
                }`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{s.theme.label}</p>
                  <p className="text-xs text-muted-foreground">{s.trainer.fullName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-foreground">{formatDate(s.startDate)}</p>
                  <p className="text-xs text-muted-foreground">→ {formatDate(s.endDate)}</p>
                </div>
                <div className="flex flex-col items-end gap-1 text-xs">
                  {s.clientConfirmed && <span className="text-green-400">✓ Client</span>}
                  {s.trainerConfirmed && <span className="text-teal-400">✓ Formateur</span>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Créer une session — état vide */}
      {request.sessions.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-6 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-foreground">Aucune session planifiée</p>
            <p className="text-sm text-muted-foreground mt-0.5">Cette demande n&apos;a pas encore de session associée.</p>
          </div>
          <Link
            href="/sessions"
            className="text-primary hover:underline font-medium text-sm flex-shrink-0"
          >
            Créer une session
          </Link>
        </div>
      )}

      {/* Notes */}
      {request.notes && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold text-foreground mb-2">Notes</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{request.notes}</p>
        </div>
      )}
    </div>
  );
}

function InfoCard({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      {children}
    </div>
  );
}
