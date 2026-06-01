"use server";

import { db } from "@ccelog/db";
import { revalidatePath } from "next/cache";

// Using string type for category since Prisma client may not have been regenerated yet.
// The enum values match the schema: REPAS | HEBERGEMENT | TRANSPORT | AUTRE
type ExpenseCategoryStr = "REPAS" | "HEBERGEMENT" | "TRANSPORT" | "AUTRE";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dbAny = db as any;

export async function addExpenseAction(
  sessionId: string,
  data: {
    category: ExpenseCategoryStr;
    amount: number;
    date: string;
    description: string;
  }
) {
  const session = await db.trainingSession.findUnique({
    where: { id: sessionId },
    select: { id: true, trainerId: true },
  });
  if (!session) throw new Error("Session introuvable");

  await dbAny.expenseItem.create({
    data: {
      sessionId,
      trainerId: session.trainerId,
      category: data.category,
      amount: data.amount,
      date: new Date(data.date),
      description: data.description || null,
    },
  });

  revalidatePath(`/sessions/${sessionId}/frais`);
}

export async function approveExpenseAction(expenseId: string, approved: boolean) {
  const expense = await dbAny.expenseItem.findUnique({
    where: { id: expenseId },
    select: { id: true, sessionId: true },
  });
  if (!expense) throw new Error("Frais introuvable");

  await dbAny.expenseItem.update({
    where: { id: expenseId },
    data: {
      approved,
      approvedAt: new Date(),
    },
  });

  revalidatePath(`/sessions/${expense.sessionId}/frais`);
}
