"use server";

import { db } from "@ccelog/db";
import { revalidatePath } from "next/cache";

export async function addStockMovementAction(formData: FormData) {
  const consumableId = formData.get("consumableId") as string;
  const quantityRaw = formData.get("quantity") as string;
  const reason = (formData.get("reason") as string)?.trim();
  const direction = formData.get("direction") as "in" | "out";

  if (!consumableId || !quantityRaw || !reason || !direction) return;

  const qty = parseInt(quantityRaw, 10);
  if (isNaN(qty) || qty <= 0) return;

  const delta = direction === "out" ? -qty : qty;

  // Read current stock in a transaction to avoid race conditions
  await db.$transaction(async (tx) => {
    const consumable = await tx.consumable.findUniqueOrThrow({
      where: { id: consumableId },
      select: { stockQty: true },
    });

    const newBalance = consumable.stockQty + delta;

    await tx.consumable.update({
      where: { id: consumableId },
      data: { stockQty: newBalance },
    });

    await tx.stockMovement.create({
      data: {
        consumableId,
        quantity: delta,
        reason,
        balanceAfter: newBalance,
      },
    });
  });

  revalidatePath("/stock");
}
