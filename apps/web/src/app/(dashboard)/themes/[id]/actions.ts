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

export async function addThemeConsumableAction(formData: FormData) {
  const themeId = formData.get("themeId") as string;
  const consumableId = formData.get("consumableId") as string;
  const quantityRaw = formData.get("quantity") as string;

  if (!themeId || !consumableId) return;

  const quantity = quantityRaw ? parseInt(quantityRaw, 10) : 1;

  await db.themeConsumable.upsert({
    where: { themeId_consumableId: { themeId, consumableId } },
    update: { quantity },
    create: { themeId, consumableId, quantity },
  });

  revalidatePath(`/themes/${themeId}`);
}

export async function removeThemeConsumableAction(id: string) {
  const item = await db.themeConsumable.delete({ where: { id } });
  revalidatePath(`/themes/${item.themeId}`);
}

export async function addDossierItemAction(formData: FormData) {
  const themeId = formData.get("themeId") as string;
  const label = (formData.get("label") as string)?.trim();
  const requiredRaw = formData.get("required") as string;

  if (!themeId || !label) return;

  const required = requiredRaw !== "false";

  const lastItem = await db.themeDossierItem.findFirst({
    where: { themeId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const order = (lastItem?.order ?? -1) + 1;

  await db.themeDossierItem.create({ data: { themeId, label, order, required } });

  revalidatePath(`/themes/${themeId}`);
}

export async function removeDossierItemAction(formData: FormData) {
  const id = formData.get("id") as string;
  const themeId = formData.get("themeId") as string;
  if (!id) return;
  await db.themeDossierItem.delete({ where: { id } });
  revalidatePath(`/themes/${themeId}`);
}

export async function linkAttestationTemplateAction(formData: FormData) {
  const themeId = formData.get("themeId") as string;
  const templateId = formData.get("templateId") as string;
  if (!themeId || !templateId) return;
  await db.attestationTemplate.update({
    where: { id: templateId },
    data: { themeId },
  });
  revalidatePath(`/themes/${themeId}`);
}

export async function unlinkAttestationTemplateAction(formData: FormData) {
  const templateId = formData.get("templateId") as string;
  const themeId = formData.get("themeId") as string;
  if (!templateId) return;
  await db.attestationTemplate.update({
    where: { id: templateId },
    data: { themeId: null },
  });
  revalidatePath(`/themes/${themeId}`);
}
