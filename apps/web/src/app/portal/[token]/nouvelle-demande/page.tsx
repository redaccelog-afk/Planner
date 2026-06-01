import { db } from "@ccelog/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { clientCreateRequestFormAction } from "@/app/portal/[token]/actions";

export const metadata = { title: "Nouvelle demande de formation" };

export default async function NouvelleDemandePortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Validate token
  const client = await db.client.findUnique({
    where: { portalToken: token },
    select: { id: true, name: true, portalTokenExpiry: true, active: true },
  });

  if (
    !client ||
    !client.active ||
    (client.portalTokenExpiry && client.portalTokenExpiry < new Date())
  ) {
    notFound();
  }

  // Fetch active themes for selection
  const themes = await db.theme.findMany({
    where: { active: true },
    select: { id: true, code: true, label: true, durationDays: true },
    orderBy: { code: "asc" },
  });

  async function handleSubmit(formData: FormData) {
    "use server";
    formData.set("token", token);
    await clientCreateRequestFormAction(formData);
    redirect(`/portal/${token}?success=1`);
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Link
        href={`/portal/${token}`}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour à mes demandes
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Nouvelle demande de formation</h1>
        <p className="text-muted-foreground mt-1">
          Remplissez ce formulaire pour soumettre une demande à CCE LOG.
        </p>
      </div>

      <form action={handleSubmit} className="space-y-6">
        {/* Thèmes */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Thème(s) souhaité(s)</h2>
          <div className="grid gap-2">
            {themes.map((theme) => (
              <label
                key={theme.code}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  name="themeCodes"
                  value={theme.code}
                  className="w-4 h-4 rounded border-border accent-blue-500"
                />
                <div>
                  <p className="text-sm font-medium text-foreground group-hover:text-blue-400 transition-colors">
                    {theme.code}
                  </p>
                  <p className="text-xs text-muted-foreground">{theme.label} — {theme.durationDays} jour(s)</p>
                </div>
              </label>
            ))}
            {themes.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun thème disponible actuellement.</p>
            )}
          </div>
        </div>

        {/* Participants & dates */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Détails de la formation</h2>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground" htmlFor="participants">
              Nombre de participants <span className="text-red-400">*</span>
            </label>
            <input
              id="participants"
              name="participants"
              type="number"
              min={1}
              max={200}
              defaultValue={10}
              required
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-foreground" htmlFor="desiredDateFrom">
                Date souhaitée (début)
              </label>
              <input
                id="desiredDateFrom"
                name="desiredDateFrom"
                type="date"
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-foreground" htmlFor="desiredDateTo">
                Date souhaitée (fin)
              </label>
              <input
                id="desiredDateTo"
                name="desiredDateTo"
                type="date"
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Informations complémentaires</h2>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground" htmlFor="notes">
              Notes / Contraintes particulières
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              placeholder="Ex. : Formation en intra-entreprise, contraintes de dates particulières, lieu souhaité..."
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="submit"
            className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
          >
            Envoyer la demande
          </button>
          <Link
            href={`/portal/${token}`}
            className="px-4 py-2.5 bg-secondary text-muted-foreground rounded-lg text-sm font-medium hover:text-foreground transition-colors"
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  );
}
