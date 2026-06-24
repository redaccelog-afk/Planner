"use server";

import { db } from "@ccelog/db";
import { revalidatePath } from "next/cache";

export async function validateSessionAction(sessionId: string) {
  await db.trainingSession.update({
    where: { id: sessionId },
    data: { trainerConfirmed: true },
  });

  const sess = await db.trainingSession.findUnique({
    where: { id: sessionId },
    select: { requestId: true, clientConfirmed: true },
  });

  if (!sess) return;

  if (sess.clientConfirmed) {
    await db.trainingRequest.update({
      where: { id: sess.requestId },
      data: { status: "EN_ATTENTE_VALIDATION_BO" },
    });
  } else {
    await db.trainingRequest.update({
      where: { id: sess.requestId },
      data: { status: "VALIDEE_FORMATEUR" },
    });
  }

  revalidatePath("/mes-validations");
}
