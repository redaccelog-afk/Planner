"use server";

import { db } from "@ccelog/db";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";

export async function markSentToClientAction(formData: FormData) {
  const reportId = formData.get("reportId") as string;
  if (!reportId) return;

  await db.trainingReport.update({
    where: { id: reportId },
    data: {
      status: "ENVOYE_CLIENT",
      sentToClientAt: new Date(),
    },
  });

  revalidatePath("/rapports");
}

export async function generateUploadTokenAction(formData: FormData) {
  const reportId = formData.get("reportId") as string;
  if (!reportId) return;

  const token = randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72h

  await db.trainingReport.update({
    where: { id: reportId },
    data: {
      trainerUploadToken: token,
      trainerUploadExpiry: expiry,
    },
  });

  revalidatePath("/rapports");
}
