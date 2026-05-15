"use server";

import { db } from "@ccelog/db";
import { PreselectionStatus } from "@ccelog/db";
import { revalidatePath } from "next/cache";

export async function addCandidateAction(formData: FormData) {
  const fullName = formData.get("fullName") as string;
  const phone = formData.get("phone") as string;
  const email = (formData.get("email") as string) || undefined;
  const city = formData.get("city") as string;
  const defaultDayRateRaw = formData.get("defaultDayRate") as string;
  const source = (formData.get("source") as string) || undefined;

  if (!fullName || !phone || !city) return;

  const defaultDayRate = defaultDayRateRaw ? parseFloat(defaultDayRateRaw) : undefined;

  // Create trainer (inactive until accepted)
  const trainer = await db.trainer.create({
    data: {
      fullName,
      phone,
      email: email || null,
      city,
      type: "EXTERNE",
      active: false, // not active until ACCEPTE
      defaultDayRate: defaultDayRate ?? null,
    },
  });

  // Create preselection record
  await db.preselection.create({
    data: {
      trainerId: trainer.id,
      status: "CANDIDAT",
      source: source || null,
    },
  });

  revalidatePath("/formateurs/preselection");
}

export async function updateStatusAction(formData: FormData) {
  const id = formData.get("id") as string;
  const status = formData.get("status") as PreselectionStatus;

  if (!id || !status) return;

  const now = new Date();

  const updateData: Parameters<typeof db.preselection.update>[0]["data"] = {
    status,
  };

  if (status === "ACCEPTE") {
    updateData.acceptedAt = now;
    // Activate the trainer
    const preselection = await db.preselection.findUnique({ where: { id } });
    if (preselection) {
      await db.trainer.update({
        where: { id: preselection.trainerId },
        data: { active: true },
      });
    }
  }

  if (status === "REFUSE") {
    updateData.rejectionReason = "Refusé via pipeline de présélection";
  }

  if (status === "EN_EVALUATION") {
    updateData.evaluatedAt = now;
  }

  await db.preselection.update({
    where: { id },
    data: updateData,
  });

  revalidatePath("/formateurs/preselection");
}

export async function updateScoreAction(formData: FormData) {
  const id = formData.get("id") as string;
  const score = parseInt(formData.get("score") as string, 10);
  const notes = (formData.get("notes") as string) || undefined;

  if (!id || isNaN(score)) return;

  await db.preselection.update({
    where: { id },
    data: {
      evaluationScore: score,
      evaluationNotes: notes ?? null,
    },
  });

  revalidatePath("/formateurs/preselection");
}
