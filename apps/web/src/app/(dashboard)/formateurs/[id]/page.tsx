import { db } from "@ccelog/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  Building2,
  User,
  BookOpen,
  CalendarDays,
  CreditCard,
  FileText,
  CheckCircle2,
  XCircle,
  PencilLine,
  Plus,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { toggleActiveAction, addThemeAction, removeThemeAction, addRateAction } from "./actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trainer = await db.trainer.findUnique({ where: { id }, select: { fullName: true } });
  if (!trainer) return { title: "Formateur introuvable" };
  return { title: trainer.fullName };
}

export default async function FormateurDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const trainer = await db.trainer.findUnique({
    where: { id },
    include: {
      themes: {
        include: { theme: true },
        orderBy: { theme: { code: "asc" } },
      },
      rates: { orderBy: { validFrom: "desc" } },
      sessions: {
        include: {
          theme: true,
          request: { include: { client: true, site: true } },
        },
        orderBy: { startDate: "desc" },
        take: 5,
      },
      frameworks: { orderBy: { signedAt: "desc" } },
      negotiations: {
        include: { theme: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!trainer) notFound();

  const allThemes = await db.theme.findMany({
    where: { active: true },
    orderBy: { code: "asc" },
  });

  const activeFramework = trainer.frameworks.find((f) => f.status === "ACTIF");
  const isInterne = trainer.type === "INTERNE";
  const currentRate = trainer.rates[0];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <Link
        href="/formateurs"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux formateurs
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={`h-14 w-14 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0 ${
              isInterne
                ? "bg-primary/10 text-primary"
                : "bg-amber-500/10 text-amber-400"
            }`}
          >
            {trainer.fullName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="text-2xl font-bold text-foreground">{trainer.fullName}</h1>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  isInterne
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                }`}
              >
                {isInterne ? "INTERNE" : "EXTERNE"}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  trainer.active
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-secondary text-muted-foreground border border-border"
                }`}
              >
                {trainer.active ? "Actif" : "Inactif"}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {trainer.city}
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                {trainer.phone}
              </span>
              {trainer.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {trainer.email}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <form action={toggleActiveAction}>
            <input type="hidden" name="id" value={trainer.id} />
            <input type="hidden" name="active" value={String(trainer.active)} />
            <button
              type="submit"
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                trainer.active
                  ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
                  : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
              }`}
            >
              {trainer.active ? "Désactiver" : "Activer"}
            </button>
          </form>
          <Link
            href={`/formateurs/${id}/edit`}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-secondary-foreground border border-border rounded-lg text-xs font-medium hover:bg-secondary/80 transition-colors"
          >
            <PencilLine className="h-3.5 w-3.5" />
            Modifier
          </Link>
        </div>
      </div>

      {/* EXTERNE: convention cadre banner */}
      {!isInterne && (
        <div
          className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
            activeFramework
              ? "bg-emerald-500/5 border-emerald-500/20"
              : "bg-amber-500/5 border-amber-500/20"
          }`}
        >
          <div className="flex items-center gap-2">
            <FileText
              className={`h-4 w-4 ${activeFramework ? "text-emerald-400" : "text-amber-400"}`}
            />
            <span className="text-sm font-medium text-foreground">
              {activeFramework
                ? `Convention cadre active · Réf. ${activeFramework.reference} · Expire le ${formatDate(activeFramework.validUntil)}`
                : "Aucune convention cadre active (R14)"}
            </span>
          </div>
          <Link
            href={`/formateurs/${id}/convention`}
            className="text-xs text-primary hover:underline"
          >
            Gérer →
          </Link>
        </div>
      )}

      {/* Tabs layout: use sections with anchors */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* LEFT: Profile */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile card */}
          <section className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-foreground">Profil</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Nom complet" value={trainer.fullName} />
              <Field label="Ville" value={trainer.city} />
              <Field label="Téléphone" value={trainer.phone} />
              <Field label="Email" value={trainer.email ?? "—"} />
              {trainer.address && (
                <Field label="Adresse" value={trainer.address} className="col-span-2" />
              )}
            </div>

            {/* INTERNE fields */}
            {isInterne && (
              <div className="pt-4 border-t border-border">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">
                  Informations RH
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Matricule RH" value={trainer.employeeId ?? "—"} />
                  <Field
                    label="Coût employeur/jour"
                    value={trainer.employerCost ? formatCurrency(trainer.employerCost) : "—"}
                  />
                </div>
              </div>
            )}

            {/* EXTERNE fields */}
            {!isInterne && (
              <div className="pt-4 border-t border-border">
                <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3">
                  Informations légales & bancaires
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Statut juridique" value={trainer.legalStatus ?? "—"} />
                  <Field label="ICE" value={trainer.ice ?? "—"} />
                  <Field label="RC" value={trainer.rc ?? "—"} />
                  <Field label="IF Fiscal" value={trainer.ifFiscal ?? "—"} />
                  <Field label="CNSS" value={trainer.cnss ?? "—"} />
                  <Field label="IBAN" value={trainer.iban ?? "—"} />
                  <Field label="Banque" value={trainer.bankName ?? "—"} />
                  <Field
                    label="Délai paiement"
                    value={trainer.paymentTerms ? `${trainer.paymentTerms} jours` : "30 jours"}
                  />
                </div>
              </div>
            )}

            {trainer.notes && (
              <div className="pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-sm text-foreground whitespace-pre-line">{trainer.notes}</p>
              </div>
            )}
          </section>

          {/* Themes & Rates */}
          <section className="bg-card border border-border rounded-xl p-6" id="themes">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold text-foreground">Thèmes & Tarifs</h2>
              </div>
              <Link
                href={`/formateurs/${id}/negociation`}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <TrendingUp className="h-3.5 w-3.5" />
                Négociation
              </Link>
            </div>

            {/* Theme list */}
            {trainer.themes.length > 0 ? (
              <div className="space-y-2 mb-4">
                {trainer.themes.map((tt) => (
                  <div
                    key={tt.themeId}
                    className="flex items-center justify-between py-2 px-3 bg-secondary/40 rounded-lg"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{tt.theme.code}</p>
                      <p className="text-xs text-muted-foreground truncate">{tt.theme.label}</p>
                    </div>
                    <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                      {tt.certified && (
                        <span className="text-xs px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                          Certifié
                          {tt.certifiedUntil && ` · ${formatDate(tt.certifiedUntil)}`}
                        </span>
                      )}
                      {tt.ratePerDay !== null && tt.ratePerDay !== undefined ? (
                        <span className="text-sm font-semibold text-foreground">
                          {tt.ratePerDay.toLocaleString("fr-MA")} MAD/j
                        </span>
                      ) : currentRate ? (
                        <span className="text-sm text-muted-foreground">
                          {currentRate.ratePerDay.toLocaleString("fr-MA")} MAD/j*
                        </span>
                      ) : trainer.defaultDayRate ? (
                        <span className="text-sm text-muted-foreground">
                          {trainer.defaultDayRate.toLocaleString("fr-MA")} MAD/j*
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Tarif défaut</span>
                      )}
                      <form action={removeThemeAction}>
                        <input type="hidden" name="trainerId" value={trainer.id} />
                        <input type="hidden" name="themeId" value={tt.themeId} />
                        <button
                          type="submit"
                          className="p-1 rounded text-muted-foreground hover:text-red-400 transition-colors"
                          title="Retirer ce thème"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
                {currentRate && (
                  <p className="text-xs text-muted-foreground">
                    * Tarif par défaut (tarif spécifique non défini pour ce thème)
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mb-4">Aucun thème assigné.</p>
            )}

            {/* Add theme form */}
            <details className="border border-dashed border-border rounded-lg">
              <summary className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer list-none transition-colors">
                <Plus className="h-3.5 w-3.5" />
                Ajouter un thème
              </summary>
              <form action={addThemeAction} className="p-3 space-y-3 border-t border-border">
                <input type="hidden" name="trainerId" value={trainer.id} />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Thème *</label>
                    <select
                      name="themeId"
                      required
                      className="w-full px-3 py-1.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">— Choisir —</option>
                      {allThemes
                        .filter((t) => !trainer.themes.some((tt) => tt.themeId === t.id))
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.code} — {t.label}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">
                      Tarif spécifique (MAD/j)
                    </label>
                    <input
                      name="ratePerDay"
                      type="number"
                      min="0"
                      step="50"
                      className="w-full px-3 py-1.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Laisser vide = tarif défaut"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">
                      Certifié jusqu&apos;au
                    </label>
                    <input
                      name="certifiedUntil"
                      type="date"
                      className="w-full px-3 py-1.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="flex items-end pb-1.5">
                    <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                      <input
                        name="certified"
                        type="checkbox"
                        defaultChecked
                        className="rounded border-border"
                      />
                      Certifié
                    </label>
                  </div>
                </div>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
                >
                  Ajouter
                </button>
              </form>
            </details>
          </section>

          {/* Rates history */}
          <section className="bg-card border border-border rounded-xl p-6" id="tarifs">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-foreground">Historique des tarifs</h2>
              {currentRate && (
                <span className="ml-auto text-sm font-semibold text-foreground">
                  {formatCurrency(currentRate.ratePerDay)}/j (actuel)
                </span>
              )}
              {!currentRate && trainer.defaultDayRate && (
                <span className="ml-auto text-sm font-semibold text-foreground">
                  {formatCurrency(trainer.defaultDayRate)}/j (défaut)
                </span>
              )}
            </div>

            {trainer.rates.length > 0 ? (
              <div className="space-y-2 mb-4">
                {trainer.rates.map((rate, idx) => (
                  <div
                    key={rate.id}
                    className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                      idx === 0 ? "bg-primary/5 border border-primary/20" : "bg-secondary/30"
                    }`}
                  >
                    <div>
                      <span className="text-sm font-semibold text-foreground">
                        {rate.ratePerDay.toLocaleString("fr-MA")} MAD/j
                      </span>
                      {idx === 0 && (
                        <span className="ml-2 text-xs text-primary">En cours</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Depuis le {formatDate(rate.validFrom)}
                      {rate.validUntil && ` · jusqu&apos;au ${formatDate(rate.validUntil)}`}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mb-4">
                {trainer.defaultDayRate
                  ? `Tarif défaut: ${formatCurrency(trainer.defaultDayRate)}/j`
                  : "Aucun tarif défini."}
              </p>
            )}

            {/* Add rate form */}
            <details className="border border-dashed border-border rounded-lg">
              <summary className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer list-none transition-colors">
                <Plus className="h-3.5 w-3.5" />
                Ajouter un tarif
              </summary>
              <form action={addRateAction} className="p-3 space-y-3 border-t border-border">
                <input type="hidden" name="trainerId" value={trainer.id} />
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">
                      Tarif (MAD/j) *
                    </label>
                    <input
                      name="ratePerDay"
                      type="number"
                      required
                      min="0"
                      step="50"
                      className="w-full px-3 py-1.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">
                      Valable à partir du *
                    </label>
                    <input
                      name="validFrom"
                      type="date"
                      required
                      className="w-full px-3 py-1.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">
                      Jusqu&apos;au
                    </label>
                    <input
                      name="validUntil"
                      type="date"
                      className="w-full px-3 py-1.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
                >
                  Enregistrer le tarif
                </button>
              </form>
            </details>
          </section>

          {/* Recent sessions */}
          <section className="bg-card border border-border rounded-xl p-6" id="sessions">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold text-foreground">Dernières sessions</h2>
              </div>
              <Link
                href={`/sessions?trainer=${id}`}
                className="text-xs text-primary hover:underline"
              >
                Voir tout →
              </Link>
            </div>

            {trainer.sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune session enregistrée.</p>
            ) : (
              <div className="space-y-2">
                {trainer.sessions.map((session) => {
                  const statusColors: Record<string, string> = {
                    CONFIRMEE: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
                    PROVISOIRE: "text-amber-400 bg-amber-500/10 border-amber-500/20",
                    ANNULEE: "text-red-400 bg-red-500/10 border-red-500/20",
                    EN_COURS: "text-blue-400 bg-blue-500/10 border-blue-500/20",
                    TERMINEE: "text-gray-400 bg-gray-500/10 border-gray-500/20",
                  };
                  const statusLabels: Record<string, string> = {
                    CONFIRMEE: "Confirmée",
                    PROVISOIRE: "Provisoire",
                    ANNULEE: "Annulée",
                    EN_COURS: "En cours",
                    TERMINEE: "Terminée",
                  };
                  return (
                    <Link
                      key={session.id}
                      href={`/sessions/${session.id}`}
                      className="flex items-center justify-between py-2 px-3 bg-secondary/30 hover:bg-secondary/60 rounded-lg transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{session.theme.code}</p>
                        <p className="text-xs text-muted-foreground">
                          {session.request.client.name} · {session.request.site.city}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded border font-medium ${statusColors[session.status]}`}
                        >
                          {statusLabels[session.status]}
                        </span>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(session.startDate)}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* RIGHT: sidebar */}
        <div className="space-y-4">
          {/* Quick stats */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Résumé
            </h3>
            <StatRow label="Sessions" value={String(trainer.sessions.length)} />
            <StatRow label="Thèmes" value={String(trainer.themes.length)} />
            {!isInterne && (
              <StatRow
                label="Convention"
                value={activeFramework ? "Active" : "Aucune"}
                accent={activeFramework ? "success" : "warning"}
              />
            )}
            <StatRow
              label="Statut"
              value={trainer.active ? "Actif" : "Inactif"}
              accent={trainer.active ? "success" : "muted"}
            />
          </div>

          {/* For EXTERNE: conventions summary */}
          {!isInterne && trainer.frameworks.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Conventions cadre
                </h3>
                <Link
                  href={`/formateurs/${id}/convention`}
                  className="text-xs text-primary hover:underline"
                >
                  Gérer →
                </Link>
              </div>
              <div className="space-y-2">
                {trainer.frameworks.slice(0, 3).map((fw) => {
                  const fwColors = {
                    ACTIF: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
                    EXPIRE: "text-amber-400 bg-amber-500/10 border-amber-500/20",
                    RESILIE: "text-red-400 bg-red-500/10 border-red-500/20",
                  };
                  return (
                    <div key={fw.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-foreground">{fw.reference}</p>
                        <p className="text-xs text-muted-foreground">
                          jusqu&apos;au {formatDate(fw.validUntil)}
                        </p>
                      </div>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${fwColors[fw.status]}`}
                      >
                        {fw.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick links */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-1">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Actions
            </h3>
            {!isInterne && (
              <>
                <QuickLink href={`/formateurs/${id}/convention`} icon={<FileText className="h-3.5 w-3.5" />} label="Conventions cadre" />
                <QuickLink href={`/formateurs/${id}/negociation`} icon={<TrendingUp className="h-3.5 w-3.5" />} label="Négociation tarifaire" />
              </>
            )}
            <QuickLink
              href={`/formateurs/${id}/edit`}
              icon={<PencilLine className="h-3.5 w-3.5" />}
              label="Modifier le profil"
            />
            <QuickLink
              href={`/sessions?trainer=${id}`}
              icon={<CalendarDays className="h-3.5 w-3.5" />}
              label="Toutes les sessions"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function Field({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm text-foreground font-medium">{value || "—"}</p>
    </div>
  );
}

function StatRow({
  label,
  value,
  accent = "default",
}: {
  label: string;
  value: string;
  accent?: "default" | "success" | "warning" | "muted";
}) {
  const colors = {
    default: "text-foreground",
    success: "text-emerald-400",
    warning: "text-amber-400",
    muted: "text-muted-foreground",
  };
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xs font-semibold ${colors[accent]}`}>{value}</span>
    </div>
  );
}

function QuickLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors"
    >
      {icon}
      {label}
    </Link>
  );
}

// Silence unused import warning — CheckCircle2 and XCircle used conditionally via JSX
const _unused = { CheckCircle2, XCircle, Building2 };
void _unused;
