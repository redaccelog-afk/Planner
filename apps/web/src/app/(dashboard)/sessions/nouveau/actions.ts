"use server";

import { db } from "@ccelog/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function createSessionAction(formData: FormData) {
  const session = await auth();
  if (!session) throw new Error("Non authentifié");

  const clientId = formData.get("clientId") as string;
  const siteId = formData.get("siteId") as string;
  const themeId = formData.get("themeId") as string;
  const trainerId = formData.get("trainerId") as string;
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;
  const participants = parseInt(formData.get("participants") as string, 10) || 1;
  const location = (formData.get("location") as string) || null;
  const notes = (formData.get("notes") as string) || null;

  if (!clientId || !siteId || !themeId || !trainerId || !startDate || !endDate) {
    throw new Error("Champs obligatoires manquants");
  }

  // Créer ou retrouver la demande associée
  const existingRequest = await db.trainingRequest.findFirst({
    where: { clientId, siteId, status: { in: ["NOUVELLE", "EN_RECHERCHE"] } },
    include: { themes: true },
  });

  let requestId: string;
  if (existingRequest && existingRequest.themes.some((t) => t.themeId === themeId)) {
    requestId = existingRequest.id;
  } else {
    const newRequest = await db.trainingRequest.create({
      data: {
        clientId,
        siteId,
        participants,
        urgency: 0,
        status: "CONFIRMEE",
      },
    });
    await db.requestTheme.create({ data: { requestId: newRequest.id, themeId } });
    requestId = newRequest.id;
  }

  const created = await db.trainingSession.create({
    data: {
      requestId,
      trainerId,
      themeId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: "PROVISOIRE",
      trainerConfirmed: false,
      clientConfirmed: false,
      location,
      notes,
    },
  });

  revalidatePath("/sessions");
  redirect(`/sessions/${created.id}`);
}
