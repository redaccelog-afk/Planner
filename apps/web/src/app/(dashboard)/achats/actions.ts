"use server";

import { db } from "@ccelog/db";
import { revalidatePath } from "next/cache";

// Generate next PO reference: BDC-YYYY-NNN
async function nextPoReference(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `BDC-${year}-`;
  const last = await db.prestation.findFirst({
    where: { poReference: { startsWith: prefix } },
    orderBy: { poReference: "desc" },
  });
  const seq = last ? parseInt(last.poReference!.split("-")[2] ?? "0", 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(3, "0")}`;
}

export async function emitPurchaseOrderAction(formData: FormData) {
  const sessionId = formData.get("sessionId") as string;
  const trainerId = formData.get("trainerId") as string;
  const agreedRate = parseFloat(formData.get("agreedRate") as string) || 0;
  const daysCount = parseFloat(formData.get("daysCount") as string) || 1;

  if (!sessionId || !trainerId) return;

  const totalAmount = Math.round(agreedRate * daysCount * 100) / 100;
  const poReference = await nextPoReference();

  // Check if a prestation already exists (idempotent)
  const existing = await db.prestation.findUnique({ where: { sessionId } });
  if (existing) return;

  await db.prestation.create({
    data: {
      sessionId,
      trainerId,
      agreedRate,
      daysCount,
      totalAmount,
      status: "BON_COMMANDE_EMIS",
      poReference,
      poEmittedAt: new Date(),
    },
  });

  revalidatePath("/achats");
}

export async function recordInvoiceReceivedAction(formData: FormData) {
  const id = formData.get("id") as string;
  const invoiceReference = formData.get("invoiceReference") as string;
  const invoiceAmountRaw = parseFloat(formData.get("invoiceAmount") as string);

  if (!id) return;

  const invoiceAmount = isNaN(invoiceAmountRaw) ? undefined : invoiceAmountRaw;

  // R15 — coherence check: invoice amount should match PO amount (±5%)
  const prestation = await db.prestation.findUnique({ where: { id } });
  let coherenceCheck: boolean | undefined = undefined;

  if (prestation && invoiceAmount !== undefined) {
    const diff = Math.abs(invoiceAmount - prestation.totalAmount) / prestation.totalAmount;
    coherenceCheck = diff <= 0.05; // 5% tolerance
  }

  await db.prestation.update({
    where: { id },
    data: {
      invoiceReference: invoiceReference || null,
      invoiceReceivedAt: new Date(),
      invoiceAmount: invoiceAmount ?? null,
      coherenceCheck: coherenceCheck ?? null,
      status: "FACTURE_RECUE",
    },
  });

  revalidatePath("/achats");
}

export async function validatePrestationAction(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return;

  await db.prestation.update({
    where: { id },
    data: { status: "VALIDE" },
  });

  revalidatePath("/achats");
}

export async function markPrestationPaidAction(formData: FormData) {
  const id = formData.get("id") as string;
  const paymentRef = (formData.get("paymentRef") as string) || undefined;
  if (!id) return;

  await db.prestation.update({
    where: { id },
    data: {
      status: "PAYE",
      paidAt: new Date(),
      paymentRef: paymentRef ?? null,
    },
  });

  revalidatePath("/achats");
}
