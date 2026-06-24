import { db } from "@ccelog/db";
import { FileText, Plus, ToggleLeft, ToggleRight } from "lucide-react";
import { createTemplateAction, toggleTemplateAction, updateTemplateAction } from "./actions";

export const metadata = { title: "Modèles d'attestations" };

export default async function TemplatesPage() {
  const [templates, themes] = await Promise.all([
    db.attestationTemplate.findMany({
      orderBy: { code: "asc" },
    }),
    db.theme.findMany({ select: { id: true, code: true, label: true } }),
  ]);

  // Build a lookup map for themes by id
  const themeById = new Map(themes.map((t) => [t.id, t]));

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Modèles d&apos;attestations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez les 30 templates paramétrables (CDC Module 6)
          </p>
        </div>
        {/* "Nouveau template" opens the inline create form via details/summary */}
        <details className="group">
          <summary className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer list-none">
            <Plus className="h-4 w-4" />
            Nouveau template
          </summary>
          <div className="absolute mt-2 right-0 z-10 w-96 bg-card border border-border rounded-xl shadow-lg p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Créer un template</h3>
            <form action={createTemplateAction} className="space-y-3">
              <div className="space-y-1">
                <label htmlFor="create-name" className="block text-xs font-medium text-foreground">
                  Nom
                </label>
                <input
                  id="create-name"
                  name="name"
                  required
                  placeholder="Attestation CACES R489"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="create-code" className="block text-xs font-medium text-foreground">
                  Code unique
                </label>
                <input
                  id="create-code"
                  name="code"
                  required
                  placeholder="ATT_CACES_R489"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="create-nomenclature" className="block text-xs font-medium text-foreground">
                  Nomenclature
                </label>
                <input
                  id="create-nomenclature"
                  name="nomenclature"
                  required
                  placeholder="ATT-{YEAR}-{SEQ:4}"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <p className="text-[10px] text-muted-foreground">
                  Variables: {"{YEAR}"}, {"{SEQ:N}"}
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Créer
                </button>
              </div>
            </form>
          </div>
        </details>
      </div>

      {/* Template count summary */}
      <div className="flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-xl">
        <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
        <div>
          <span className="text-sm font-medium text-foreground">{templates.length} template(s) configuré(s)</span>
          <span className="text-xs text-muted-foreground ml-2">
            ({templates.filter((t) => t.active).length} actif(s))
          </span>
        </div>
      </div>

      {/* Template cards grid */}
      {templates.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">Aucun template configuré</p>
          <p className="text-xs text-muted-foreground mt-1">
            Créez votre premier modèle d&apos;attestation en cliquant sur &ldquo;Nouveau template&rdquo;.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((tpl) => {
            const linkedTheme = tpl.themeId ? themeById.get(tpl.themeId) : undefined;
            return (
              <div
                key={tpl.id}
                className={`bg-card border rounded-xl overflow-hidden ${
                  tpl.active ? "border-border" : "border-border/50 opacity-60"
                }`}
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-3 border-b border-border">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{tpl.name}</p>
                      <code className="text-[10px] text-muted-foreground font-mono">{tpl.code}</code>
                    </div>
                  </div>
                  {/* Active badge */}
                  {tpl.active ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shrink-0">
                      Actif
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border bg-secondary text-muted-foreground border-border shrink-0">
                      Inactif
                    </span>
                  )}
                </div>

                {/* Card body */}
                <div className="px-4 py-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Nomenclature</span>
                    <code className="text-foreground font-mono bg-background border border-border rounded px-1.5 py-0.5">
                      {tpl.nomenclature}
                    </code>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Dernier n°</span>
                    <span className="text-foreground font-medium">{tpl.lastSequence}</span>
                  </div>
                  {linkedTheme ? (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Thème lié</span>
                      <span className="text-foreground truncate max-w-[140px]" title={linkedTheme.label}>
                        {linkedTheme.code}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Thème lié</span>
                      <span className="text-muted-foreground/50 italic">—</span>
                    </div>
                  )}
                </div>

                {/* Inline edit form */}
                <details className="group border-t border-border">
                  <summary className="px-4 py-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer list-none select-none transition-colors">
                    Modifier...
                  </summary>
                  <form action={updateTemplateAction} className="px-4 pb-4 pt-2 space-y-3">
                    <input type="hidden" name="id" value={tpl.id} />
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-foreground">Nom</label>
                      <input
                        name="name"
                        required
                        defaultValue={tpl.name}
                        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-foreground">Nomenclature</label>
                      <input
                        name="nomenclature"
                        required
                        defaultValue={tpl.nomenclature}
                        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
                      >
                        Enregistrer
                      </button>
                    </div>
                  </form>
                  {/* Toggle active — separate form to avoid nested <form> */}
                  <form
                    action={toggleTemplateAction.bind(null, tpl.id, !tpl.active)}
                    className="px-4 pb-3"
                  >
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {tpl.active ? (
                        <ToggleRight className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <ToggleLeft className="h-4 w-4" />
                      )}
                      {tpl.active ? "Désactiver" : "Activer"}
                    </button>
                  </form>
                </details>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
