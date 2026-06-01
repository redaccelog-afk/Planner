import { db } from "@ccelog/db";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import {
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Archive,
  RefreshCw,
  Plus,
} from "lucide-react";
import { PortalSessionActions } from "@/components/portal/portal-session-actions";

export const metadata = { title: "Mes demandes de formation" };

const STATUS_CONFIG = {
  NOUVELLE:                        { label: "Nouvelle",                className: "text-blue-400 bg-blue-500/10",    icon: AlertCircle  },
  EN_ATTENTE_VALIDATION_FORMATEUR: { label: "En attente formateur",   className: "text-purple-400 bg-purple-500/10", icon: Clock        },
  VALIDEE_FORMATEUR:               { label: "Validée formateur",      className: "text-teal-400 bg-teal-500/10",     icon: CheckCircle  },
  EN_ATTENTE_VALIDATION_BO:        { label: "En attente Back Office", className: "text-orange-400 bg-orange-500/10", icon: Clock        },
  EN_RECHERCHE:                    { label: "En recherche",            className: "text-purple-400 bg-purple-500/10", icon: RefreshCw    },
  PROPOSEE:                        { label: "Proposée",                className: "text-yellow-400 bg-yellow-500/10", icon: Clock        },
  CONFIRMEE:                       { label: "Confirmée",               className: "text-green-400 bg-green-500/10",  icon: CheckCircle  },
  TERMINEE:                        { label: "Terminée",                className: "text-gray-400 bg-gray-500/10",    icon: Archive      },
  ANNULEE:                         { label: "Annulée",                 className: "text-red-400 bg-red-500/10",      icon: XCircle      },
  CLOTUREE:                        { label: "Clôturée",                className: "text-gray-400 bg-gray-500/10",    icon: Archive      },
} as const;

const SESSION_STATUS_LABEL: Record<string, string> = {
  PROVISOIRE: "Provisoire",
  CONFIRMEE:  "Confirmée",
  ANNULEE:    "Annulée",
  EN_COURS:   "En cours",
  TERMINEE:   "Terminée",
};

export default async function PortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Lookup client by portal token
  const client = await db.client.findUnique({
    where: { portalToken: token },
    select: {
      id: true,
      name: true,
      portalTokenExpiry: true,
      active: true,
    },
  });

  // Invalid or expired token
  if (
    !client ||
    !client.active ||
    (client.portalTokenExpiry && client.portalTokenExpiry < new Date())
  ) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
          <XCircle className="h-8 w-8 text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Lien invalide ou expiré</h1>
        <p className="text-muted-foreground max-w-md">
          Ce lien de portail est invalide ou a expiré. Veuillez contacter CCE LOG pour obtenir un
          nouveau lien.
        </p>
      </div>
    );
  }

  // Fetch all training requests for this client
  const requests = await db.trainingRequest.findMany({
    where: { clientId: client.id },
    include: {
      themes: { include: { theme: true } },
      sessions: {
        include: { theme: true },
        orderBy: { startDate: "asc" },
      },
    },
    orderBy: [{ urgency: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bonjour, {client.name}</h1>
          <p className="text-muted-foreground mt-1">
            Voici le suivi de vos demandes de formation.
          </p>
        </div>
        <Link
          href={`/portal/${token}/nouvelle-demande`}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500/15 text-blue-400 border border-blue-500/30 rounded-lg text-sm font-medium hover:bg-blue-500/25 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nouvelle demande
        </Link>
      </div>

      {/* Requests */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Mes demandes de formation</h2>

        {requests.length === 0 && (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <p className="text-muted-foreground">Aucune demande de formation pour le moment.</p>
            <Link
              href={`/portal/${token}/nouvelle-demande`}
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-500/15 text-blue-400 border border-blue-500/30 rounded-lg text-sm font-medium hover:bg-blue-500/25 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Soumettre une demande
            </Link>
          </div>
        )}

        {requests.map((req) => {
          const cfg = STATUS_CONFIG[req.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.NOUVELLE;
          const StatusIcon = cfg.icon;
          const pendingSessions = req.sessions.filter(
            (s) => s.status === "PROVISOIRE" && !s.clientConfirmed
          );

          return (
            <div key={req.id} className="bg-card border border-border rounded-xl overflow-hidden">
              {/* Request header */}
              <div className="px-6 py-4 flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.className}`}
                  >
                    <StatusIcon className="h-3.5 w-3.5" />
                    {cfg.label}
                  </span>
                  <div>
                    <div className="flex flex-wrap gap-1.5">
                      {req.themes.map((rt) => (
                        <span
                          key={rt.themeId}
                          className="px-2 py-0.5 bg-secondary text-xs text-muted-foreground rounded"
                        >
                          {rt.theme.code}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {req.participants} participant(s)
                      {req.desiredDateFrom && ` · ${formatDate(req.desiredDateFrom)}`}
                      {req.desiredDateTo && ` → ${formatDate(req.desiredDateTo)}`}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Demande reçue le {formatDate(req.createdAt)}
                </p>
              </div>

              {/* Sessions */}
              {req.sessions.length > 0 && (
                <div className="border-t border-border divide-y divide-border">
                  {req.sessions.map((s) => {
                    const sessionStatusLabel = SESSION_STATUS_LABEL[s.status] ?? s.status;
                    const isPendingConfirmation = s.status === "PROVISOIRE" && !s.clientConfirmed;

                    return (
                      <div key={s.id} className="px-6 py-3 flex items-center gap-4 flex-wrap">
                        <div
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            s.status === "CONFIRMEE"
                              ? "bg-green-400"
                              : s.status === "PROVISOIRE"
                              ? "bg-yellow-400"
                              : s.status === "ANNULEE"
                              ? "bg-red-400"
                              : "bg-gray-400"
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{s.theme.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(s.startDate)} → {formatDate(s.endDate)} · {sessionStatusLabel}
                            {s.clientConfirmed && " · ✓ Confirmée par vous"}
                          </p>
                        </div>

                        {isPendingConfirmation && (
                          <PortalSessionActions
                            token={token}
                            sessionId={s.id}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {pendingSessions.length > 0 && (
                <div className="px-6 py-3 bg-yellow-500/5 border-t border-yellow-500/20">
                  <p className="text-xs text-yellow-400">
                    ⚡ {pendingSessions.length} session(s) en attente de votre confirmation
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
