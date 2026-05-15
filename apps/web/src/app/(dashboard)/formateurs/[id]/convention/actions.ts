"use server";

import { db } from "@ccelog/db";
import { revalidatePath } from "next/cache";

export async function createFrameworkAction(formData: FormData) {
  const trainerId = formData.get("trainerId") as string;
  const reference = formData.get("reference") as string;
  const signedAtRaw = formData.get("signedAt") as string;
  const validUntilRaw = formData.get("validUntil") as string;
  const fileUrl = (formData.get("fileUrl") as string) || null;
  const notes = (formData.get("notes") as string) || null;

  if (!trainerId || !reference || !signedAtRaw || !validUntilRaw) return;

  await db.framework.create({
    data: {
      trainerId,
      reference,
      signedAt: new Date(signedAtRaw),
      validUntil: new Date(validUntilRaw),
      status: "ACTIF",
      fileUrl,
      notes,
    },
  });

  revalidatePath(`/formateurs/${trainerId}/convention`);
  revalidatePath(`/formateurs/${trainerId}`);
}

export async function updateFrameworkStatusAction(formData: FormData) {
  const id = formData.get("id") as string;
  const trainerId = formData.get("trainerId") as string;
  const status = formData.get("status") as "ACTIF" | "EXPIRE" | "RESILIE";

  if (!id || !trainerId || !status) return;

  await db.framework.update({
    where: { id },
    data: { status },
  });

  revalidatePath(`/formateurs/${trainerId}/convention`);
  revalidatePath(`/formateurs/${trainerId}`);
}
