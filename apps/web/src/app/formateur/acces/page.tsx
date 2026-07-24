import { db } from "@ccelog/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  CalendarDays,
  MapPin,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  GraduationCap,
} from "lucide-react";

export const metadata = { title: "Espace formateur — CCE LOG" };

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

const SESSION_STATUS: Record<string, { label: string; color: string }> = {
  PROVISOIRE: { label: "Provisoire", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  CONFIRMEE: { label: "Confirmée", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  ANNULEE: { label: "Annulée", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  EN_COURS: { label: "En cours", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  TERMINEE: { label: "Terminée", color: "bg-secondary text-muted-foreground border-border" },
};

export default async function FormateurAccesPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return <InvalidToken message="Lien invalide ou expiré." />;
  }

  const trainer = await db.trainer.findUnique({
    where: { magicLinkToken: token },
    select: {
      id: true,
      fullName: true,
      email: true,
      magicLinkExpiry: true,
      sessions: {
        include: {
          theme: true,
          request: { include: { site: true, client: true } },
        },
        orderBy: { startDate: "desc" },
      },
    },
  });

  if (!trainer) return <InvalidToken message="Lien invalide." />;

  if (!trainer.magicLinkExpiry || new Date(trainer.magicLinkExpiry) < new Date()) {
    return <InvalidToken message="Ce lien a expiré. Demandez un nouveau lien à votre coordinateur." />;
  }

  const now = new Date();
  const upcoming = trainer.sessions.filter(
    (s) => new Date(s.startDate) >= now && s.status !== "ANNULEE"
  );
  const past = trainer.sessions.filter(
    (s) => new Date(s.startDate) < now || s.status === "TERMINEE"
  );
  const awaitingConfirmation = trainer.sessions.filter(
    (s) => s.status === "PROVISOIRE" && !s.trainerConfirmed
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{trainer.fullName}</p>
              <p className="text-xs text-muted-foreground">Espace formateur — CCE LOG</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground hidden sm:block">
            Accès valide jusqu'au{" "}
            {trainer.magicLinkExpiry
              ? new Date(trainer.magicLinkExpiry).toLocaleDateString("fr-FR")
              : "—"}
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Alerte confirmations en attente */}
        {awaitingConfirmation.length > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-yellow-400">
                {awaitingConfirmation.length} session(s) en attente de votre confirmation
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Veuillez confirmer votre disponibilité pour les sessions provisoires ci-dessous.
              </p>
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="grid gap-3 md:grid-cols-3">
          <StatCard icon={<Clock className="h-4 w-4 text-yellow-400" />} label="À confirmer" value={awaitingConfirmation.length} color="yellow" />
          <StatCard icon={<CalendarDays className="h-4 w-4 text-blue-400" />} label="À venir" value={upcoming.length} color="blue" />
          <StatCard icon={<CheckCircle2 className="h-4 w-4 text-muted-foreground" />} label="Passées" value={past.length} color="default" />
        </div>

        {/* Sessions à confirmer */}
        {awaitingConfirmation.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-400" />
              En attente de confirmation
            </h2>
            <div className="space-y-3">
              {awaitingConfirmation.map((s) => (
                <SessionCard key={s.id} session={s} highlight />
              ))}
            </div>
          </section>
        )}

        {/* Sessions à venir */}
        {upcoming.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-blue-400" />
              Sessions à venir
            </h2>
            <div className="space-y-3">
              {upcoming.map((s) => (
                <SessionCard key={s.id} session={s} />
              ))}
            </div>
          </section>
        )}

        {/* Sessions passées */}
        {past.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              Historique
            </h2>
            <div className="space-y-3 opacity-75">
              {past.slice(0, 10).map((s) => (
                <SessionCard key={s.id} session={s} />
              ))}
              {past.length > 10 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  + {past.length - 10} session(s) plus anciennes
                </p>
              )}
            </div>
          </section>
        )}

        {trainer.sessions.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucune session assignée pour le moment.</p>
          </div>
        )}
      </main>
    </div>
  );
}

type SessionData = {
  id: string;
  startDate: Date;
  endDate: Date | null;
  location: string | null;
  status: string;
  trainerConfirmed: boolean;
  clientConfirmed: boolean;
  theme: { label: string };
  request: {
    participants: number;
    site: { label: string; city: string };
    client: { name: string };
  };
};

function SessionCard({ session: s, highlight = false }: { session: SessionData; highlight?: boolean }) {
  const statusInfo = SESSION_STATUS[s.status] ?? {
    label: s.status,
    color: "bg-secondary text-muted-foreground border-border",
  };

  return (
    <div
      className={`bg-card border rounded-xl p-4 space-y-3 ${
        highlight ? "border-yellow-500/40" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground">{s.theme.label}</p>
          <p className="text-sm text-muted-foreground">{s.request.client.name}</p>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" />
          {formatDate(s.startDate)}
          {s.endDate && s.endDate !== s.startDate && (
            <> → {formatDate(s.endDate)}</>
          )}
        </span>
        <span className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" />
          {s.location ?? s.request.site.city} — {s.request.site.label}
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          {s.request.participants} participants
        </span>
      </div>

      {/* Statut de confirmation */}
      <div className="flex items-center gap-4 text-xs pt-1 border-t border-border">
        <span className={`flex items-center gap-1 ${s.trainerConfirmed ? "text-green-400" : "text-yellow-400"}`}>
          {s.trainerConfirmed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
          {s.trainerConfirmed ? "Vous avez confirmé" : "Votre confirmation attendue"}
        </span>
        <span className={`flex items-center gap-1 ${s.clientConfirmed ? "text-green-400" : "text-muted-foreground"}`}>
          {s.clientConfirmed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
          {s.clientConfirmed ? "Client confirmé" : "Client non confirmé"}
        </span>
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: "yellow" | "blue" | "default";
}) {
  const bg =
    color === "yellow"
      ? "bg-yellow-500/10 border-yellow-500/30"
      : color === "blue"
      ? "bg-blue-500/10 border-blue-500/30"
      : "bg-card border-border";

  return (
    <div className={`border rounded-xl p-4 ${bg}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function InvalidToken({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto">
          <XCircle className="h-7 w-7 text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Accès impossible</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}
