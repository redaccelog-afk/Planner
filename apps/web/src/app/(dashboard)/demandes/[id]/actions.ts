"use server";

import { db } from "@ccelog/db";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";

type RequestStatus =
  | "NOUVELLE"
  | "EN_ATTENTE_VALIDATION_FORMATEUR"
  | "VALIDEE_FORMATEUR"
  | "EN_ATTENTE_VALIDATION_BO"
  | "EN_RECHERCHE"
  | "PROPOSEE"
  | "CONFIRMEE"
  | "TERMINEE"
  | "ANNULEE"
  | "CLOTUREE";

const VALID_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  NOUVELLE:                        ["EN_ATTENTE_VALIDATION_FORMATEUR", "EN_RECHERCHE", "ANNULEE"],
  EN_ATTENTE_VALIDATION_FORMATEUR: ["VALIDEE_FORMATEUR", "ANNULEE"],
  VALIDEE_FORMATEUR:               ["EN_ATTENTE_VALIDATION_BO", "ANNULEE"],
  EN_ATTENTE_VALIDATION_BO:        ["CONFIRMEE", "ANNULEE"],
  EN_RECHERCHE:                    ["EN_ATTENTE_VALIDATION_FORMATEUR", "PROPOSEE", "ANNULEE"],
  PROPOSEE:                        ["EN_ATTENTE_VALIDATION_FORMATEUR", "CONFIRMEE", "ANNULEE"],
  CONFIRMEE:                       ["TERMINEE", "ANNULEE"],
  TERMINEE:                        [],
  ANNULEE:                         [],
  CLOTUREE:                        [],
};

export async function updateRequestStatusAction(requestId: string, targetStatus: RequestStatus) {
  const session = await auth();
  if (!session) throw new Error("Non authentifié");

  const request = await db.trainingRequest.findUnique({
    where: { id: requestId },
    select: { id: true, status: true },
  });
  if (!request) throw new Error("Demande introuvable");

  const currentStatus = request.status as RequestStatus;
  const allowed = VALID_TRANSITIONS[currentStatus] ?? [];
  if (!allowed.includes(targetStatus)) {
    throw new Error(`Transition ${currentStatus} → ${targetStatus} non autorisée`);
  }

  await db.trainingRequest.update({
    where: { id: requestId },
    data: { status: targetStatus },
  });

  await db.auditLog.create({
    data: {
      userId: session.user?.id ?? null,
      action: "UPDATE",
      entityType: "TrainingRequest",
      entityId: requestId,
      before: { status: currentStatus },
      after: { status: targetStatus },
    },
  });

  revalidatePath("/demandes");
  revalidatePath(`/demandes/${requestId}`);
}

// ─── Shortcuts for specific workflow steps ───────────────────────────────────

export async function sendToFormateurAction(formData: FormData) {
  const requestId = formData.get("requestId") as string;
  if (!requestId) throw new Error("requestId manquant");
  return updateRequestStatusAction(requestId, "EN_ATTENTE_VALIDATION_FORMATEUR");
}

export async function validateFormateurAction(formData: FormData) {
  const requestId = formData.get("requestId") as string;
  if (!requestId) throw new Error("requestId manquant");
  return updateRequestStatusAction(requestId, "VALIDEE_FORMATEUR");
}

export async function validateBOAction(formData: FormData) {
  const requestId = formData.get("requestId") as string;
  if (!requestId) throw new Error("requestId manquant");
  return updateRequestStatusAction(requestId, "CONFIRMEE");
}

export async function terminerDemandeAction(formData: FormData) {
  const requestId = formData.get("requestId") as string;
  if (!requestId) throw new Error("requestId manquant");
  return updateRequestStatusAction(requestId, "TERMINEE");
}

export async function annulerDemandeAction(formData: FormData) {
  const requestId = formData.get("requestId") as string;
  if (!requestId) throw new Error("requestId manquant");
  return updateRequestStatusAction(requestId, "ANNULEE");
}

export async function workflowTransitionAction(formData: FormData) {
  const requestId = formData.get("requestId") as string;
  const targetStatus = formData.get("targetStatus") as RequestStatus;
  if (!requestId || !targetStatus) throw new Error("Paramètres manquants");
  return updateRequestStatusAction(requestId, targetStatus);
}
