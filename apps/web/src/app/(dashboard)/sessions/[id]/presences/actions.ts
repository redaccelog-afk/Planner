"use server";

import { db } from "@ccelog/db";
import { revalidatePath } from "next/cache";

export async function addParticipantAction(
  sessionId: string,
  data: {
    nom: string;
    prenom: string;
    cin?: string;
    dateNaissance?: string;
    fonction?: string;
  }
) {
  await db.participant.create({
    data: {
      sessionId,
      nom: data.nom.trim(),
      prenom: data.prenom.trim(),
      cin: data.cin?.trim() || null,
      dateNaissance: data.dateNaissance ? new Date(data.dateNaissance) : null,
      fonction: data.fonction?.trim() || null,
      present: true,
    },
  });
  revalidatePath(`/sessions/${sessionId}/presences`);
}

export async function togglePresenceAction(
  participantId: string,
  present: boolean,
  sessionId: string
) {
  await db.participant.update({
    where: { id: participantId },
    data: { present },
  });
  revalidatePath(`/sessions/${sessionId}/presences`);
}
