"use server";

import { db } from "@ccelog/db";
import { revalidatePath } from "next/cache";

export async function updateThemeAction(formData: FormData) {
  const id = formData.get("id") as string;
  const label = (formData.get("label") as string)?.trim();
  const durationDaysRaw = formData.get("durationDays") as string;
  const activeRaw = formData.get("active") as string;

  if (!id || !label) return;

  const durationDays = durationDaysRaw ? parseInt(durationDaysRaw, 10) : 1;
  const active = activeRaw === "true" || activeRaw === "on";

  await db.theme.update({
    where: { id },
    data: { label, durationDays, active },
  });

  revalidatePath(`/themes/${id}`);
  revalidatePath("/themes");
}

export async function addConsumableNeedAction(formData: FormData) {
  const themeId = formData.get("themeId") as string;
  const consumableId = formData.get("consumableId") as string;
  const qtyPerParticipantRaw = formData.get("qtyPerParticipant") as string;

  if (!themeId || !consumableId) return;

  const qtyPerParticipant = qtyPerParticipantRaw ? parseFloat(qtyPerParticipantRaw) : 1;

  await db.consumableNeed.upsert({
    where: { themeId_consumableId: { themeId, consumableId } },
    update: { qtyPerParticipant },
    create: { themeId, consumableId, qtyPerParticipant },
  });

  revalidatePath(`/themes/${themeId}`);
}

export async function removeConsumableNeedAction(formData: FormData) {
  const themeId = formData.get("themeId") as string;
  const consumableId = formData.get("consumableId") as string;

  if (!themeId || !consumableId) return;

  await db.consumableNeed.delete({
    where: { themeId_consumableId: { themeId, consumableId } },
  });

  revalidatePath(`/themes/${themeId}`);
}
