"use server";

import { db } from "@ccelog/db";
import { revalidatePath } from "next/cache";

export type ParticipantRow = {
  nom: string;
  prenom: string;
  dateNaissance?: string;
  cin?: string;
  cnss?: string;
  matricule?: string;
  noteTheorique?: number;
  notePratique?: number;
  appreciation?: string;
  remarque?: string;
};

export async function importParticipantsAction(
  sessionId: string,
  rows: ParticipantRow[]
) {
  await db.participant.createMany({
    data: rows.map((r) => ({
      sessionId,
      nom: r.nom,
      prenom: r.prenom,
      dateNaissance: r.dateNaissance ? new Date(r.dateNaissance) : null,
      cin: r.cin ?? null,
      cnss: r.cnss ?? null,
      matricule: r.matricule ?? null,
      noteTheorique: r.noteTheorique ?? null,
      notePratique: r.notePratique ?? null,
      appreciation: r.appreciation ?? null,
      remarque: r.remarque ?? null,
      present: true,
    })),
    skipDuplicates: true,
  });
  revalidatePath(`/sessions/${sessionId}/presences`);
}

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
