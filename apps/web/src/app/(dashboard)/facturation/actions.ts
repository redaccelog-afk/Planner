"use server";

import { db } from "@ccelog/db";
import { revalidatePath } from "next/cache";

// Generate next invoice reference: FACT-YYYY-NNN
async function nextReference(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `FACT-${year}-`;
  const last = await db.invoice.findFirst({
    where: { reference: { startsWith: prefix } },
    orderBy: { reference: "desc" },
  });
  const seq = last ? parseInt(last.reference.split("-")[2] ?? "0", 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(3, "0")}`;
}

export async function createInvoiceAction(formData: FormData) {
  const sessionId = formData.get("sessionId") as string;
  const clientId = formData.get("clientId") as string;
  const amountRaw = parseFloat(formData.get("amount") as string);
  const description = formData.get("description") as string;

  if (!sessionId || !clientId) return;

  const amount = isNaN(amountRaw) || amountRaw <= 0 ? 0 : amountRaw;
  const taxRate = 0.2;
  const taxAmount = Math.round(amount * taxRate * 100) / 100;
  const total = Math.round((amount + taxAmount) * 100) / 100;

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  const reference = await nextReference();

  await db.invoice.create({
    data: {
      clientId,
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

  revalidatePath("/facturation");
}

export async function updateInvoiceStatusAction(formData: FormData) {
  const id = formData.get("id") as string;
  const status = formData.get("status") as string;

  if (!id || !status) return;

  const data: Parameters<typeof db.invoice.update>[0]["data"] = { status: status as never };

  if (status === "PAYEE") {
    data.paidAt = new Date();
  }

  await db.invoice.update({ where: { id }, data });

  revalidatePath("/facturation");
}
