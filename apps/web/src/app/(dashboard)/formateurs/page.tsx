import { db } from "@ccelog/db";
import Link from "next/link";
import { Plus, MapPin, Phone, Users, ArrowRight } from "lucide-react";

export const metadata = { title: "Formateurs" };

export default async function FormateursPage() {
  const [trainers, pendingCount] = await Promise.all([
    db.trainer.findMany({
      where: { active: true },
      include: {
        themes: { include: { theme: true } },
        rates: { orderBy: { validFrom: "desc" }, take: 1 },
        _count: { select: { sessions: true } },
      },
      orderBy: [{ type: "asc" }, { fullName: "asc" }],
    }),
    db.preselection.count({
      where: { status: { in: ["CANDIDAT", "EN_EVALUATION"] } },
    }),
  ]);

  const internes = trainers.filter((t) => t.type === "INTERNE");
  const externes = trainers.filter((t) => t.type === "EXTERNE");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Formateurs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {internes.length} interne(s) · {externes.length} externe(s)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Presélection CTA */}
          <Link
            href="/formateurs/preselection"
            className="relative flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground border border-border rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors"
          >
            <Users className="h-4 w-4" />
            Présélection
            {pendingCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-5 w-5 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                {pendingCount}
              </span>
            )}
          </Link>
          <Link
            href="/formateurs/nouveau"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nouveau formateur
          </Link>
        </div>
      </div>

      {/* INTERNE section */}
      {internes.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
              INTERNE
            </span>
            <span className="text-xs text-muted-foreground">{internes.length} salarié(s) CCE LOG</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {internes.map((trainer) => (
              <TrainerCard key={trainer.id} trainer={trainer} />
            ))}
          </div>
        </section>
      )}

      {/* EXTERNE section */}
      {externes.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-semibold border border-amber-500/20">
              EXTERNE
            </span>
            <span className="text-xs text-muted-foreground">{externes.length} prestataire(s)</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {externes.map((trainer) => (
              <TrainerCard key={trainer.id} trainer={trainer} />
            ))}
          </div>
        </section>
      )}

      {trainers.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p>Aucun formateur actif.</p>
          <div className="flex items-center justify-center gap-4 mt-3">
            <Link href="/formateurs/preselection" className="text-primary hover:underline text-sm inline-flex items-center gap-1">
              Gérer les candidatures <ArrowRight className="h-3 w-3" />
            </Link>
            <Link href="/formateurs/nouveau" className="text-primary hover:underline text-sm inline-flex items-center gap-1">
              Ajouter directement <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Trainer card ──────────────────────────────────────────────────────────────

type TrainerWithRelations = Awaited<ReturnType<typeof db.trainer.findMany<{
  include: {
    themes: { include: { theme: true } };
    rates: true;
    _count: { select: { sessions: true } };
  };
}>>>[number];

function TrainerCard({ trainer }: { trainer: TrainerWithRelations }) {
  const lastRate = trainer.rates[0];
  const displayRate = lastRate?.ratePerDay ?? trainer.defaultDayRate;
  const isInterne = trainer.type === "INTERNE";

  return (
    <Link
      href={`/formateurs/${trainer.id}`}
      className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition-colors group"
    >
      {/* Avatar + Nom */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
          isInterne ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-400"
        }`}>
          {trainer.fullName.charAt(0)}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-foreground truncate text-sm">{trainer.fullName}</p>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${
              isInterne
                ? "bg-primary/10 text-primary"
                : "bg-amber-500/10 text-amber-400"
            }`}>
              {isInterne ? "INT" : "EXT"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{trainer._count.sessions} session(s)</p>
        </div>
        {displayRate && (
          <div className="ml-auto text-right flex-shrink-0">
            <p className="text-sm font-semibold text-foreground">
              {displayRate.toLocaleString("fr-MA")} MAD
            </p>
            <p className="text-xs text-muted-foreground">/jour</p>
          </div>
        )}
      </div>

      {/* Infos */}
      <div className="space-y-1.5 mb-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{trainer.city}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Phone className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{trainer.phone}</span>
        </div>
      </div>

      {/* Thèmes */}
      <div className="flex flex-wrap gap-1">
        {trainer.themes.slice(0, 3).map((tt) => (
          <span
            key={tt.themeId}
            className="px-2 py-0.5 bg-secondary text-xs text-muted-foreground rounded-full"
          >
            {tt.theme.code}
          </span>
        ))}
        {trainer.themes.length > 3 && (
          <span className="px-2 py-0.5 text-xs text-muted-foreground">
            +{trainer.themes.length - 3}
          </span>
        )}
      </div>
    </Link>
  );
}
