import { db } from "@ccelog/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  User,
  BookOpen,
  Users,
  UserCheck,
  UserX,
  Star,
  FileText,
  ClipboardList,
  PenLine,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { ValidateRapportButton } from "./validate-rapport-button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await db.trainingSession.findUnique({
    where: { id },
    include: { theme: true, request: { include: { client: true } } },
  });
  if (!session) return { title: "Rapport introuvable" };
  return {
    title: `Rapport — ${session.theme.code} · ${session.request.client.name}`,
  };
}

export default async function SessionRapportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await db.trainingSession.findUnique({
    where: { id },
    include: {
      theme: true,
      trainer: { select: { fullName: true, type: true } },
      request: { include: { client: true, site: true } },
      rapportQA: true,
    },
  });

  if (!session) notFound();

  const [dailyLogs, totalParticipants, presentCount, absentCount] =
    await Promise.all([
      db.sessionDailyLog.findMany({
        where: { sessionId: id },
        orderBy: { date: "asc" },
      }),
      db.participant.count({ where: { sessionId: id } }),
      db.participant.count({ where: { sessionId: id, present: true } }),
      db.participant.count({ where: { sessionId: id, present: false } }),
    ]);

  const avgAdvancement =
    dailyLogs.length > 0
      ? Math.round(
          dailyLogs.reduce((acc, log) => acc + log.advancement, 0) /
            dailyLogs.length,
        )
      : null;

  const rapport = session.rapportQA;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back */}
      <Link
        href={`/sessions/${id}`}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour à la session
      </Link>

      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Rapport de session
        </h1>
        <p className="text-muted-foreground mt-1">
          {session.theme.label} — {session.request.client.name}
        </p>
      </div>

      {/* Sub-nav */}
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/sessions/${id}`}
          className="px-3 py-1.5 rounded-md text-xs font-medium bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
        >
          Détail
        </Link>
        <Link
          href={`/sessions/${id}/presences`}
          className="px-3 py-1.5 rounded-md text-xs font-medium bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
        >
          Présences
        </Link>
        <Link
          href={`/sessions/${id}/attestations`}
          className="px-3 py-1.5 rounded-md text-xs font-medium bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
        >
          Attestations
        </Link>
        <Link
          href={`/sessions/${id}/frais`}
          className="px-3 py-1.5 rounded-md text-xs font-medium bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
        >
          Frais
        </Link>
        <Link
          href={`/sessions/${id}/rapport`}
          className="px-3 py-1.5 rounded-md text-xs font-medium bg-primary/10 text-primary"
          aria-current="page"
        >
          Rapport
        </Link>
      </div>

      {/* ── RAPPORT QA SECTION ── */}
      {!rapport ? (
        /* No rapport yet — CTA */
        <div className="bg-card border border-border rounded-xl p-8 flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <PenLine className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Rapport non rédigé</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Répondez à quelques questions pour générer automatiquement le rapport
              de cette session de formation.
            </p>
          </div>
          <Link
            href={`/sessions/${id}/rapport-qa`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <PenLine className="h-4 w-4" />
            Rédiger le rapport
          </Link>
        </div>
      ) : (
        /* Rapport exists — show content */
        <div className="space-y-4">
          {/* Status banner */}
          <div
            className={[
              "flex items-center justify-between gap-4 rounded-xl px-5 py-3",
              rapport.status === "BROUILLON"
                ? "bg-yellow-500/10 border border-yellow-500/20"
                : rapport.status === "VALIDE_FORMATEUR"
                  ? "bg-blue-500/10 border border-blue-500/20"
                  : "bg-green-500/10 border border-green-500/20",
            ].join(" ")}
          >
            <div className="flex items-center gap-3">
              {rapport.status === "BROUILLON" ? (
                <Clock className="h-4 w-4 text-yellow-400 shrink-0" />
              ) : rapport.status === "VALIDE_FORMATEUR" ? (
                <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
              )}
              <div>
                <p
                  className={[
                    "text-sm font-medium",
                    rapport.status === "BROUILLON"
                      ? "text-yellow-400"
                      : rapport.status === "VALIDE_FORMATEUR"
                        ? "text-blue-400"
                        : "text-green-400",
                  ].join(" ")}
                >
                  {rapport.status === "BROUILLON"
                    ? "Brouillon — en attente de validation"
                    : rapport.status === "VALIDE_FORMATEUR"
                      ? "Validé par le formateur — en attente planificateur"
                      : rapport.status === "VALIDE_PLANIFICATEUR"
                        ? "Validé — prêt à envoyer"
                        : "Envoyé au client"}
                </p>
                {rapport.validatedByTrainerAt && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Validé le{" "}
                    {new Date(rapport.validatedByTrainerAt).toLocaleDateString("fr-MA", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {rapport.status === "BROUILLON" && (
                <>
                  <Link
                    href={`/sessions/${id}/rapport-qa`}
                    className="px-3 py-1.5 rounded-md text-xs font-medium bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
                  >
                    Modifier
                  </Link>
                  <ValidateRapportButton sessionId={id} />
                </>
              )}
            </div>
          </div>

          {/* Sections */}
          <RapportSection
            icon={<ClipboardList className="h-4 w-4" />}
            title="Bilan général"
            content={rapport.bilanGeneral}
          />

          <RapportSection
            icon={<FileText className="h-4 w-4" />}
            title="Moyens mis à disposition"
            content={rapport.moyensDisposition}
          />

          <RapportSection
            icon={<Users className="h-4 w-4" />}
            title="Accueil et ambiance générale"
            content={rapport.accueilAmbiance}
          />

          {rapport.hasVr && (
            <RapportSection
              icon={<Star className="h-4 w-4" />}
              title="Exercice VR"
              content={rapport.vrDescription ?? "Exercice VR réalisé (sans description)"}
            />
          )}

          <RapportSection
            icon={<BookOpen className="h-4 w-4" />}
            title="Recommandations"
            content={rapport.recommandations}
          />

          <RapportSection
            icon={<CheckCircle2 className="h-4 w-4" />}
            title="Conclusion"
            content={rapport.conclusion}
          />
        </div>
      )}

      {/* En-tête session */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          En-tête session
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <InfoRow
            icon={<BookOpen className="h-4 w-4" />}
            label="Thème"
            value={`${session.theme.label} (${session.theme.code})`}
          />
          <InfoRow
            icon={<User className="h-4 w-4" />}
            label="Client"
            value={session.request.client.name}
          />
          <InfoRow
            icon={<User className="h-4 w-4" />}
            label="Formateur"
            value={
              session.trainer.fullName +
              (session.trainer.type === "EXTERNE" ? " (Externe)" : " (Interne)")
            }
          />
          <InfoRow
            icon={<Calendar className="h-4 w-4" />}
            label="Dates"
            value={
              formatDate(session.startDate) === formatDate(session.endDate)
                ? formatDate(session.startDate)
                : `${formatDate(session.startDate)} → ${formatDate(session.endDate)}`
            }
          />
          <InfoRow
            icon={<MapPin className="h-4 w-4" />}
            label="Site"
            value={`${session.request.site.label} — ${session.request.site.city}`}
          />
        </div>
      </div>

      {/* Présences summary */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          Résumé des présences
        </h2>
        {totalParticipants === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun participant enregistré pour cette session.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              icon={<Users className="h-5 w-5 text-muted-foreground" />}
              label="Total participants"
              value={String(totalParticipants)}
            />
            <StatCard
              icon={<UserCheck className="h-5 w-5 text-green-400" />}
              label="Présents"
              value={String(presentCount)}
              valueClass="text-green-400"
            />
            <StatCard
              icon={<UserX className="h-5 w-5 text-red-400" />}
              label="Absents"
              value={String(absentCount)}
              valueClass="text-red-400"
            />
          </div>
        )}
      </div>

      {/* Évaluation globale */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Star className="h-4 w-4 text-muted-foreground" />
          Évaluation globale
        </h2>
        {avgAdvancement !== null ? (
          <div className="flex items-center gap-4">
            <div>
              <p className="text-3xl font-bold text-foreground">
                {avgAdvancement}
                <span className="text-base font-normal text-muted-foreground">
                  %
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Avancement moyen ({dailyLogs.length} jour
                {dailyLogs.length > 1 ? "s" : ""} de suivi)
              </p>
            </div>
            <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${avgAdvancement}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Non renseigné</p>
        )}
      </div>

      {/* Suivi journalier */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          Suivi journalier
        </h2>
        {dailyLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun suivi journalier enregistré pour cette session.
          </p>
        ) : (
          <div className="space-y-4">
            {dailyLogs.map((log) => (
              <div
                key={log.id}
                className="border border-border rounded-lg p-4 space-y-2"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium text-foreground">
                      {new Date(log.date).toLocaleDateString("fr-MA", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      Avancement
                    </span>
                    <span
                      className={`text-sm font-semibold ${
                        log.advancement >= 80
                          ? "text-green-400"
                          : log.advancement >= 50
                            ? "text-yellow-400"
                            : "text-red-400"
                      }`}
                    >
                      {log.advancement}%
                    </span>
                  </div>
                </div>
                {log.notes ? (
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {log.notes}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    Aucune note saisie
                  </p>
                )}
                {log.reportedBy && (
                  <p className="text-xs text-muted-foreground">
                    Rapporté par : {log.reportedBy}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          href={`/sessions/${id}/presences`}
          className="px-4 py-2 rounded-md text-sm font-medium bg-secondary text-foreground hover:bg-secondary/80 transition-colors flex items-center gap-2"
        >
          <Users className="h-4 w-4" />
          Voir les présences
        </Link>
        <Link
          href={`/sessions/${id}/attestations`}
          className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <FileText className="h-4 w-4" />
          Gérer les attestations
        </Link>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────

function RapportSection({
  icon,
  title,
  content,
}: {
  icon: React.ReactNode
  title: string
  content: string | null | undefined
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        {title}
      </h2>
      {content ? (
        <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
          {content}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground italic">Non renseigné</p>
      )}
    </div>
  )
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
          {label}
        </p>
        <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  valueClass = "text-foreground",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-secondary/40 rounded-lg p-4 flex items-center gap-3">
      <span className="shrink-0">{icon}</span>
      <div>
        <p className={`text-2xl font-bold ${valueClass}`}>{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
