import { db } from "@ccelog/db";
import { InvoiceStatus } from "@ccelog/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Download,
  Trash2,
  Send,
  CreditCard,
  PlusCircle,
  MinusCircle,
} from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import {
  emitInvoiceAction,
  markSentAction,
  markPaidAction,
  addLineAction,
  removeLineAction,
} from "./actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inv = await db.invoice.findUnique({ where: { id }, include: { client: true } });
  if (!inv) return { title: "Facture introuvable" };
  return { title: `${inv.reference} — ${inv.client.name}` };
}

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  BROUILLON: "Brouillon",
  EMISE: "Émise",
  ENVOYEE_CLIENT: "Envoyée au client",
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
  ANNULEE: "bg-secondary text-muted-foreground border-border",
};

function StatusIcon({ status }: { status: InvoiceStatus }) {
  if (status === "PAYEE") return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (status === "EN_RETARD") return <AlertCircle className="h-3.5 w-3.5" />;
  if (status === "ANNULEE") return <XCircle className="h-3.5 w-3.5" />;
  return <Clock className="h-3.5 w-3.5" />;
}

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const invoice = await db.invoice.findUnique({
    where: { id },
    include: {
      client: true,
      lines: {
        include: { session: { include: { theme: true } } },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!invoice) notFound();

  // Timeline events
  type TimelineEvent = { label: string; date: Date | null; done: boolean };
  const timeline: TimelineEvent[] = [
    { label: "Créée (brouillon)", date: invoice.issueDate, done: true },
    {
      label: "Émise",
      date: ["EMISE", "ENVOYEE_CLIENT", "PAYEE", "EN_RETARD"].includes(invoice.status)
        ? invoice.issueDate
        : null,
      done: ["EMISE", "ENVOYEE_CLIENT", "PAYEE", "EN_RETARD"].includes(invoice.status),
    },
    {
      label: "Envoyée au client",
      date: ["ENVOYEE_CLIENT", "PAYEE", "EN_RETARD"].includes(invoice.status)
        ? invoice.issueDate
        : null,
      done: ["ENVOYEE_CLIENT", "PAYEE", "EN_RETARD"].includes(invoice.status),
    },
    {
      label: "Payée",
      date: invoice.paidAt,
      done: invoice.status === "PAYEE",
    },
  ];

  const canAddLines = invoice.status === "BROUILLON";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back */}
      <Link
        href="/facturation"
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour à la facturation
      </Link>

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${STATUS_STYLE[invoice.status]}`}
            >
              <StatusIcon status={invoice.status} />
              {STATUS_LABEL[invoice.status]}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-foreground font-mono">{invoice.reference}</h1>
          <p className="text-muted-foreground mt-1">{invoice.client.name}</p>
          <p className="text-sm text-muted-foreground">
            Émise le {formatDate(invoice.issueDate)} · Échéance le {formatDate(invoice.dueDate)}
          </p>
        </div>

        {/* Action buttons by status */}
        <div className="flex items-center gap-2 flex-wrap">
          {invoice.status === "BROUILLON" && (
            <>
              <form action={emitInvoiceAction}>
                <input type="hidden" name="id" value={invoice.id} />
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <Send className="h-4 w-4" />
                  Émettre la facture
                </button>
              </form>
              <button
                type="button"
                className="flex items-center gap-1.5 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-colors"
                title="Suppression non disponible — contactez l'administrateur"
                disabled
              >
                <Trash2 className="h-4 w-4" />
                Supprimer
              </button>
            </>
          )}

          {invoice.status === "EMISE" && (
            <>
              <form action={markSentAction}>
                <input type="hidden" name="id" value={invoice.id} />
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg text-sm font-medium hover:bg-amber-500/20 transition-colors"
                >
                  <Send className="h-4 w-4" />
                  Marquer envoyée au client
                </button>
              </form>
              <button
                type="button"
                className="flex items-center gap-1.5 px-4 py-2 bg-secondary text-foreground border border-border rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors"
              >
                <Download className="h-4 w-4" />
                Télécharger PDF
              </button>
            </>
          )}

          {(invoice.status === "ENVOYEE_CLIENT" || invoice.status === "EN_RETARD") && (
            <>
              <button
                type="button"
                className="flex items-center gap-1.5 px-4 py-2 bg-secondary text-foreground border border-border rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors"
              >
                <Send className="h-4 w-4" />
                Relance manuelle
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Lines table ── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Lignes de facturation</h2>
          <span className="text-xs text-muted-foreground">{invoice.lines.length} ligne(s)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Description
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-20">
                  Qté
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-32">
                  Prix unitaire
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-32">
                  Montant
                </th>
                {canAddLines && (
                  <th className="w-12 px-4 py-3" />
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoice.lines.length === 0 ? (
                <tr>
                  <td
                    colSpan={canAddLines ? 5 : 4}
                    className="px-6 py-8 text-center text-muted-foreground text-sm"
                  >
                    Aucune ligne. Ajoutez des lignes de facturation ci-dessous.
                  </td>
                </tr>
              ) : (
                invoice.lines.map((line) => (
                  <tr key={line.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-3 text-foreground">
                      <span>{line.description}</span>
                      {line.session && (
                        <span className="block text-xs text-muted-foreground">
                          {line.session.theme.label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-foreground">{line.quantity}</td>
                    <td className="px-4 py-3 text-right text-foreground">
                      {formatCurrency(line.unitPrice)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-foreground">
                      {formatCurrency(line.amount)}
                    </td>
                    {canAddLines && (
                      <td className="px-4 py-3 text-center">
                        <form action={removeLineAction}>
                          <input type="hidden" name="lineId" value={line.id} />
                          <input type="hidden" name="invoiceId" value={invoice.id} />
                          <button
                            type="submit"
                            className="text-muted-foreground hover:text-red-400 transition-colors"
                            title="Supprimer cette ligne"
                          >
                            <MinusCircle className="h-4 w-4" />
                          </button>
                        </form>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Add line form (brouillon only) */}
        {canAddLines && (
          <div className="px-6 py-4 border-t border-border bg-secondary/10">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Ajouter une ligne
            </p>
            <form action={addLineAction} className="grid gap-3 md:grid-cols-4 items-end">
              <input type="hidden" name="invoiceId" value={invoice.id} />
              <div className="md:col-span-2">
                <label className="block text-xs text-muted-foreground mb-1">Description *</label>
                <input
                  name="description"
                  required
                  placeholder="Formation React avancé — 2 jours"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Quantité</label>
                <input
                  name="quantity"
                  type="number"
                  min="0.01"
                  step="0.01"
                  defaultValue="1"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Prix unitaire (MAD)</label>
                <input
                  name="unitPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  required
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="md:col-span-4 flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors"
                >
                  <PlusCircle className="h-4 w-4" />
                  Ajouter la ligne
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* ── Totals ── */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex justify-end">
          <div className="w-full max-w-xs space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sous-total HT</span>
              <span className="text-foreground font-medium">{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                TVA ({Math.round(invoice.taxRate * 100)}%)
              </span>
              <span className="text-foreground font-medium">{formatCurrency(invoice.taxAmount)}</span>
            </div>
            <div className="flex justify-between text-base font-bold pt-2 border-t border-border">
              <span className="text-foreground">Total TTC</span>
              <span className="text-foreground">{formatCurrency(invoice.total)}</span>
            </div>
            {invoice.paidAmount !== null && invoice.paidAmount !== undefined && (
              <div className="flex justify-between text-sm pt-1">
                <span className="text-emerald-400">Montant encaissé</span>
                <span className="text-emerald-400 font-medium">
                  {formatCurrency(invoice.paidAmount)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Mark paid form (ENVOYEE_CLIENT or EN_RETARD) ── */}
      {(invoice.status === "ENVOYEE_CLIENT" || invoice.status === "EN_RETARD") && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-border">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">Enregistrer le paiement</h2>
          </div>
          <form action={markPaidAction} className="p-6 space-y-4">
            <input type="hidden" name="id" value={invoice.id} />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">
                  Montant encaissé (MAD)
                </label>
                <input
                  name="paidAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={invoice.total}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">
                  Référence de paiement
                </label>
                <input
                  name="paymentRef"
                  type="text"
                  placeholder="VIR-2025-XXX / CHQ-XXX"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-sm font-medium hover:bg-emerald-500/20 transition-colors"
              >
                <CheckCircle2 className="h-4 w-4" />
                Marquer comme payée
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Payment details (PAYEE) ── */}
      {invoice.status === "PAYEE" && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <h2 className="font-semibold text-emerald-400">Paiement enregistré</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">Date de paiement</p>
              <p className="font-medium text-foreground">{formatDate(invoice.paidAt)}</p>
            </div>
            {invoice.paymentRef && (
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Référence</p>
                <p className="font-medium text-foreground font-mono">{invoice.paymentRef}</p>
              </div>
            )}
            {invoice.paidAmount !== null && invoice.paidAmount !== undefined && (
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Montant encaissé</p>
                <p className="font-bold text-emerald-400">{formatCurrency(invoice.paidAmount)}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Notes ── */}
      {invoice.notes && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold text-foreground mb-2">Notes</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
        </div>
      )}

      {/* ── Timeline ── */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold text-foreground mb-4">Historique</h2>
        <div className="relative">
          <div className="absolute left-3.5 top-0 bottom-0 w-px bg-border" />
          <div className="space-y-4">
            {timeline.map((event, idx) => (
              <div key={idx} className="flex items-start gap-4 relative">
                <div
                  className={`relative z-10 h-7 w-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    event.done
                      ? "bg-emerald-500/10 border-emerald-500/40"
                      : "bg-secondary border-border"
                  }`}
                >
                  {event.done ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>
                <div className="pt-0.5">
                  <p className={`text-sm font-medium ${event.done ? "text-foreground" : "text-muted-foreground"}`}>
                    {event.label}
                  </p>
                  {event.date && (
                    <p className="text-xs text-muted-foreground">{formatDate(event.date)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Reminders status ── */}
      {["ENVOYEE_CLIENT", "EN_RETARD"].includes(invoice.status) && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold text-foreground mb-4">Relances automatiques (R17)</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { label: "J+30", sent: invoice.reminderSentJ30 },
              { label: "J+45", sent: invoice.reminderSentJ45 },
              { label: "J+60", sent: invoice.reminderSentJ60 },
            ].map(({ label, sent }) => (
              <div
                key={label}
                className={`flex items-center gap-2 p-3 rounded-lg border ${
                  sent
                    ? "bg-amber-500/5 border-amber-500/20"
                    : "bg-secondary/30 border-border"
                }`}
              >
                {sent ? (
                  <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
                ) : (
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">Relance {label}</p>
                  <p className="text-xs text-muted-foreground">{sent ? "Envoyée" : "En attente"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
