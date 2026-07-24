"use server";

import { db } from "@ccelog/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function updateUserRoleAction(formData: FormData) {
  const session = await auth();
  if ((session?.user as Record<string, unknown>)?.role !== "ADMIN") {
    throw new Error("Accès refusé");
  }

  const userId = formData.get("userId") as string;
  const role = formData.get("role") as string;

  const validRoles = ["ADMIN", "PLANIFICATEUR", "PREPARATEUR", "COMPTABILITE", "FORMATEUR", "LECTEUR", "CLIENT"];
  if (!userId || !validRoles.includes(role)) return;

  // Ne pas permettre de rétrograder son propre compte
  if (userId === (session?.user as Record<string, unknown>)?.id) return;

  await db.user.update({
    where: { id: userId },
    data: { role: role as "ADMIN" | "PLANIFICATEUR" | "PREPARATEUR" | "COMPTABILITE" | "FORMATEUR" | "LECTEUR" | "CLIENT" },
  });

  revalidatePath("/parametres/autorisations");
}
