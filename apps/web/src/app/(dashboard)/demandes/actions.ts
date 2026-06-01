"use server";

import { db } from "@ccelog/db";
import { revalidatePath } from "next/cache";
import { enqueueIntake } from "@/lib/pipeline-enqueue";

// ─────────────────────────────────────────────────────────────────────────────
// Créer une nouvelle demande de formation
// ─────────────────────────────────────────────────────────────────────────────

export async function createRequestAction(formData: FormData) {
  const clientId = formData.get("clientId") as string;
  const siteId = formData.get("siteId") as string;
  const participantsRaw = formData.get("participants") as string;
  const urgencyRaw = formData.get("urgency") as string;
  const desiredDateFromRaw = formData.get("desiredDateFrom") as string | null;
  const desiredDateToRaw = formData.get("desiredDateTo") as string | null;
  const themeCodes = formData.getAll("themeCodes") as string[];
  const notes = formData.get("notes") as string | null;

  if (!clientId || !siteId || !participantsRaw) {
    throw new Error("Champs obligatoires manquants");
  }

  const participants = parseInt(participantsRaw, 10);
  const urgency = parseInt(urgencyRaw ?? "0", 10) || 0;

  // Résoudre les thèmes depuis leurs codes
  const themes = await db.theme.findMany({
    where: { code: { in: themeCodes }, active: true },
    select: { id: true },
  });

  await db.trainingRequest.create({
    data: {
      clientId,
      siteId,
      participants,
      urgency,
      desiredDateFrom: desiredDateFromRaw ? new Date(desiredDateFromRaw) : null,
      desiredDateTo: desiredDateToRaw ? new Date(desiredDateToRaw) : null,
      notes: notes ?? null,
      themes: {
        create: themes.map((t) => ({ themeId: t.id })),
      },
    },
  });

  revalidatePath("/demandes");
}

// ─────────────────────────────────────────────────────────────────────────────
// Lancer le pipeline pour une demande existante
// ─────────────────────────────────────────────────────────────────────────────

export async function triggerPipelineAction(formData: FormData) {
  const requestId = formData.get("requestId") as string;
  if (!requestId) throw new Error("requestId manquant");

  const request = await db.trainingRequest.findUnique({
    where: { id: requestId },
    include: { client: true, site: true, themes: { include: { theme: true } } },
  });
  if (!request) throw new Error("Demande introuvable");

  // Vérifier qu'un pipeline n'existe pas déjà pour cette demande
  const existing = await db.demandePipeline.findFirst({
    where: { requestId },
  });
  if (existing) throw new Error("Un pipeline existe déjà pour cette demande");

  // Construire le message brut synthétique à partir de la demande
  const themeList = request.themes.map((rt) => `${rt.theme.code} — ${rt.theme.label}`).join(", ");
  const rawMessage = [
    `Demande de formation — ${request.client.name}`,
    `Site : ${request.site.city} (${request.site.label})`,
    `Participants : ${request.participants}`,
    `Thèmes : ${themeList}`,
    request.desiredDateFrom
      ? `Dates souhaitées : ${request.desiredDateFrom.toLocaleDateString("fr-MA")}${request.desiredDateTo ? ` → ${request.desiredDateTo.toLocaleDateString("fr-MA")}` : ""}`
      : "",
    request.notes ? `Notes : ${request.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const pipeline = await db.demandePipeline.create({
    data: {
      channel: "EMAIL",
      rawMessage,
      fromAddress: request.client.name,
      fromName: request.client.name,
      parsedClientName: request.client.name,
      parsedThemeCode: request.themes[0]?.theme.code ?? null,
      parsedThemeLabel: request.themes[0]?.theme.label ?? null,
      parsedDateFrom: request.desiredDateFrom ?? null,
      parsedDateTo: request.desiredDateTo ?? null,
      parsedParticipants: request.participants,
      parsedUrgency: request.urgency,
      requestId,
      status: "PARSED",
    },
  });

  // Passer la demande en EN_RECHERCHE
  await db.trainingRequest.update({
    where: { id: requestId },
    data: { status: "EN_RECHERCHE" },
  });

  // Enqueue le matching
  await enqueueIntake({ action: "match_trainers", pipelineId: pipeline.id });

  revalidatePath("/demandes");
  revalidatePath(`/demandes/${requestId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Modifier le statut d'une demande inline
// ─────────────────────────────────────────────────────────────────────────────

export async function updateRequestStatusAction(formData: FormData) {
  const requestId = formData.get("requestId") as string;
  const status = formData.get("status") as string;

  if (!requestId || !status) throw new Error("Paramètres manquants");

  const validStatuses = [
    "NOUVELLE",
    "EN_ATTENTE_VALIDATION_FORMATEUR",
    "VALIDEE_FORMATEUR",
    "EN_ATTENTE_VALIDATION_BO",
    "EN_RECHERCHE",
    "PROPOSEE",
    "CONFIRMEE",
    "TERMINEE",
    "ANNULEE",
    "CLOTUREE",
  ];
  if (!validStatuses.includes(status)) throw new Error("Statut invalide");

  await db.trainingRequest.update({
    where: { id: requestId },
    data: {
      status: status as
        | "NOUVELLE"
        | "EN_ATTENTE_VALIDATION_FORMATEUR"
        | "VALIDEE_FORMATEUR"
        | "EN_ATTENTE_VALIDATION_BO"
        | "EN_RECHERCHE"
        | "PROPOSEE"
        | "CONFIRMEE"
        | "TERMINEE"
        | "ANNULEE"
        | "CLOTUREE",
    },
  });

  revalidatePath("/demandes");
  revalidatePath(`/demandes/${requestId}`);
}
