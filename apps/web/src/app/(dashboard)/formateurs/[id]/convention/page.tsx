import { db } from "@ccelog/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, FileText, CheckCircle2, AlertTriangle, XCircle, ExternalLink } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { createFrameworkAction, updateFrameworkStatusAction } from "./actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trainer = await db.trainer.findUnique({ where: { id }, select: { fullName: true } });
  if (!trainer) return { title: "Formateur introuvable" };
  return { title: `Conventions — ${trainer.fullName}` };
}

export default async function ConventionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const trainer = await db.trainer.findUnique({
    where: { id },
    include: {
      frameworks: {
        orderBy: { signedAt: "desc" },
      },
    },
  });

  if (!trainer) notFound();
  if (trainer.type !== "EXTERNE") {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Link href={`/formateurs/${id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Retour au profil
        </Link>
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <p className="text-muted-foreground">Les conventions cadre s&apos;appliquent uniquement aux formateurs externes.</p>
        </div>
      </div>
    );
  }

  const activeFramework = trainer.frameworks.find((f) => f.status === "ACTIF");

  const statusConfig = {
    ACTIF: {
      icon: <CheckCircle2 className="h-4 w-4" />,
      label: "Active",
      className: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    EXPIRE: {
      icon: <AlertTriangle className="h-4 w-4" />,
      label: "Expirée",
      className: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
    RESILIE: {
      icon: <XCircle className="h-4 w-4" />,
      label: "Résiliée",
      className: "text-red-400 bg-red-500/10 border-red-500/20",
    },
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/formateurs" className="hover:text-foreground transition-colors">
          Formateurs
        </Link>
        <span>/</span>
        <Link href={`/formateurs/${id}`} className="hover:text-foreground transition-colors">
          {trainer.fullName}
        </Link>
        <span>/</span>
        <span>Conventions cadre</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Conventions cadre</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {trainer.frameworks.length} convention(s) ·{" "}
            {activeFramework ? (
              <span className="text-emerald-400">1 active</span>
            ) : (
              <span className="text-amber-400">Aucune active (R14)</span>
            )}
          </p>
        </div>
      </div>

      {/* R14 warning */}
      {!activeFramework && (
        <div className="flex items-center gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
          <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0" />
          <p className="text-sm text-foreground">
            <span className="font-semibold text-amber-400">Règle R14 :</span> Ce formateur n&apos;a pas de convention cadre active.
            Il ne peut pas être assigné à des sessions.
          </p>
        </div>
      )}

      {/* Frameworks list */}
      {trainer.frameworks.length > 0 ? (
        <div className="space-y-4">
          {trainer.frameworks.map((fw) => {
            const sc = statusConfig[fw.status];
            const isExpiredSoon =
              fw.status === "ACTIF" &&
              new Date(fw.validUntil).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;

            return (
              <div
                key={fw.id}
                className={`bg-card border rounded-xl p-5 ${
                  fw.status === "ACTIF" ? "border-emerald-500/20" : "border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${sc.className}`}
                    >
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground">{fw.reference}</p>
                        <span
                          className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${sc.className}`}
                        >
                          {sc.icon}
                          {sc.label}
                        </span>
                        {isExpiredSoon && (
                          <span className="text-xs px-2 py-0.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-full">
                            Expire bientôt
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Signé le {formatDate(fw.signedAt)} · Expire le {formatDate(fw.validUntil)}
                      </p>
                    </div>
                  </div>

                  {fw.fileUrl && (
                    <a
                      href={fw.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline flex-shrink-0"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Voir PDF
                    </a>
                  )}
                </div>

                {fw.notes && (
                  <p className="mt-3 text-sm text-muted-foreground border-t border-border pt-3">
                    {fw.notes}
                  </p>
                )}

                {/* Actions */}
                {fw.status === "ACTIF" && (
                  <div className="mt-4 pt-3 border-t border-border flex gap-2">
                    <form action={updateFrameworkStatusAction}>
                      <input type="hidden" name="id" value={fw.id} />
                      <input type="hidden" name="trainerId" value={trainer.id} />
                      <input type="hidden" name="status" value="RESILIE" />
                      <button
                        type="submit"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 border border-red-500/20 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Résilier
                      </button>
                    </form>
                    <form action={updateFrameworkStatusAction}>
                      <input type="hidden" name="id" value={fw.id} />
                      <input type="hidden" name="trainerId" value={trainer.id} />
                      <input type="hidden" name="status" value="EXPIRE" />
                      <button
                        type="submit"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-amber-400 border border-amber-500/20 hover:bg-amber-500/10 rounded-lg transition-colors"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Marquer expirée
                      </button>
                    </form>
                  </div>
                )}

                {fw.status !== "ACTIF" && (
                  <div className="mt-4 pt-3 border-t border-border">
                    <form action={updateFrameworkStatusAction}>
                      <input type="hidden" name="id" value={fw.id} />
                      <input type="hidden" name="trainerId" value={trainer.id} />
                      <input type="hidden" name="status" value="ACTIF" />
                      <button
                        type="submit"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10 rounded-lg transition-colors"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Réactiver
                      </button>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Aucune convention enregistrée.</p>
        </div>
      )}

      {/* Add framework form */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-border">
          <Plus className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Nouvelle convention cadre</h2>
        </div>
        <form action={createFrameworkAction} className="p-6 space-y-4">
          <input type="hidden" name="trainerId" value={trainer.id} />
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground block mb-1">
                Référence <span className="text-red-400">*</span>
              </label>
              <input
                name="reference"
                required
                placeholder="CC-2025-001"
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                Date de signature <span className="text-red-400">*</span>
              </label>
              <input
                name="signedAt"
                type="date"
                required
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                Date d&apos;expiration <span className="text-red-400">*</span>
              </label>
              <input
                name="validUntil"
                type="date"
                required
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground block mb-1">URL du PDF signé</label>
              <input
                name="fileUrl"
                type="url"
                placeholder="https://..."
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground block mb-1">Notes</label>
              <textarea
                name="notes"
                rows={3}
                placeholder="Conditions particulières, remarques..."
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Enregistrer la convention
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
