"use server";

import { db } from "@ccelog/db";
import { revalidatePath } from "next/cache";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function resolveClientByToken(token: string) {
  const client = await db.client.findUnique({
    where: { portalToken: token },
    select: { id: true, portalTokenExpiry: true, active: true },
  });

  if (
    !client ||
    !client.active ||
    (client.portalTokenExpiry && client.portalTokenExpiry < new Date())
  ) {
    throw new Error("Lien invalide ou expiré");
  }

  return client;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

/**
 * Client confirms or refuses a proposed session.
 */
export async function clientConfirmSessionAction(
  token: string,
  sessionId: string,
  confirm: boolean
) {
  const client = await resolveClientByToken(token);

  // Ensure the session belongs to this client
  const session = await db.trainingSession.findUnique({
    where: { id: sessionId },
    include: { request: { select: { clientId: true } } },
  });

  if (!session) throw new Error("Session introuvable");
  if (session.request.clientId !== client.id) throw new Error("Accès refusé");

  if (confirm) {
    await db.trainingSession.update({
      where: { id: sessionId },
      data: { clientConfirmed: true },
    });
  } else {
    // Refuse → mark session ANNULEE
    await db.trainingSession.update({
      where: { id: sessionId },
      data: { status: "ANNULEE", clientConfirmed: false },
    });
  }

  revalidatePath(`/portal/${token}`);
}

/**
 * Client submits a new training request from the portal.
 */
export async function clientCreateRequestAction(
  token: string,
  data: {
    themeCodes: string[];
    desiredDateFrom?: string;
    desiredDateTo?: string;
    participants: number;
    notes?: string;
  }
) {
  const client = await resolveClientByToken(token);

  // Get primary site for this client (first active site)
  const site = await db.clientSite.findFirst({
    where: { clientId: client.id, active: true },
    orderBy: { id: "asc" },
  });

  if (!site) {
    throw new Error("Aucun site actif trouvé pour ce client — contactez CCE LOG");
  }

  // Resolve themes
  const themes = await db.theme.findMany({
    where: { code: { in: data.themeCodes }, active: true },
    select: { id: true },
  });

  if (themes.length === 0) {
    throw new Error("Aucun thème valide sélectionné");
  }

  await db.trainingRequest.create({
    data: {
      clientId: client.id,
      siteId: site.id,
      participants: data.participants,
      urgency: 0,
      desiredDateFrom: data.desiredDateFrom ? new Date(data.desiredDateFrom) : null,
      desiredDateTo: data.desiredDateTo ? new Date(data.desiredDateTo) : null,
      notes: data.notes ?? null,
      status: "NOUVELLE",
      themes: {
        create: themes.map((t) => ({ themeId: t.id })),
      },
    },
  });

  revalidatePath(`/portal/${token}`);
}

// ─── FormData wrappers ────────────────────────────────────────────────────────

export async function clientConfirmSessionFormAction(formData: FormData) {
  const token = formData.get("token") as string;
  const sessionId = formData.get("sessionId") as string;
  const confirm = formData.get("confirm") === "true";
  if (!token || !sessionId) throw new Error("Paramètres manquants");
  return clientConfirmSessionAction(token, sessionId, confirm);
}

export async function clientCreateRequestFormAction(formData: FormData) {
  const token = formData.get("token") as string;
  const themeCodes = formData.getAll("themeCodes") as string[];
  const desiredDateFrom = (formData.get("desiredDateFrom") as string) || undefined;
  const desiredDateTo = (formData.get("desiredDateTo") as string) || undefined;
  const participants = parseInt(formData.get("participants") as string, 10) || 1;
  const notes = (formData.get("notes") as string) || undefined;

  if (!token) throw new Error("Token manquant");

  return clientCreateRequestAction(token, {
    themeCodes,
    desiredDateFrom,
    desiredDateTo,
    participants,
    notes,
  });
}
