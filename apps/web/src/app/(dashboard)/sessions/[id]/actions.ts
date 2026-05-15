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

// Generate next invoice reference: FACT-YYYY-NNN
async function nextInvoiceReference(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `FACT-${year}-`;
  const last = await db.invoice.findFirst({
    where: { reference: { startsWith: prefix } },
    orderBy: { reference: "desc" },
  });
  const seq = last ? parseInt(last.reference.split("-")[2] ?? "0", 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(3, "0")}`;
}

/**
 * Crée une Prestation BROUILLON (BdC) pour une session avec formateur EXTERNE.
 * Idempotent — ne crée rien si une prestation existe déjà.
 */
export async function createPrestationAction(formData: FormData) {
  const sessionId = formData.get("sessionId") as string;
  if (!sessionId) return;

  // Vérifier idempotence
  const existing = await db.prestation.findUnique({ where: { sessionId } });
  if (existing) return;

  const session = await db.trainingSession.findUnique({
    where: { id: sessionId },
    include: { trainer: true, theme: true },
  });
  if (!session) return;
  if (session.trainer.type !== "EXTERNE") return;

  const agreedRate = session.trainer.defaultDayRate ?? 0;
  const daysCount = session.theme.durationDays;
  const totalAmount = Math.round(agreedRate * daysCount * 100) / 100;
  const poReference = await nextPoReference();

  await db.prestation.create({
    data: {
      sessionId,
      trainerId: session.trainerId,
      agreedRate,
      daysCount,
      totalAmount,
      status: "BROUILLON",
      poReference,
    },
  });

  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath("/achats");
}

/**
 * Crée une Invoice BROUILLON avec une ligne liée à la session.
 * Idempotent — ne crée rien si la session a déjà une ligne de facture.
 */
export async function createInvoiceFromSessionAction(formData: FormData) {
  const sessionId = formData.get("sessionId") as string;
  if (!sessionId) return;

  // Vérifier idempotence
  const existingLine = await db.invoiceLine.findFirst({ where: { sessionId } });
  if (existingLine) return;

  const session = await db.trainingSession.findUnique({
    where: { id: sessionId },
    include: {
      theme: true,
      request: { include: { client: true } },
    },
  });
  if (!session) return;

  const amount = session.totalCost ?? 0;
  const taxRate = 0.2;
  const taxAmount = Math.round(amount * taxRate * 100) / 100;
  const total = Math.round((amount + taxAmount) * 100) / 100;

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  const reference = await nextInvoiceReference();
  const description = `Formation ${session.theme.label} — ${new Date(session.startDate).toLocaleDateString("fr-MA")}`;

  await db.invoice.create({
    data: {
      clientId: session.request.clientId,
      reference,
      dueDate,
      subtotal: amount,
      taxRate,
      taxAmount,
      total,
      status: "BROUILLON",
      lines: {
        create: {
          sessionId,
          description,
          quantity: 1,
          unitPrice: amount,
          amount,
        },
      },
    },
  });

  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath("/facturation");
}
