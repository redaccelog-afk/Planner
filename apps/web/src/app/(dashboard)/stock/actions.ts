"use server";

import { db } from "@ccelog/db";
import { revalidatePath } from "next/cache";

export type StockMovementResult =
  | { error: string }
  | { ok: true; newBalance: number; alertTriggered: boolean };

export async function addStockMovementAction(
  _prevState: StockMovementResult | null,
  formData: FormData
): Promise<StockMovementResult> {
  const consumableId = formData.get("consumableId") as string;
  const quantityRaw = formData.get("quantity") as string;
  const reason = (formData.get("reason") as string)?.trim();
  const direction = formData.get("direction") as "in" | "out";

  if (!consumableId || !quantityRaw || !reason || !direction) {
    return { error: "Tous les champs sont obligatoires." };
  }

  const qty = parseInt(quantityRaw, 10);
  if (isNaN(qty) || qty <= 0) {
    return { error: "La quantité doit être un entier positif." };
  }

  const delta = direction === "out" ? -qty : qty;

  let alertTriggered = false;
  let newBalance = 0;

  try {
    const result = await db.$transaction(async (tx) => {
      const consumable = await tx.consumable.findUniqueOrThrow({
        where: { id: consumableId },
        select: { stockQty: true, minStock: true, notifyUserId: true, label: true },
      });

      // Block negative stock on sorties
      if (direction === "out" && qty > consumable.stockQty) {
        throw new Error(
          `Stock insuffisant. Quantité disponible: ${consumable.stockQty}`
        );
      }

      const balance = consumable.stockQty + delta;

      await tx.consumable.update({
        where: { id: consumableId },
        data: { stockQty: balance },
      });

      await tx.stockMovement.create({
        data: {
          consumableId,
          quantity: delta,
          reason,
          balanceAfter: balance,
        },
      });

      // Task 2 — minimum stock alert
      const triggered = balance <= consumable.minStock;
      if (triggered && consumable.notifyUserId) {
        // TODO: also send email to notifyUser.email
        await tx.notification.create({
          data: {
            type: "ALERTE_STOCK",
            channel: "inapp",
            recipient: consumable.notifyUserId,
            scheduledAt: new Date(),
            payload: {
              title: `Stock bas — ${consumable.label}`,
              body: `Le stock de ${consumable.label} est descendu à ${balance} unités (seuil minimum: ${consumable.minStock})`,
              consumableId,
              newStock: balance,
              minStock: consumable.minStock,
            },
          },
        });
      }

      return { balance, triggered };
    });

    newBalance = result.balance;
    alertTriggered = result.triggered;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return { error: message };
  }

  revalidatePath("/stock");
  return { ok: true, newBalance, alertTriggered };
}

export async function createConsumableAction(
  _prevState: { error: string } | { ok: true } | null,
  formData: FormData
): Promise<{ error: string } | { ok: true }> {
  const label = (formData.get("label") as string)?.trim();
  const unit = (formData.get("unit") as string)?.trim() || "pièce";
  const stockQtyRaw = formData.get("stockQty") as string;
  const reorderAtRaw = formData.get("reorderAt") as string;
  const unitCostRaw = formData.get("unitCost") as string;
  const minStockRaw = formData.get("minStock") as string;
  const notifyUserId = (formData.get("notifyUserId") as string) || null;

  if (!label) return { error: "Le libellé est obligatoire." };

  const stockQty = parseInt(stockQtyRaw ?? "0", 10);
  const reorderAt = parseInt(reorderAtRaw ?? "10", 10);
  const minStock = parseInt(minStockRaw ?? "0", 10);
  const unitCost = unitCostRaw ? parseFloat(unitCostRaw) : undefined;

  if (isNaN(stockQty) || stockQty < 0) return { error: "Stock initial invalide." };
  if (isNaN(reorderAt) || reorderAt < 0) return { error: "Seuil de réapprovisionnement invalide." };
  if (isNaN(minStock) || minStock < 0) return { error: "Seuil d'alerte invalide." };

  try {
    await db.consumable.create({
      data: {
        label,
        unit,
        stockQty,
        reorderAt,
        minStock,
        unitCost: unitCost !== undefined && !isNaN(unitCost) ? unitCost : undefined,
        notifyUserId: notifyUserId || undefined,
      },
    });
  } catch {
    return { error: "Erreur lors de la création de l'article." };
  }

  revalidatePath("/stock");
  return { ok: true };
}
