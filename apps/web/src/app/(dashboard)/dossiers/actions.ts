"use server";

import { db } from "@ccelog/db";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";

export async function startDossierAction(sessionId: string) {
  const authSession = await auth();

  // Fetch the theme's dossier items for this session
  const trainingSession = await db.trainingSession.findUnique({
    where: { id: sessionId },
    select: { theme: { select: { dossierItems: { orderBy: { order: "asc" } } } } },
  });

  const dossierItems = trainingSession?.theme?.dossierItems ?? [];

  // Upsert the DossierFormation
  const dossier = await db.dossierFormation.upsert({
    where: { sessionId },
    update: { status: "EN_PREPARATION", preparerId: authSession?.user?.id },
    create: { sessionId, status: "EN_PREPARATION", preparerId: authSession?.user?.id },
  });

  // Auto-create one DossierCheckItem per ThemeDossierItem (idempotent)
  if (dossierItems.length > 0) {
    await Promise.all(
      dossierItems.map((item) =>
        db.dossierCheckItem.upsert({
          where: { dossierId_dossierItemId: { dossierId: dossier.id, dossierItemId: item.id } },
          update: {},
          create: { dossierId: dossier.id, dossierItemId: item.id, checked: false, quantityConfirmed: 1 },
        })
      )
    );
  }

  revalidatePath("/dossiers");
}

export async function completeDossierAction(formData: FormData) {
  const authSession = await auth();
  if (!authSession?.user) throw new Error("Non autorisé");
  const userRole = (authSession.user as Record<string, unknown>)?.role as string;
  if (!["ADMIN", "PLANIFICATEUR", "PREPARATEUR"].includes(userRole)) throw new Error("Accès interdit");

  const sessionId = formData.get("sessionId") as string;

  const pickupTypeRaw = formData.get("pickupType") as string;
  const validPickupTypes = ["BUREAU", "ARMOIRE", "COLIS_EXPRESS", "PERSONNE"] as const;
  if (!validPickupTypes.includes(pickupTypeRaw as (typeof validPickupTypes)[number])) {
    throw new Error("Type de remise invalide");
  }
  const pickupType = pickupTypeRaw as "BUREAU" | "ARMOIRE" | "COLIS_EXPRESS" | "PERSONNE";

  const pickupDetail = (formData.get("pickupDetail") as string | null) || null;
  const itemCount = parseInt((formData.get("itemCount") as string) ?? "0", 10);

  const dossier = await db.dossierFormation.findUnique({ where: { sessionId } });
  if (!dossier) return;

  // Save each check item's state
  const updates: Promise<unknown>[] = [];
  for (let i = 0; i < itemCount; i++) {
    const dossierItemId = formData.get(`item_${i}_id`) as string;
    const checked = formData.get(`item_${i}_checked`) === "on";
    const quantityConfirmed = parseInt((formData.get(`item_${i}_qty`) as string) ?? "1", 10);

    if (dossierItemId) {
      updates.push(
        db.dossierCheckItem.upsert({
          where: { dossierId_dossierItemId: { dossierId: dossier.id, dossierItemId } },
          update: { checked, quantityConfirmed },
          create: { dossierId: dossier.id, dossierItemId, checked, quantityConfirmed },
        })
      );
    }
  }
  await Promise.all(updates);

  await db.dossierFormation.update({
    where: { sessionId },
    data: { status: "PRET", pickupType, pickupDetail, preparedAt: new Date() },
  });

  revalidatePath("/dossiers");
}
