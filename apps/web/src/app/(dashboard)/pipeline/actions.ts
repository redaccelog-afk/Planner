"use server";

import { revalidatePath } from "next/cache";
import { enqueueIntake } from "@/lib/pipeline-enqueue";
import { db } from "@ccelog/db";

export async function validateTrainersAction(formData: FormData) {
  const pipelineId = formData.get("pipelineId") as string;
  const trainerOrderRaw = formData.get("trainerOrder") as string;

  if (!pipelineId) return;

  const trainerOrder = trainerOrderRaw ? trainerOrderRaw.split(",").filter(Boolean) : [];

  // Réordonner les candidats
  if (trainerOrder.length > 0) {
    for (let i = 0; i < trainerOrder.length; i++) {
      await db.trainerCandidate.updateMany({
        where: { pipelineId, trainerId: trainerOrder[i] },
        data: { rank: i + 1 },
      });
    }
  }

  // Déclencher le matching si pas encore fait
  const pipeline = await db.demandePipeline.findUnique({
    where: { id: pipelineId },
    include: { candidates: true },
  });

  if (!pipeline) return;

  if (pipeline.candidates.length === 0) {
    // Pas encore de candidats — lancer le matching d'abord
    await enqueueIntake({ action: "match_trainers", pipelineId });
  } else {
    // Contacter directement le #1
    await db.demandePipeline.update({
      where: { id: pipelineId },
      data: { status: "CONTACTING_TRAINER", currentTrainerIndex: 0 },
    });
    await enqueueIntake({ action: "contact_trainer", pipelineId });
  }

  revalidatePath("/pipeline");
}

export async function confirmDatesAction(formData: FormData) {
  const pipelineId = formData.get("pipelineId") as string;
  const confirmedDate = formData.get("confirmedDate") as string;

  if (!pipelineId || !confirmedDate) return;

  await db.demandePipeline.update({
    where: { id: pipelineId },
    data: { status: "WAITING_CLIENT" },
  });

  await enqueueIntake({ action: "notify_client", pipelineId });

  revalidatePath("/pipeline");
}

export async function cancelPipelineAction(formData: FormData) {
  const pipelineId = formData.get("pipelineId") as string;
  if (!pipelineId) return;

  await db.demandePipeline.update({
    where: { id: pipelineId },
    data: { status: "CANCELLED", notes: "Annulé manuellement" },
  });

  revalidatePath("/pipeline");
}
