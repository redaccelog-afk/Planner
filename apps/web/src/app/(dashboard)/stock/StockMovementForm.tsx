"use client";

import { useActionState } from "react";
import { AlertTriangle } from "lucide-react";
import { addStockMovementAction, type StockMovementResult } from "./actions";

interface ConsumableOption {
  id: string;
  label: string;
  stockQty: number;
  unit: string;
}

interface StockMovementFormProps {
  consumables: ConsumableOption[];
}

export function StockMovementForm({ consumables }: StockMovementFormProps) {
  const [state, formAction, pending] = useActionState<StockMovementResult | null, FormData>(
    addStockMovementAction,
    null
  );

  const hasError = state && "error" in state;
  const hasSuccess = state && "ok" in state;

  return (
    <form action={formAction} className="p-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {hasError && (
        <div className="sm:col-span-2 lg:col-span-4 flex items-start gap-2 bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
          <p className="text-sm text-destructive font-medium">{state.error}</p>
        </div>
      )}
      {hasSuccess && (
        <div className="sm:col-span-2 lg:col-span-4 bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3">
          <p className="text-sm text-green-600 font-medium">
            Mouvement enregistré. Nouveau solde&nbsp;: {state.newBalance} unité(s).
            {state.alertTriggered && (
              <span className="ml-2 text-destructive">⚠ Stock descendu sous le seuil minimum.</span>
            )}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="consumableId" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Consommable
        </label>
        <select
          id="consumableId"
          name="consumableId"
          required
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">— Sélectionner —</option>
          {consumables.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label} (stock: {c.stockQty} {c.unit})
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="direction" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Type
        </label>
        <select
          id="direction"
          name="direction"
          required
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="in">Entrée (ajout)</option>
          <option value="out">Sortie (retrait)</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="quantity" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Quantité
        </label>
        <input
          id="quantity"
          name="quantity"
          type="number"
          min="1"
          required
          placeholder="ex. 10"
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="text-xs text-muted-foreground">
          Pour une sortie, la quantité ne peut pas dépasser le stock disponible.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="reason" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Raison
        </label>
        <input
          id="reason"
          name="reason"
          type="text"
          required
          placeholder="ex. réapprovisionnement"
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {pending ? "Enregistrement…" : "Enregistrer le mouvement"}
        </button>
      </div>
    </form>
  );
}
