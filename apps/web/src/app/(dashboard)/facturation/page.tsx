import { db } from "@ccelog/db";
import { InvoiceStatus } from "@ccelog/db";
import { Receipt, AlertCircle, CheckCircle2, Clock, XCircle, TrendingUp } from "lucide-react";
import { createInvoiceAction } from "./actions";

export const metadata = { title: "Facturation client" };

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  BROUILLON: "Brouillon",
  EMISE: "Émise",
  ENVOYEE_CLIENT: "Envoyée",
  PAYEE: "Payée",
  EN_RETARD: "En retard",
  ANNULEE: "Annulée",
};

const STATUS_STYLE: Record<InvoiceStatus, string> = {
  BROUILLON: "bg-secondary text-muted-foreground border-border",
  EMISE: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  ENVOYEE_CLIENT: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  PAYEE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  EN_RETARD: "bg-red-500/10 text-red-400 border-red-500/20",
  ANNULEE: "bg-secondary text-muted-foreground border-border line-through",
};

function StatusIcon({ status }: { status: InvoiceStatus }) {
  if (status === "PAYEE") return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (status === "EN_RETARD") return <AlertCircle className="h-3.5 w-3.5" />;
  if (status === "ANNULEE") return <XCircle className="h-3.5 w-3.5" />;
  return <Clock className="h-3.5 w-3.5" />;
}

export default async function FacturationPage() {
  const [invoices, overdueCount] = await Promise.all([
    db.invoice.findMany({
      include: {
        client: true,
        lines: true,
        _count: { select: { lines: true } },
      },
      orderBy: { issueDate: "desc" },
      take: 100,
    }),
    db.invoice.count({
      where: { status: "EN_RETARD" },
    }),
  ]);

  // KPIs
  const totalPaid = invoices
    .filter((i) => i.status === "PAYEE")
    .reduce((s, i) => s + i.total, 0);
  const totalPending = invoices
    .filter((i) => ["EMISE", "ENVOYEE_CLIENT"].includes(i.status))
    .reduce((s, i) => s + i.total, 0);
  const totalOverdue = invoices
    .filter((i) => i.status === "EN_RETARD")
    .reduce((s, i) => s + i.total, 0);

  // Sessions clôturées sans facture (éligibles à la facturation)
  const billableSessions = await db.trainingSession.findMany({
    where: {
      status: "CONFIRMEE",
      invoiceLines: { none: {} },
    },
    include: {
      request: { include: { client: true } },
      theme: true,
      trainer: true,
    },
    orderBy: { endDate: "desc" },
    take: 20,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Facturation client</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {invoices.length} facture(s) · {overdueCount > 0 && (
              <span className="text-red-400 font-medium">{overdueCount} en retard</span>
            )}
          </p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Encaissé", value: totalPaid, color: "text-emerald-400", icon: CheckCircle2 },
          { label: "En attente", value: totalPending, color: "text-amber-400", icon: Clock },
          { label: "En retard", value: totalOverdue, color: "text-red-400", icon: AlertCircle },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-current/10 ${color}`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-lg font-bold ${color}`}>
                {value.toLocaleString("fr-MA")} MAD
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Invoice list */}
        <div className="xl:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Toutes les factures</h2>
          {invoices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm bg-card border border-border rounded-xl">
              Aucune facture émise.
            </div>
          ) : (
            <div className="space-y-2">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-4 hover:border-primary/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{inv.reference}</span>
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLE[inv.status]}`}
                      >
                        <StatusIcon status={inv.status} />
                        {STATUS_LABEL[inv.status]}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground mt-0.5 truncate">{inv.client.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(inv.issueDate).toLocaleDateString("fr-FR")}
                      {" · "}Échéance {new Date(inv.dueDate).toLocaleDateString("fr-FR")}
                      {" · "}{inv._count.lines} ligne(s)
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-foreground">{inv.total.toLocaleString("fr-MA")} MAD</p>
                    <p className="text-xs text-muted-foreground">TTC</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Billable sessions panel */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Sessions à facturer</h2>
            <span className="text-xs text-muted-foreground">{billableSessions.length} session(s)</span>
          </div>

          {billableSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm bg-card border border-border rounded-xl">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-30" />
              Toutes les sessions confirmées sont facturées.
            </div>
          ) : (
            <div className="space-y-2">
              {billableSessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-card border border-border rounded-xl p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {session.request.client.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{session.theme.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(session.startDate).toLocaleDateString("fr-FR")}
                        {session.totalCost && ` · ${session.totalCost.toLocaleString("fr-MA")} MAD`}
                      </p>
                    </div>
                  </div>
                  <form action={createInvoiceAction}>
                    <input type="hidden" name="sessionId" value={session.id} />
                    <input type="hidden" name="clientId" value={session.request.clientId} />
                    <input type="hidden" name="amount" value={session.totalCost ?? 0} />
                    <input type="hidden" name="description" value={`${session.theme.label} — ${new Date(session.startDate).toLocaleDateString("fr-FR")}`} />
                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors"
                    >
                      <Receipt className="h-3.5 w-3.5" />
                      Créer la facture
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
