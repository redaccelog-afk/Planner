import { auth } from "@/lib/auth";
import { db } from "@ccelog/db";
import { formatDate } from "@/lib/utils";
import { CheckSquare, CalendarDays, MapPin, Building2, Clock, CheckCircle } from "lucide-react";
import { validateSessionAction } from "./actions";

export const metadata = { title: "Mes validations" };

export default async function MesValidationsPage() {
  const session = await auth();
  if (!session?.user?.email) return null;

  const trainer = await db.trainer.findFirst({
    where: { email: session.user.email },
  });

  if (!trainer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <div className="bg-card border border-border rounded-xl p-8 max-w-md text-center">
          <CheckSquare className="h-10 w-10 text-muted-foreground/40 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Profil formateur introuvable</h2>
          <p className="text-sm text-muted-foreground">
            Aucun profil formateur n&apos;est associé à votre compte ({session.user.email}).
            Contactez l&apos;administrateur pour lier votre compte.
          </p>
        </div>
      </div>
    );
  }

  const [sessionsAValider, sessionsAvenir] = await Promise.all([
    db.trainingSession.findMany({
      where: {
        trainerId: trainer.id,
        trainerConfirmed: false,
        status: "PROVISOIRE",
      },
      include: {
        request: { include: { client: true, site: true } },
        theme: true,
      },
      orderBy: { startDate: "asc" },
    }),
    db.trainingSession.findMany({
      where: {
        trainerId: trainer.id,
        startDate: { gte: new Date() },
        status: { in: ["PROVISOIRE", "CONFIRMEE"] },
      },
      include: {
        request: { include: { client: true } },
        theme: true,
      },
      orderBy: { startDate: "asc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mes validations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Bonjour {trainer.fullName} — gérez vos sessions en attente de confirmation
        </p>
      </div>

      {/* Section A — Sessions à valider */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-yellow-400" />
          <h2 className="text-lg font-semibold text-foreground">Sessions à valider</h2>
          {sessionsAValider.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
              {sessionsAValider.length}
            </span>
          )}
        </div>

        {sessionsAValider.length === 0 ? (
          <div className="bg-card border border-border rounded-xl flex items-center justify-center py-12">
            <p className="text-muted-foreground text-sm">Aucune session en attente de votre validation.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessionsAValider.map((s) => (
              <div
                key={s.id}
                className="bg-card border border-yellow-500/20 rounded-xl px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                {/* Badge statut */}
                <div className="flex-shrink-0">
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
                    Provisoire
                  </span>
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-foreground">{s.theme.code}</span>
                    {s.theme.label && (
                      <span className="text-sm text-muted-foreground">— {s.theme.label}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                      {s.request.client.name}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      {s.request.site.city}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 flex-shrink-0" />
                      {formatDate(s.startDate)}
                      {s.endDate && s.endDate.getTime() !== s.startDate.getTime() && (
                        <> → {formatDate(s.endDate)}</>
                      )}
                    </span>
                  </div>
                </div>

                {/* Bouton valider */}
                <form
                  action={validateSessionAction.bind(null, s.id)}
                  className="flex-shrink-0"
                >
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <CheckSquare className="h-4 w-4" />
                    Valider
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section B — Mes sessions à venir */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Mes sessions à venir</h2>
          {sessionsAvenir.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              {sessionsAvenir.length}
            </span>
          )}
        </div>

        {sessionsAvenir.length === 0 ? (
          <div className="bg-card border border-border rounded-xl flex items-center justify-center py-12">
            <p className="text-muted-foreground text-sm">Aucune session à venir planifiée.</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground">Thème</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground">Client</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground">Début</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground">Fin</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sessionsAvenir.map((s) => {
                    const isConfirmee = s.status === "CONFIRMEE";
                    return (
                      <tr key={s.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="px-6 py-3 text-sm font-medium text-foreground">
                          {s.theme.code}
                          {s.theme.label && (
                            <span className="text-muted-foreground font-normal ml-1 hidden sm:inline">
                              — {s.theme.label}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-sm text-muted-foreground">
                          {s.request.client.name}
                        </td>
                        <td className="px-6 py-3 text-sm text-foreground">
                          {formatDate(s.startDate)}
                        </td>
                        <td className="px-6 py-3 text-sm text-foreground">
                          {formatDate(s.endDate)}
                        </td>
                        <td className="px-6 py-3">
                          {isConfirmee ? (
                            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/15 text-green-400 border border-green-500/30 w-fit">
                              <CheckCircle className="h-3 w-3" />
                              Confirmée
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 w-fit">
                              <Clock className="h-3 w-3" />
                              Provisoire
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
