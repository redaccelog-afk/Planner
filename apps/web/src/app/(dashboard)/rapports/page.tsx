import { db } from "@ccelog/db";
import Link from "next/link";
import { formatDate, formatDateTime } from "@/lib/utils";
import { FileText, Clock, CheckCircle, Send, Key, AlertTriangle } from "lucide-react";
import { markSentToClientAction, generateUploadTokenAction } from "./actions";

export const metadata = { title: "Rapports de formation" };

const REPORT_STATUS = {
  ATTENDU: { label: "En attente", icon: Clock, className: "text-yellow-400 bg-yellow-500/10" },
  RECU: { label: "Reçu", icon: FileText, className: "text-blue-400 bg-blue-500/10" },
  CORRIGE: { label: "Corrigé", icon: CheckCircle, className: "text-green-400 bg-green-500/10" },
  ENVOYE_CLIENT: { label: "Envoyé client", icon: Send, className: "text-gray-400 bg-gray-500/10" },
} as const;

type ReportStatus = keyof typeof REPORT_STATUS;

interface PageProps {
  searchParams: Promise<{ statut?: string; theme?: string; formateur?: string }>;
}

export default async function RapportsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filterStatut = params.statut ?? "";
  const filterTheme = params.theme ?? "";
  const filterFormateur = params.formateur ?? "";

  const [reports, themes, trainers] = await Promise.all([
    db.trainingReport.findMany({
      include: {
        session: {
          include: {
            trainer: true,
            theme: true,
            request: { include: { client: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.theme.findMany({ where: { active: true }, select: { id: true, label: true, code: true }, orderBy: { label: "asc" } }),
    db.trainer.findMany({ where: { active: true }, select: { id: true, fullName: true }, orderBy: { fullName: "asc" } }),
  ]);

  // Apply filters in JS (simpler than Prisma nested where for these cases)
  const filtered = reports.filter((r) => {
    if (filterStatut && r.status !== filterStatut) return false;
    if (filterTheme && r.session.themeId !== filterTheme) return false;
    if (filterFormateur && r.session.trainerId !== filterFormateur) return false;
    return true;
  });

  const pendingCount = reports.filter((r) => r.status !== "ENVOYE_CLIENT").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Rapports de formation</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {pendingCount} rapport(s) en cours de traitement · {filtered.length} affiché(s)
        </p>
      </div>

      {/* Filtres */}
      <form method="GET" className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Statut</label>
          <select
            name="statut"
            defaultValue={filterStatut}
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Tous les statuts</option>
            {Object.entries(REPORT_STATUS).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Thème</label>
          <select
            name="theme"
            defaultValue={filterTheme}
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Tous les thèmes</option>
            {themes.map((t) => (
              <option key={t.id} value={t.id}>{t.code} — {t.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Formateur</label>
          <select
            name="formateur"
            defaultValue={filterFormateur}
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Tous les formateurs</option>
            {trainers.map((t) => (
              <option key={t.id} value={t.id}>{t.fullName}</option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="h-9 px-4 bg-secondary border border-border text-foreground rounded-lg text-sm font-medium hover:bg-secondary/70 transition-colors"
        >
          Filtrer
        </button>
        {(filterStatut || filterTheme || filterFormateur) && (
          <Link
            href="/rapports"
            className="h-9 flex items-center px-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Réinitialiser
          </Link>
        )}
      </form>

      <div className="space-y-3">
        {filtered.map((report) => {
          const status = report.status as ReportStatus;
          const sc = REPORT_STATUS[status];
          const StatusIcon = sc.icon;
          const tokenExpired =
            report.trainerUploadToken &&
            report.trainerUploadExpiry &&
            report.trainerUploadExpiry < new Date();

          return (
            <div key={report.id} className="bg-card border border-border rounded-xl px-6 py-4">
              <div className="flex items-start gap-4 flex-wrap">
                <div className={`p-2 rounded-lg flex-shrink-0 ${sc.className}`}>
                  <StatusIcon className="h-4 w-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/sessions/${report.sessionId}`}
                      className="font-semibold text-foreground hover:text-primary transition-colors"
                    >
                      {report.session.theme.label}
                    </Link>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${sc.className}`}>
                      {sc.label}
                    </span>
                    {report.trainerUploadToken && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${tokenExpired ? "text-red-400 bg-red-500/10 border-red-500/20" : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"}`}>
                        {tokenExpired ? "Token expiré" : "Token actif"}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {report.session.request.client.name} · {report.session.trainer.fullName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Formation du {formatDate(report.session.startDate)}
                  </p>
                  {report.sentToClientAt && (
                    <p className="text-xs text-muted-foreground">
                      Envoyé le {formatDateTime(report.sentToClientAt)}
                    </p>
                  )}
                  {report.trainerUploadToken && report.trainerUploadExpiry && !tokenExpired && (
                    <p className="text-xs text-emerald-400 mt-1">
                      Token valide jusqu&apos;au {formatDateTime(report.trainerUploadExpiry)}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                  <Link
                    href={`/sessions/${report.sessionId}`}
                    className="px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Voir session
                  </Link>

                  {/* Générer token upload (disponible pour ATTENDU et RECU) */}
                  {(status === "ATTENDU" || status === "RECU") && (
                    <form action={generateUploadTokenAction}>
                      <input type="hidden" name="reportId" value={report.id} />
                      <button
                        type="submit"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Key className="h-3 w-3" />
                        {report.trainerUploadToken ? "Renouveler token" : "Générer token upload"}
                      </button>
                    </form>
                  )}

                  {/* Envoyer au client (seulement CORRIGE) */}
                  {status === "CORRIGE" && (
                    <form action={markSentToClientAction}>
                      <input type="hidden" name="reportId" value={report.id} />
                      <button
                        type="submit"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
                      >
                        <Send className="h-3 w-3" />
                        Envoyer au client
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {/* Rapport brut */}
              {status === "RECU" && report.rawFromTrainer && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">Rapport brut reçu du formateur :</p>
                  <pre className="text-xs text-muted-foreground bg-secondary rounded-lg p-3 overflow-x-auto max-h-40 whitespace-pre-wrap">
                    {report.rawFromTrainer.slice(0, 500)}
                    {report.rawFromTrainer.length > 500 ? "…" : ""}
                  </pre>
                </div>
              )}

              {/* Afficher le token pour copie */}
              {report.trainerUploadToken && !tokenExpired && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Lien de dépôt formateur (à copier et envoyer manuellement) :
                  </p>
                  <code className="block text-xs text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-2 break-all">
                    {process.env.NEXT_PUBLIC_APP_URL ?? ""}/formateur/upload/{report.trainerUploadToken}
                  </code>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-16 bg-card border border-border rounded-xl">
            <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-3" />
            <p className="text-foreground font-medium">
              {filterStatut || filterTheme || filterFormateur
                ? "Aucun rapport ne correspond aux filtres."
                : "Tous les rapports sont traités !"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
