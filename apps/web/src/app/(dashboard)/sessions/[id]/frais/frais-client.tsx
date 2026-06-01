"use client";

import { useState, useTransition, useRef } from "react";
import { addExpenseAction, approveExpenseAction } from "./actions";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Check, X, ChevronUp } from "lucide-react";

type ExpenseCategory = "REPAS" | "HEBERGEMENT" | "TRANSPORT" | "AUTRE";

type ExpenseItem = {
  id: string;
  category: ExpenseCategory;
  amount: number;
  date: Date;
  description: string | null;
  approved: boolean | null;
};

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  REPAS: "Repas",
  HEBERGEMENT: "Hébergement",
  TRANSPORT: "Transport",
  AUTRE: "Autre",
};

const CATEGORY_BADGE: Record<ExpenseCategory, string> = {
  REPAS: "bg-orange-500/15 text-orange-400",
  HEBERGEMENT: "bg-blue-500/15 text-blue-400",
  TRANSPORT: "bg-green-500/15 text-green-400",
  AUTRE: "bg-gray-500/15 text-gray-400",
};

function approvedBadge(approved: boolean | null) {
  if (approved === null) {
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/15 text-yellow-400">
        En attente
      </span>
    );
  }
  if (approved) {
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/15 text-green-400">
        Approuvé
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/15 text-red-400">
      Refusé
    </span>
  );
}

const CATEGORIES: ExpenseCategory[] = ["REPAS", "HEBERGEMENT", "TRANSPORT", "AUTRE"];

export function FraisClient({
  sessionId,
  expenses,
}: {
  sessionId: string;
  expenses: ExpenseItem[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [fileName, setFileName] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setFileName(file?.name ?? null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const category = fd.get("category") as ExpenseCategory;
    const amount = parseFloat(fd.get("amount") as string);
    const date = fd.get("date") as string;
    const description = fd.get("description") as string;
    if (!category || isNaN(amount) || !date) return;

    startTransition(async () => {
      await addExpenseAction(sessionId, { category, amount, date, description });
      formRef.current?.reset();
      setFileName(null);
      setShowForm(false);
    });
  }

  function handleApprove(expenseId: string, approved: boolean) {
    startTransition(() => approveExpenseAction(expenseId, approved));
  }

  // Group by category
  const grouped = CATEGORIES.map((cat) => ({
    category: cat,
    items: expenses.filter((e) => e.category === cat),
  })).filter((g) => g.items.length > 0);

  const grandTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      {/* Add button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {showForm ? <ChevronUp className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Annuler" : "Ajouter un frais"}
        </button>
      </div>

      {/* Inline add form */}
      {showForm && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-semibold text-foreground mb-4">Nouveau frais</h3>
          <form ref={formRef} onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            {/* Category */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Catégorie
              </label>
              <select
                name="category"
                required
                className="bg-secondary border border-border text-foreground text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Sélectionner…</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
            {/* Amount */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Montant (MAD)
              </label>
              <input
                name="amount"
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="0.00"
                className="bg-secondary border border-border text-foreground text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            {/* Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Date
              </label>
              <input
                name="date"
                type="date"
                required
                className="bg-secondary border border-border text-foreground text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Description
              </label>
              <input
                name="description"
                type="text"
                placeholder="Détail du frais…"
                className="bg-secondary border border-border text-foreground text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            {/* Receipt upload placeholder */}
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Justificatif (optionnel)
              </label>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer px-3 py-2 rounded-md text-sm bg-secondary border border-border text-muted-foreground hover:bg-secondary/80 transition-colors">
                  Choisir un fichier
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
                <span className="text-sm text-muted-foreground">
                  {fileName ?? "Aucun fichier sélectionné"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Upload non encore disponible — le nom du fichier sera enregistré comme référence.
              </p>
            </div>
            {/* Submit */}
            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {isPending ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Expense list */}
      {expenses.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <p className="text-muted-foreground">Aucun frais enregistré pour cette session.</p>
        </div>
      ) : (
        <>
          {grouped.map(({ category, items }) => {
            const catTotal = items.reduce((s, i) => s + i.amount, 0);
            return (
              <div key={category} className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-3 border-b border-border">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-semibold ${CATEGORY_BADGE[category]}`}
                  >
                    {CATEGORY_LABELS[category]}
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {formatCurrency(catTotal)}
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {items.map((expense) => (
                    <div
                      key={expense.id}
                      className="flex items-center gap-4 px-6 py-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {formatCurrency(expense.amount)}
                        </p>
                        {expense.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {expense.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {formatDate(expense.date)}
                        </p>
                      </div>
                      {approvedBadge(expense.approved)}
                      {expense.approved === null && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleApprove(expense.id, true)}
                            className="p-1.5 rounded-md bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                            title="Approuver"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleApprove(expense.id, false)}
                            className="p-1.5 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                            title="Refuser"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Grand total */}
          <div className="bg-card border border-border rounded-xl px-6 py-4 flex items-center justify-between">
            <p className="font-semibold text-foreground">Total frais</p>
            <p className="text-xl font-bold text-foreground">{formatCurrency(grandTotal)}</p>
          </div>
        </>
      )}
    </div>
  );
}
