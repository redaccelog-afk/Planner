"use server";

import { db } from "@ccelog/db";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";

export async function startDossierAction(sessionId: string) {
  const session = await auth();
  const existing = await db.dossierFormation.findUnique({ where: { sessionId } });
  if (existing) {
    await db.dossierFormation.update({
      where: { sessionId },
      data: { status: "EN_PREPARATION", preparerId: session?.user?.id },
    });
  } else {
    await db.dossierFormation.create({
      data: { sessionId, status: "EN_PREPARATION", preparerId: session?.user?.id },
    });
  }
  revalidatePath("/dossiers");
}

export async function completeDossierAction(formData: FormData) {
  const sessionId = formData.get("sessionId") as string;
  const pickupType = formData.get("pickupType") as
    | "BUREAU"
    | "ARMOIRE"
    | "COLIS_EXPRESS"
    | "PERSONNE";
  const pickupDetail = (formData.get("pickupDetail") as string | null) || null;

  await db.dossierFormation.update({
    where: { sessionId },
    data: { status: "PRET", pickupType, pickupDetail, preparedAt: new Date() },
  });
  revalidatePath("/dossiers");
}
