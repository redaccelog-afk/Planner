import { db } from "@ccelog/db";
import Link from "next/link";
import { Plus, Clock, Users } from "lucide-react";

export const metadata = { title: "Thèmes de formation" };

const CATEGORY_LABELS: Record<string, string> = {
  CACES: "CACES",
  VR: "Réalité Virtuelle",
  SECURITE: "Sécurité",
  SECOURISME: "Secourisme",
  AUTRE: "Autre",
};

const CATEGORY_COLORS: Record<string, string> = {
  CACES: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  VR: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  SECURITE: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  SECOURISME: "bg-red-500/10 text-red-400 border-red-500/20",
  AUTRE: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

export default async function ThemesPage() {
  const themes = await db.theme.findMany({
    where: { active: true },
    include: {
      _count: { select: { trainers: true, sessions: true } },
      consumableNeeds: { include: { consumable: true } },
      materialNeeds: { include: { material: true } },
    },
    orderBy: [{ category: "asc" }, { label: "asc" }],
  });

  const grouped = themes.reduce<Record<string, typeof themes>>((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Thèmes de formation</h1>
          <p className="text-sm text-muted-foreground mt-1">{themes.length} thème(s)</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" />
          Nouveau thème
        </button>
      </div>

      {Object.entries(grouped).map(([category, categoryThemes]) => (
        <div key={category} className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {CATEGORY_LABELS[category] ?? category}
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {categoryThemes.map((theme) => (
              <div
                key={theme.id}
                className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground text-sm leading-snug">{theme.label}</p>
                    <code className="text-xs text-muted-foreground font-mono">{theme.code}</code>
                  </div>
                  <span
                    className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium border ${
                      CATEGORY_COLORS[theme.category] ?? ""
                    }`}
                  >
                    {CATEGORY_LABELS[theme.category] ?? theme.category}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {theme.durationDays} jour(s)
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {theme._count.trainers} formateur(s)
                  </span>
                  <span>{theme._count.sessions} session(s)</span>
                </div>

                {(theme.consumableNeeds.length > 0 || theme.materialNeeds.length > 0) && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      {theme.consumableNeeds.length} consommable(s) · {theme.materialNeeds.length} matériel(s)
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
