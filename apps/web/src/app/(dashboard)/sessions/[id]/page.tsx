import React from "react";
import { db } from "@ccelog/db";
import { notFound } from "next/navigation";
import { formatDate, formatCurrency } from "@/lib/utils";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  User,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  Receipt,
  Plus,
} from "lucide-react";
import { OutlookSyncButton } from "@/components/sessions/outlook-sync-button";
import { ConfirmSessionButton } from "@/components/sessions/confirm-session-button";
import { createPrestationAction, createInvoiceFromSessionAction, lancerSessionAction, cloturerSessionAction } from "./actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await db.trainingSession.findUnique({
    where: { id },
    include: { theme: true, request: { include: { client: true } } },
  });
  if (!session) return { title: "Session introuvable" };
  return { title: `${session.theme.code} — ${session.request.client.name}` };
}

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await db.trainingSession.findUnique({
    where: { id },
    include: {
      trainer: true,
      theme: { include: { consumableNeeds: { include: { consumable: true } }, materialNeeds: { include: { material: true } } } },
      request: { include: { client: { include: { contacts: true } }, site: true } },
      hotelBooking: { include: { hotel: true } },
      documents: true,
      report: true,
      whatsappThreads: { include: { messages: { orderBy: { createdAt: "asc" }, take: 20 } } },
      notifications: { orderBy: { scheduledAt: "asc" } },
      prestation: true,
      invoiceLines: { include: { invoice: true } },
      missionOrder: true,
    },
  });

  if (!session) notFound();

  const statusConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
    CONFIRMEE: { label: "Confirmée", icon: CheckCircle, className: "text-green-400" },
    PROVISOIRE: { label: "Provisoire", icon: Clock, className: "text-yellow-400" },
    ANNULEE: { label: "Annulée", icon: XCircle, className: "text-red-400" },
    EN_COURS: { label: "En cours", icon: CheckCircle, className: "text-blue-400" },
    TERMINEE: { label: "Terminée", icon: CheckCircle, className: "text-gray-400" },
  };
  const sc = statusConfig[session.status] ?? statusConfig["PROVISOIRE"];
  const costBreakdown = session.costBreakdown ? JSON.parse(session.costBreakdown as string) : null;

  const isExterne = session.trainer.type === "EXTERNE";
  const hasPrestation = !!session.prestation;
  const hasInvoiceLines = session.invoiceLines.length > 0;
  const isConfirmee = session.status === "CONFIRMEE";

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back */}
      <Link href="/sessions" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Retour aux sessions
      </Link>

      {/* Quick nav to sub-pages */}
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/sessions/${session.id}/presences`}
          className="px-3 py-1.5 rounded-md text-xs font-medium bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
        >
          Présences
        </Link>
        <Link
          href={`/sessions/${session.id}/attestations`}
          className="px-3 py-1.5 rounded-md text-xs font-medium bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
        >
          Attestations
        </Link>
        <Link
          href={`/sessions/${session.id}/frais`}
          className="px-3 py-1.5 rounded-md text-xs font-medium bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
        >
          Frais
        </Link>
        <Link
          href={`/sessions/${session.id}/rapport`}
          className="px-3 py-1.5 rounded-md text-xs font-medium bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
        >
          Rapport
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <sc.icon className={`h-5 w-5 ${sc.className}`} />
            <span className="text-sm font-medium text-muted-foreground">{sc.label}</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{session.theme.label}</h1>
          <p className="text-muted-foreground mt-1">{session.request.client.name} · {session.request.site.city}</p>
        </div>
        <div className="flex items-center gap-2">
          <OutlookSyncButton sessionId={session.id} hasOutlookId={!!session.outlookEventId} />
          {session.status === "PROVISOIRE" && (
            <ConfirmSessionButton sessionId={session.id} trainerConfirmed={session.trainerConfirmed} clientConfirmed={session.clientConfirmed} />
          )}
        </div>
      </div>

      {/* Cards info */}
      <div className="grid gap-4 md:grid-cols-3">
        <InfoCard icon={<Calendar className="h-4 w-4" />} label="Dates">
          <p className="font-medium">{formatDate(session.startDate)}</p>
          {formatDate(session.startDate) !== formatDate(session.endDate) && (
            <p className="text-muted-foreground text-sm">au {formatDate(session.endDate)}</p>
          )}
        </InfoCard>

        <InfoCard icon={<User className="h-4 w-4" />} label="Formateur">
          <div className="flex items-center gap-2">
            <p className="font-medium">{session.trainer.fullName}</p>
            <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${isExterne ? "bg-orange-500/10 text-orange-400" : "bg-blue-500/10 text-blue-400"}`}>
              {isExterne ? "EXT" : "INT"}
            </span>
          </div>
          <p className="text-muted-foreground text-sm">{session.trainer.city} · {session.trainer.phone}</p>
        </InfoCard>

        <InfoCard icon={<MapPin className="h-4 w-4" />} label="Site">
          <p className="font-medium">{session.request.site.label}</p>
          <p className="text-muted-foreground text-sm">{session.request.site.address}</p>
        </InfoCard>
      </div>

      {/* Coût */}
      {session.totalCost && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold text-foreground mb-4">Coût estimé</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {costBreakdown && Object.entries(costBreakdown).filter(([k]) => k !== "total").map(([key, value]) => (
              <div key={key}>
                <p className="text-xs text-muted-foreground capitalize">{key}</p>
                <p className="text-sm font-semibold text-foreground">{formatCurrency(value as number)}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-border flex justify-between">
            <p className="font-semibold text-foreground">Total</p>
            <p className="text-lg font-bold text-foreground">{formatCurrency(session.totalCost)}</p>
          </div>
        </div>
      )}

      {/* Confirmations */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold text-foreground mb-4">État des confirmations (Règle R2)</h2>
        <div className="grid grid-cols-2 gap-4">
          <ConfirmationItem label="Formateur" confirmed={session.trainerConfirmed} />
          <ConfirmationItem label="Client" confirmed={session.clientConfirmed} />
        </div>
      </div>

      {/* Prestation externe */}
      {isExterne && (
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Prestation externe
            </h2>
            {!hasPrestation && (
              <form action={createPrestationAction}>
                <input type="hidden" name="sessionId" value={session.id} />
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Générer BdC
                </button>
              </form>
            )}
          </div>
          {hasPrestation ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{session.prestation!.poReference ?? "BdC en cours"}</p>
                  <p className="text-xs text-muted-foreground">
                    {session.prestation!.daysCount} j × {formatCurrency(session.prestation!.agreedRate)} = {formatCurrency(session.prestation!.totalAmount)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-muted-foreground">
                    {session.prestation!.status}
                  </span>
                  <Link
                    href={`/achats`}
                    className="text-xs text-primary hover:underline"
                  >
                    Voir dans Achats
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun bon de commande émis pour cette session.</p>
          )}
        </div>
      )}

      {/* Facturation */}
      {(hasInvoiceLines || isConfirmee) && (
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              Facturation client
            </h2>
            {isConfirmee && !hasInvoiceLines && (
              <form action={createInvoiceFromSessionAction}>
                <input type="hidden" name="sessionId" value={session.id} />
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Créer facture
                </button>
              </form>
            )}
          </div>
          {hasInvoiceLines ? (
            <div className="space-y-2">
              {session.invoiceLines.map((line) => (
                <div key={line.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{line.description}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(line.amount)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-muted-foreground">
                      {line.invoice.status}
                    </span>
                    <Link
                      href={`/facturation`}
                      className="text-xs text-primary hover:underline"
                    >
                      {line.invoice.reference}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune facture générée — cliquez sur &quot;Créer facture&quot; pour initier la facturation.</p>
          )}
        </div>
      )}

      {/* WhatsApp */}
      {session.whatsappThreads.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Conversation WhatsApp</h2>
          </div>
          <div className="p-6 space-y-3 max-h-80 overflow-y-auto">
            {session.whatsappThreads[0].messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.direction === "SORTANT" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs px-3 py-2 rounded-xl text-sm ${
                    msg.direction === "SORTANT"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground"
                  }`}
                >
                  <p>{msg.body}</p>
                  {msg.intent && (
                    <p className="text-xs opacity-70 mt-1 italic">Intent: {msg.intent}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold text-foreground mb-4">Documents</h2>
        {session.documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun document généré.</p>
        ) : (
          <div className="grid gap-2">
            {session.documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{doc.type}</p>
                  <p className="text-xs text-muted-foreground">{doc.status}</p>
                </div>
                {doc.fileUrl && (
                  <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                    Télécharger
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* PDF générés dynamiquement */}
        {(session.report || session.missionOrder) && (
          <div className="mt-4 pt-4 border-t border-border space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">PDF disponibles</p>
            {session.report && (
              <a
                href={`/api/pdf/rapport/${session.report.id}`}
                className="text-sm text-primary hover:underline flex items-center gap-1"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FileText className="h-4 w-4" /> Télécharger le rapport PDF
              </a>
            )}
            {session.missionOrder && (
              <a
                href={`/api/pdf/mission-order/${session.missionOrder.id}`}
                className="text-sm text-primary hover:underline flex items-center gap-1"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FileText className="h-4 w-4" /> Télécharger l&apos;ordre de mission PDF
              </a>
            )}
          </div>
        )}
      </div>

      {/* Cycle de vie */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold text-foreground mb-6">Cycle de vie</h2>

        {/* Timeline */}
        <div className="flex items-center gap-0 mb-6 overflow-x-auto pb-2">
          {(["PROVISOIRE", "CONFIRMEE", "EN_COURS", "TERMINEE"] as const).map((step, idx, arr) => {
            const stepOrder: Record<string, number> = {
              PROVISOIRE: 0,
              CONFIRMEE: 1,
              EN_COURS: 2,
              TERMINEE: 3,
              ANNULEE: -1,
            };
            const currentOrder = stepOrder[session.status] ?? 0;
            const stepIdx = stepOrder[step];
            const isDone = currentOrder >= stepIdx;
            const isCurrent = session.status === step;
            const stepLabels: Record<string, string> = {
              PROVISOIRE: "Provisoire",
              CONFIRMEE: "Confirmée",
              EN_COURS: "En cours",
              TERMINEE: "Terminée",
            };
            return (
              <div key={step} className="flex items-center flex-1 min-w-0">
                <div className="flex flex-col items-center flex-1 min-w-0">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center border-2 shrink-0 ${
                      isDone
                        ? isCurrent
                          ? "border-primary bg-primary/20"
                          : "border-green-500 bg-green-500/10"
                        : "border-border bg-secondary"
                    }`}
                  >
                    {isDone && !isCurrent ? (
                      <CheckCircle className="h-4 w-4 text-green-400" />
                    ) : isCurrent ? (
                      <Clock className="h-4 w-4 text-primary" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-border" />
                    )}
                  </div>
                  <span
                    className={`text-xs mt-1.5 font-medium text-center ${
                      isCurrent ? "text-primary" : isDone ? "text-green-400" : "text-muted-foreground"
                    }`}
                  >
                    {stepLabels[step]}
                  </span>
                </div>
                {idx < arr.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-1 shrink-0 w-8 ${
                      stepOrder[session.status] > stepIdx ? "bg-green-500/50" : "bg-border"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Actions and info */}
        {session.status === "CONFIRMEE" && (
          <form
            action={async () => {
              "use server";
              await lancerSessionAction(session.id);
            }}
          >
            <button
              type="submit"
              className="px-4 py-2 rounded-md text-sm font-medium bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 border border-blue-500/30 transition-colors"
            >
              Lancer la session
            </button>
          </form>
        )}

        {session.status === "EN_COURS" && (
          <div className="space-y-3">
            {session.launchedAt && (
              <p className="text-sm text-muted-foreground">
                Lancée le <span className="text-foreground font-medium">{formatDate(session.launchedAt)}</span>
              </p>
            )}
            <form
              action={async () => {
                "use server";
                await cloturerSessionAction(session.id);
              }}
            >
              <button
                type="submit"
                className="px-4 py-2 rounded-md text-sm font-medium bg-gray-500/15 text-gray-300 hover:bg-gray-500/25 border border-gray-500/30 transition-colors"
              >
                Clôturer la session
              </button>
            </form>
          </div>
        )}

        {session.status === "TERMINEE" && (
          <div className="space-y-1">
            {session.launchedAt && (
              <p className="text-sm text-muted-foreground">
                Lancée le <span className="text-foreground font-medium">{formatDate(session.launchedAt)}</span>
              </p>
            )}
            {session.closedAt && (
              <p className="text-sm text-muted-foreground">
                Clôturée le <span className="text-foreground font-medium">{formatDate(session.closedAt)}</span>
              </p>
            )}
          </div>
        )}

        {session.status === "ANNULEE" && (
          <p className="text-sm text-red-400">Cette session a été annulée.</p>
        )}

        {session.status === "PROVISOIRE" && (
          <p className="text-sm text-muted-foreground">
            En attente de confirmation formateur et client avant lancement.
          </p>
        )}
      </div>
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

function ConfirmationItem({ label, confirmed }: { label: string; confirmed: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${confirmed ? "bg-green-500/10" : "bg-secondary"}`}>
        <CheckCircle className={`h-4 w-4 ${confirmed ? "text-green-400" : "text-muted-foreground"}`} />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{confirmed ? "Confirmé" : "En attente"}</p>
      </div>
    </div>
  );
}
