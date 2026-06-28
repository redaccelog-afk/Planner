import { db } from "@ccelog/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Users, Package, Wrench, CheckCircle, XCircle } from "lucide-react";
import { updateThemeAction, addConsumableNeedAction, removeConsumableNeedAction, addThemeConsumableAction, removeThemeConsumableAction } from "./actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const theme = await db.theme.findUnique({ where: { id }, select: { label: true } });
  if (!theme) return { title: "Thème introuvable" };
  return { title: theme.label };
}

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

export default async function ThemeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [theme, allConsumables, themeConsumables] = await Promise.all([
    db.theme.findUnique({
      where: { id },
      include: {
        consumableNeeds: {
          include: { consumable: true },
        },
        materialNeeds: {
          include: { material: true },
        },
        trainers: {
          include: { trainer: { select: { id: true, fullName: true, city: true, type: true, active: true } } },
          orderBy: [{ certified: "desc" }],
        },
        _count: { select: { sessions: true } },
      },
    }),
    db.consumable.findMany({ orderBy: { label: "asc" }, select: { id: true, label: true, unit: true } }),
    db.themeConsumable.findMany({ where: { themeId: id }, include: { consumable: true } }),
  ]);

  if (!theme) notFound();

  const linkedConsumableIds = new Set(theme.consumableNeeds.map((n) => n.consumableId));
  const availableConsumables = allConsumables.filter((c) => !linkedConsumableIds.has(c.id));

  const linkedArticleIds = new Set(themeConsumables.map((tc) => tc.consumableId));
  const availableArticles = allConsumables.filter((c) => !linkedArticleIds.has(c.id));

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back */}
      <Link href="/themes" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Retour aux thèmes
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <code className="text-xs text-muted-foreground font-mono bg-secondary px-2 py-0.5 rounded">{theme.code}</code>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${CATEGORY_COLORS[theme.category] ?? ""}`}>
              {CATEGORY_LABELS[theme.category] ?? theme.category}
            </span>
            {theme.active ? (
              <span className="flex items-center gap-1 text-xs text-green-400">
                <CheckCircle className="h-3.5 w-3.5" /> Actif
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <XCircle className="h-3.5 w-3.5" /> Inactif
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground">{theme.label}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" /> {theme.durationDays} jour(s)
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" /> {theme.trainers.length} formateur(s)
            </span>
            <span>{theme._count.sessions} session(s)</span>
          </div>
        </div>
      </div>

      {/* Formulaire de modification */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Modifier le thème</h2>
        </div>
        <form action={updateThemeAction} className="p-6 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={theme.id} />

          <div className="sm:col-span-2 flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Libellé
            </label>
            <input
              name="label"
              type="text"
              required
              defaultValue={theme.label}
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Durée (jours)
            </label>
            <input
              name="durationDays"
              type="number"
              min="1"
              required
              defaultValue={theme.durationDays}
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Statut
            </label>
            <select
              name="active"
              defaultValue={theme.active ? "true" : "false"}
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="true">Actif</option>
              <option value="false">Inactif</option>
            </select>
          </div>

          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Enregistrer les modifications
            </button>
          </div>
        </form>
      </div>

      {/* Formateurs qualifiés */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-border">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Formateurs qualifiés</h2>
          <span className="ml-auto text-xs text-muted-foreground">{theme.trainers.length}</span>
        </div>
        {theme.trainers.length === 0 ? (
          <p className="text-sm text-muted-foreground px-6 py-6 text-center">Aucun formateur qualifié.</p>
        ) : (
          <div className="divide-y divide-border">
            {theme.trainers.map((tt) => (
              <div key={tt.trainerId} className="flex items-center px-6 py-3 gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/formateurs/${tt.trainerId}`}
                      className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {tt.trainer.fullName}
                    </Link>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${tt.trainer.type === "INTERNE" ? "bg-blue-500/10 text-blue-400" : "bg-gray-500/10 text-muted-foreground"}`}>
                      {tt.trainer.type}
                    </span>
                    {!tt.trainer.active && (
                      <span className="text-xs text-muted-foreground">(inactif)</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{tt.trainer.city}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  {tt.certified ? (
                    <span className="flex items-center gap-1 text-xs text-green-400">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Certifié
                      {tt.certifiedUntil && (
                        <span className="text-muted-foreground">
                          {" "}jusqu&apos;au {new Date(tt.certifiedUntil).toLocaleDateString("fr-MA")}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Non certifié</span>
                  )}
                  {tt.ratePerDay && (
                    <p className="text-xs text-muted-foreground">{tt.ratePerDay.toLocaleString("fr-MA")} MAD/j</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Besoins consommables */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-border">
          <Package className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Besoins en consommables</h2>
          <span className="ml-auto text-xs text-muted-foreground">{theme.consumableNeeds.length}</span>
        </div>

        {theme.consumableNeeds.length === 0 ? (
          <p className="text-sm text-muted-foreground px-6 py-4 text-center">Aucun besoin consommable défini.</p>
        ) : (
          <div className="divide-y divide-border">
            {theme.consumableNeeds.map((need) => (
              <div key={need.consumableId} className="flex items-center px-6 py-3 gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{need.consumable.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {need.qtyPerParticipant} {need.consumable.unit}(s) / participant
                  </p>
                </div>
                <form action={removeConsumableNeedAction}>
                  <input type="hidden" name="themeId" value={theme.id} />
                  <input type="hidden" name="consumableId" value={need.consumableId} />
                  <button
                    type="submit"
                    className="text-xs text-destructive hover:text-destructive/80 transition-colors px-2 py-1 rounded hover:bg-destructive/10"
                  >
                    Retirer
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}

        {/* Ajouter un besoin consommable */}
        {availableConsumables.length > 0 && (
          <form action={addConsumableNeedAction} className="px-6 py-4 border-t border-border flex gap-3 items-end flex-wrap">
            <input type="hidden" name="themeId" value={theme.id} />
            <div className="flex flex-col gap-1 flex-1 min-w-40">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Consommable
              </label>
              <select
                name="consumableId"
                required
                className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">— Sélectionner —</option>
                {availableConsumables.map((c) => (
                  <option key={c.id} value={c.id}>{c.label} ({c.unit})</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Qté/participant
              </label>
              <input
                name="qtyPerParticipant"
                type="number"
                min="0.1"
                step="0.1"
                defaultValue="1"
                required
                className="h-9 w-24 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              type="submit"
              className="h-9 px-4 bg-secondary border border-border text-sm text-foreground rounded-lg hover:bg-secondary/70 transition-colors"
            >
              Ajouter
            </button>
          </form>
        )}
      </div>

      {/* Besoins matériels */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-border">
          <Wrench className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Besoins en matériels</h2>
          <span className="ml-auto text-xs text-muted-foreground">{theme.materialNeeds.length}</span>
        </div>
        {theme.materialNeeds.length === 0 ? (
          <p className="text-sm text-muted-foreground px-6 py-6 text-center">Aucun besoin matériel défini.</p>
        ) : (
          <div className="divide-y divide-border">
            {theme.materialNeeds.map((need) => (
              <div key={need.materialId} className="flex items-center px-6 py-3 gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{need.material.label}</p>
                  <p className="text-xs text-muted-foreground">{need.material.category}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium text-foreground">×{need.quantity}</p>
                  {need.required && (
                    <p className="text-xs text-orange-400">Requis</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Articles requis */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-border">
          <Package className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Articles requis</h2>
          <span className="ml-auto text-xs text-muted-foreground">{themeConsumables.length}</span>
        </div>

        {themeConsumables.length === 0 ? (
          <p className="text-sm text-muted-foreground px-6 py-4 text-center">Aucun article requis défini.</p>
        ) : (
          <div className="divide-y divide-border">
            {themeConsumables.map((tc) => (
              <div key={tc.id} className="flex items-center px-6 py-3 gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{tc.consumable.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {tc.quantity} {tc.consumable.unit}(s)
                  </p>
                </div>
                <form
                  action={async () => {
                    "use server";
                    await removeThemeConsumableAction(tc.id);
                  }}
                >
                  <button
                    type="submit"
                    className="text-xs text-destructive hover:text-destructive/80 transition-colors px-2 py-1 rounded hover:bg-destructive/10"
                  >
                    Retirer
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}

        {/* Ajouter un article requis */}
        {availableArticles.length > 0 && (
          <form action={addThemeConsumableAction} className="px-6 py-4 border-t border-border flex gap-3 items-end flex-wrap">
            <input type="hidden" name="themeId" value={theme.id} />
            <div className="flex flex-col gap-1 flex-1 min-w-40">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Article
              </label>
              <select
                name="consumableId"
                required
                className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">— Sélectionner —</option>
                {availableArticles.map((c) => (
                  <option key={c.id} value={c.id}>{c.label} ({c.unit})</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Quantité
              </label>
              <input
                name="quantity"
                type="number"
                min="1"
                step="1"
                defaultValue="1"
                required
                className="h-9 w-24 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              type="submit"
              className="h-9 px-4 bg-secondary border border-border text-sm text-foreground rounded-lg hover:bg-secondary/70 transition-colors"
            >
              Ajouter
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
