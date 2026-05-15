import { db } from "@ccelog/db";
import { PrestationStatus } from "@ccelog/db";
import { ShoppingCart, FileCheck, AlertTriangle, CheckCircle2 } from "lucide-react";
import { emitPurchaseOrderAction } from "./actions";

export const metadata = { title: "Achats externes" };

const STATUS_LABEL: Record<PrestationStatus, string> = {
  BROUILLON: "Brouillon",
  BON_COMMANDE_EMIS: "BdC émis",
  BON_COMMANDE_ACCEPTE: "BdC accepté",
  FACTURE_RECUE: "Facture reçue",
  VALIDE: "Validé",
  PAYE: "Payé",
  LITIGE: "Litige",
};

const STATUS_STYLE: Record<PrestationStatus, string> = {
  BROUILLON: "bg-secondary text-muted-foreground border-border",
  BON_COMMANDE_EMIS: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  BON_COMMANDE_ACCEPTE: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  FACTURE_RECUE: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  VALIDE: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  PAYE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  LITIGE: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default async function AchatsPage() {
  const [prestations, sessionsNeedingPrestation] = await Promise.all([
    db.prestation.findMany({
      include: {
        trainer: true,
        session: {
          include: {
            theme: true,
            request: { include: { client: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    // Sessions with external trainers that have no prestation yet
    db.trainingSession.findMany({
      where: {
        trainer: { type: "EXTERNE" },
        prestation: null,
        status: { in: ["PROVISOIRE", "CONFIRMEE"] },
      },
      include: {
        trainer: true,
        theme: true,
        request: { include: { client: true } },
      },
      orderBy: { startDate: "asc" },
      take: 20,
    }),
  ]);

  // KPIs
  const totalEngaged = prestations
    .filter((p) => !["BROUILLON", "LITIGE"].includes(p.status))
    .reduce((s, p) => s + p.totalAmount, 0);
  const totalPaid = prestations
    .filter((p) => p.status === "PAYE")
    .reduce((s, p) => s + p.totalAmount, 0);
  const pendingValidation = prestations.filter((p) => p.status === "FACTURE_RECUE").length;
  const coherenceIssues = prestations.filter((p) => p.coherenceCheck === false).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Achats externes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Bons de commande et factures formateurs externes
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total engagé", value: `${totalEngaged.toLocaleString("fr-MA")} MAD`, color: "text-foreground", Icon: ShoppingCart },
          { label: "Payé", value: `${totalPaid.toLocaleString("fr-MA")} MAD`, color: "text-emerald-400", Icon: CheckCircle2 },
          { label: "Factures à valider", value: pendingValidation, color: "text-amber-400", Icon: FileCheck },
          { label: "Anomalies R15", value: coherenceIssues, color: coherenceIssues > 0 ? "text-red-400" : "text-muted-foreground", Icon: AlertTriangle },
        ].map(({ label, value, color, Icon }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`h-4 w-4 ${color}`} />
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Prestation list */}
        <div className="xl:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Prestations externes</h2>
          {prestations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm bg-card border border-border rounded-xl">
              Aucune prestation externe enregistrée.
            </div>
          ) : (
            <div className="space-y-2">
              {prestations.map((p) => (
                <div
                  key={p.id}
                  className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-4 hover:border-primary/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {p.poReference && (
                        <span className="font-mono text-xs text-muted-foreground">{p.poReference}</span>
                      )}
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLE[p.status]}`}
                      >
                        {STATUS_LABEL[p.status]}
                      </span>
                      {p.coherenceCheck === false && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border bg-red-500/10 text-red-400 border-red-500/20">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          Anomalie R15
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-foreground mt-0.5">{p.trainer.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.session.theme.label}
                      {" · "}
                      {new Date(p.session.startDate).toLocaleDateString("fr-FR")}
                      {" · "}
                      {p.daysCount}j × {p.agreedRate.toLocaleString("fr-MA")} MAD
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-foreground">{p.totalAmount.toLocaleString("fr-MA")} MAD</p>
                    {p.invoiceAmount && p.invoiceAmount !== p.totalAmount && (
                      <p className="text-xs text-red-400">
                        Facturé: {p.invoiceAmount.toLocaleString("fr-MA")}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sessions pending PO */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Sessions sans BdC</h2>
            <span className="text-xs text-muted-foreground">{sessionsNeedingPrestation.length}</span>
          </div>

          {sessionsNeedingPrestation.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm bg-card border border-border rounded-xl">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
              Tous les BdC sont émis.
            </div>
          ) : (
            <div className="space-y-2">
              {sessionsNeedingPrestation.map((session) => {
                const durationDays = session.theme.durationDays ?? 1;
                const rate = session.trainer.defaultDayRate ?? 0;
                const total = durationDays * rate;

                return (
                  <div key={session.id} className="bg-card border border-border rounded-xl p-3 space-y-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{session.trainer.fullName}</p>
                      <p className="text-xs text-muted-foreground">{session.theme.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(session.startDate).toLocaleDateString("fr-FR")}
                        {" · "}
                        {session.request.client.name}
                        {rate > 0 && ` · ~${total.toLocaleString("fr-MA")} MAD`}
                      </p>
                    </div>
                    <form action={emitPurchaseOrderAction}>
                      <input type="hidden" name="sessionId" value={session.id} />
                      <input type="hidden" name="trainerId" value={session.trainerId} />
                      <input type="hidden" name="agreedRate" value={rate} />
                      <input type="hidden" name="daysCount" value={durationDays} />
                      <button
                        type="submit"
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors"
                      >
                        <ShoppingCart className="h-3.5 w-3.5" />
                        Émettre le BdC
                      </button>
                    </form>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
