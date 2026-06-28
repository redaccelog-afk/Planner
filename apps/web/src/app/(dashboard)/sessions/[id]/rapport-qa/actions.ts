"use server"

import { db } from "@ccelog/db"
import { revalidatePath } from "next/cache"

export type RapportQAData = {
  bilanGeneral: string
  moyensDisposition: string
  accueilAmbiance: string
  hasVr: boolean
  vrDescription?: string
  recommandations: string
  conclusion: string
}

export async function saveRapportQAAction(
  sessionId: string,
  data: RapportQAData,
): Promise<void> {
  await db.rapportQA.upsert({
    where: { sessionId },
    update: {
      bilanGeneral: data.bilanGeneral,
      moyensDisposition: data.moyensDisposition,
      accueilAmbiance: data.accueilAmbiance,
      hasVr: data.hasVr,
      vrDescription: data.hasVr ? (data.vrDescription ?? null) : null,
      recommandations: data.recommandations,
      conclusion: data.conclusion,
      status: "BROUILLON",
      updatedAt: new Date(),
    },
    create: {
      sessionId,
      bilanGeneral: data.bilanGeneral,
      moyensDisposition: data.moyensDisposition,
      accueilAmbiance: data.accueilAmbiance,
      hasVr: data.hasVr,
      vrDescription: data.hasVr ? (data.vrDescription ?? null) : null,
      recommandations: data.recommandations,
      conclusion: data.conclusion,
      status: "BROUILLON",
    },
  })
  revalidatePath(`/sessions/${sessionId}/rapport`)
  revalidatePath(`/sessions/${sessionId}/rapport-qa`)
}

export async function validateRapportAction(sessionId: string): Promise<void> {
  await db.rapportQA.update({
    where: { sessionId },
    data: {
      status: "VALIDE_FORMATEUR",
      validatedByTrainerAt: new Date(),
    },
  })

  // Notify planificateurs — Notification model uses scheduledAt + channel + recipient
  const planificateurs = await db.user.findMany({
    where: { role: "PLANIFICATEUR" },
    select: { id: true, email: true },
  })

  if (planificateurs.length > 0) {
    await db.notification.createMany({
      data: planificateurs.map((p) => ({
        type: "AUTRE" as const,
        sessionId,
        scheduledAt: new Date(),
        channel: "inapp",
        recipient: p.email ?? p.id,
        payload: {
          title: "Rapport à valider",
          body: `Un rapport de formation (session ${sessionId}) est en attente de votre validation.`,
          userId: p.id,
        },
      })),
    })
  }

  revalidatePath(`/sessions/${sessionId}/rapport`)
  revalidatePath(`/sessions/${sessionId}/rapport-qa`)
}
