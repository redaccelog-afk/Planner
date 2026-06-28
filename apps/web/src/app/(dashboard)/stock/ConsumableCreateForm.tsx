"use client";

import { useActionState, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { createConsumableAction } from "./actions";

interface UserOption {
  id: string;
  name: string | null;
  email: string;
}

interface ConsumableCreateFormProps {
  notifiableUsers: UserOption[];
}

type CreateResult = { error: string } | { ok: true } | null;

export function ConsumableCreateForm({ notifiableUsers }: ConsumableCreateFormProps) {
  const [state, formAction, pending] = useActionState<CreateResult, FormData>(
    createConsumableAction,
    null
  );

  const formRef = useRef<HTMLFormElement>(null);

  const hasError = state && "error" in state;
  const hasSuccess = state && "ok" in state;

  // Reset form on success
  if (hasSuccess && formRef.current) {
    formRef.current.reset();
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="p-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {hasError && (
        <div className="sm:col-span-2 lg:col-span-3 flex items-start gap-2 bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
          <p className="text-sm text-destructive font-medium">{state.error}</p>
        </div>
      )}
      {hasSuccess && (
        <div className="sm:col-span-2 lg:col-span-3 bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3">
          <p className="text-sm text-green-600 font-medium">Article créé avec succès.</p>
        </div>
      )}

      {/* Libellé */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="label" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Libellé <span className="text-destructive">*</span>
        </label>
        <input
          id="label"
          name="label"
          type="text"
          required
          minLength={2}
          placeholder="ex. Stylo CCE LOG"
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Unité */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="unit" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Unité
        </label>
        <input
          id="unit"
          name="unit"
          type="text"
          placeholder="pièce"
          defaultValue="pièce"
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Stock initial */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="stockQty" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Stock initial
        </label>
        <input
          id="stockQty"
          name="stockQty"
          type="number"
          min="0"
          defaultValue={0}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Seuil de réapprovisionnement */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="reorderAt" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Seuil de réapprovisionnement
        </label>
        <input
          id="reorderAt"
          name="reorderAt"
          type="number"
          min="0"
          defaultValue={10}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Seuil d'alerte stock (minStock) */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="minStock" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Seuil d&apos;alerte stock
        </label>
        <input
          id="minStock"
          name="minStock"
          type="number"
          min="0"
          defaultValue={0}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="text-xs text-muted-foreground">
          Une notification sera créée quand le stock descend à ce niveau ou en dessous.
        </p>
      </div>

      {/* Coût unitaire */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="unitCost" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Coût unitaire (MAD)
        </label>
        <input
          id="unitCost"
          name="unitCost"
          type="number"
          min="0"
          step="0.01"
          placeholder="ex. 5.50"
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Responsable à notifier */}
      <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-2">
        <label htmlFor="notifyUserId" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Responsable à notifier
        </label>
        <select
          id="notifyUserId"
          name="notifyUserId"
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">— Aucun —</option>
          {notifiableUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name ?? u.email} ({u.email})
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Cet utilisateur recevra une notification quand le seuil d&apos;alerte est atteint.
        </p>
      </div>

      <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {pending ? "Création…" : "Créer l'article"}
        </button>
      </div>
    </form>
  );
}
