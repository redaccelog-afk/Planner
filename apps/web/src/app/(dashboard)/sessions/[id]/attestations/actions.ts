"use server";

import { db } from "@ccelog/db";
import type { AptitudeResult, CacesModuleRef } from "@ccelog/db";
import { revalidatePath } from "next/cache";

export async function setAttestationResultatAction(
  attestationId: string,
  resultat: AptitudeResult,
  note: number | null,
  sessionId: string
) {
  await db.attestation.update({
    where: { id: attestationId },
    data: {
      resultat,
      note: note ?? null,
    },
  });
  revalidatePath(`/sessions/${sessionId}/attestations`);
}

export async function createAttestationAction(
  sessionId: string,
  participantId: string,
  templateId: string,
  resultat: AptitudeResult,
  note: number | null
) {
  // Auto-generate numero with a simple sequence
  const template = await db.attestationTemplate.findUnique({ where: { id: templateId } });
  if (!template) throw new Error("Template introuvable");

  const updated = await db.attestationTemplate.update({
    where: { id: templateId },
    data: { lastSequence: { increment: 1 } },
  });

  const year = new Date().getFullYear();
  const seq = String(updated.lastSequence).padStart(4, "0");
  const numero = template.nomenclature
    .replace("{YEAR}", String(year))
    .replace(/{SEQ:\d+}/, seq);

  await db.attestation.upsert({
    where: { sessionId_participantId_templateId: { sessionId, participantId, templateId } },
    create: {
      sessionId,
      participantId,
      templateId,
      numero,
      resultat,
      note: note ?? null,
    },
    update: {
      resultat,
      note: note ?? null,
    },
  });

  revalidatePath(`/sessions/${sessionId}/attestations`);
}

export async function setCacesResultatAction(
  sessionId: string,
  participantId: string,
  module: CacesModuleRef,
  resultat: AptitudeResult,
  theoriqueNote: number | null,
  pratiqueNote: number | null
) {
  await db.cacesResult.upsert({
    where: { sessionId_participantId_module: { sessionId, participantId, module } },
    create: {
      sessionId,
      participantId,
      module,
      resultat,
      theoriqueNote: theoriqueNote ?? null,
      pratiqueNote: pratiqueNote ?? null,
    },
    update: {
      resultat,
      theoriqueNote: theoriqueNote ?? null,
      pratiqueNote: pratiqueNote ?? null,
    },
  });
  revalidatePath(`/sessions/${sessionId}/attestations`);
}
