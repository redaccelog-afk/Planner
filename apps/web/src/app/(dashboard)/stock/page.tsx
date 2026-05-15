import { db } from "@ccelog/db";
import { AlertTriangle, Package, Wrench, TrendingUp, TrendingDown } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { addStockMovementAction } from "./actions";

export const metadata = { title: "Stock & Matériel" };

export default async function StockPage() {
  const [consumables, materials, recentMovements] = await Promise.all([
    db.consumable.findMany({ orderBy: { label: "asc" } }),
    db.material.findMany({ orderBy: [{ category: "asc" }, { label: "asc" }] }),
    db.stockMovement.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: { consumable: { select: { label: true, unit: true } } },
    }),
  ]);

  const lowStock = consumables.filter((c) => c.stockQty <= c.reorderAt);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Stock & Matériel</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Consommables et équipements de formation
        </p>
      </div>

      {/* Alertes */}
      {lowStock.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <p className="text-sm font-semibold text-destructive">
              {lowStock.length} consommable(s) sous le seuil d&apos;alerte
            </p>
          </div>
          <ul className="space-y-1">
            {lowStock.map((c) => (
              <li key={c.id} className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{c.label}</span> —{" "}
                {c.stockQty} {c.unit}(s) restant(s) (seuil : {c.reorderAt})
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Consommables */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-border">
            <Package className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">Consommables</h2>
            <span className="ml-auto text-xs text-muted-foreground">{consumables.length} articles</span>
          </div>
          <div className="divide-y divide-border">
            {consumables.map((c) => {
              const isLow = c.stockQty <= c.reorderAt;
              return (
                <div key={c.id} className="flex items-center px-6 py-3 gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{c.label}</p>
                      {isLow && (
                        <span className="flex-shrink-0 px-1.5 py-0.5 bg-destructive/10 text-destructive text-xs font-semibold rounded-full border border-destructive/30">
                          Réappro
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Seuil : {c.reorderAt} {c.unit}(s)</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${isLow ? "text-destructive" : "text-foreground"}`}>
                      {c.stockQty}
                    </p>
                    <p className="text-xs text-muted-foreground">{c.unit}(s)</p>
                  </div>
                  {isLow && <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Matériels */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-border">
            <Wrench className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">Matériels</h2>
            <span className="ml-auto text-xs text-muted-foreground">{materials.length} équipement(s)</span>
          </div>
          <div className="divide-y divide-border">
            {materials.map((m) => {
              const statusColor =
                m.status === "DISPONIBLE"
                  ? "bg-green-500"
                  : m.status === "ASSIGNE"
                  ? "bg-yellow-500"
                  : m.status === "MAINTENANCE"
                  ? "bg-orange-500"
                  : "bg-gray-500";
              const statusLabel =
                m.status === "DISPONIBLE"
                  ? "Disponible"
                  : m.status === "ASSIGNE"
                  ? "Assigné"
                  : m.status === "MAINTENANCE"
                  ? "Maintenance"
                  : "Retiré";

              return (
                <div key={m.id} className="flex items-center px-6 py-3 gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{m.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.category}{m.serial ? ` · ${m.serial}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${statusColor}`} />
                    <span className="text-xs text-muted-foreground">{statusLabel}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mouvement manuel */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Mouvement manuel</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Ajout ou retrait de stock</p>
        </div>
        <form action={addStockMovementAction} className="p-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Enregistrer le mouvement
            </button>
          </div>
        </form>
      </div>

      {/* Mouvements récents */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Mouvements récents</h2>
          <p className="text-xs text-muted-foreground mt-0.5">20 derniers mouvements de stock</p>
        </div>
        {recentMovements.length === 0 ? (
          <p className="text-sm text-muted-foreground px-6 py-8 text-center">Aucun mouvement enregistré.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Consommable</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Quantité</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Raison</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Solde après</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentMovements.map((mv) => {
                  const isPositive = mv.quantity > 0;
                  return (
                    <tr key={mv.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-6 py-3 text-muted-foreground whitespace-nowrap">
                        {formatDateTime(mv.createdAt)}
                      </td>
                      <td className="px-6 py-3 font-medium text-foreground whitespace-nowrap">
                        {mv.consumable.label}
                      </td>
                      <td className="px-6 py-3 text-right whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 font-semibold ${isPositive ? "text-green-400" : "text-destructive"}`}>
                          {isPositive ? (
                            <TrendingUp className="h-3.5 w-3.5" />
                          ) : (
                            <TrendingDown className="h-3.5 w-3.5" />
                          )}
                          {isPositive ? "+" : ""}{mv.quantity} {mv.consumable.unit}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-muted-foreground max-w-xs truncate">
                        {mv.reason}
                      </td>
                      <td className="px-6 py-3 text-right font-medium text-foreground whitespace-nowrap">
                        {mv.balanceAfter} {mv.consumable.unit}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
