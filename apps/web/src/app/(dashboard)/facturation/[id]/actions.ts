"use server";

import { db } from "@ccelog/db";
import { revalidatePath } from "next/cache";

export async function emitInvoiceAction(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return;

  await db.invoice.update({
    where: { id },
    data: { status: "EMISE" },
  });

  revalidatePath(`/facturation/${id}`);
  revalidatePath("/facturation");
}

export async function markSentAction(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return;

  await db.invoice.update({
    where: { id },
    data: { status: "ENVOYEE_CLIENT" },
  });

  revalidatePath(`/facturation/${id}`);
  revalidatePath("/facturation");
}

export async function markPaidAction(formData: FormData) {
  const id = formData.get("id") as string;
  const paymentRef = (formData.get("paymentRef") as string) || null;
  const paidAmountRaw = parseFloat(formData.get("paidAmount") as string);
  const paidAmount = isNaN(paidAmountRaw) ? null : paidAmountRaw;

  if (!id) return;

  await db.invoice.update({
    where: { id },
    data: {
      status: "PAYEE",
      paidAt: new Date(),
      paymentRef,
      paidAmount,
    },
  });

  revalidatePath(`/facturation/${id}`);
  revalidatePath("/facturation");
}

export async function addLineAction(formData: FormData) {
  const invoiceId = formData.get("invoiceId") as string;
  const sessionId = (formData.get("sessionId") as string) || null;
  const description = formData.get("description") as string;
  const quantity = parseFloat(formData.get("quantity") as string) || 1;
  const unitPrice = parseFloat(formData.get("unitPrice") as string) || 0;

  if (!invoiceId || !description) return;

  const amount = Math.round(quantity * unitPrice * 100) / 100;

  await db.invoiceLine.create({
    data: {
      invoiceId,
      sessionId: sessionId || null,
      description,
      quantity,
      unitPrice,
      amount,
    },
  });

  // Recalculate invoice totals
  await recalculateTotals(invoiceId);

  revalidatePath(`/facturation/${invoiceId}`);
}

export async function removeLineAction(formData: FormData) {
  const lineId = formData.get("lineId") as string;
  const invoiceId = formData.get("invoiceId") as string;
  if (!lineId || !invoiceId) return;

  await db.invoiceLine.delete({ where: { id: lineId } });

  // Recalculate invoice totals
  await recalculateTotals(invoiceId);

  revalidatePath(`/facturation/${invoiceId}`);
}

async function recalculateTotals(invoiceId: string): Promise<void> {
  const lines = await db.invoiceLine.findMany({ where: { invoiceId } });
  const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) return;

  const subtotal = lines.reduce((sum, l) => sum + l.amount, 0);
  const taxRate = invoice.taxRate;
  const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  await db.invoice.update({
    where: { id: invoiceId },
    data: { subtotal, taxAmount, total },
  });
}
