"use server";

import { db } from "@ccelog/db";
import { revalidatePath } from "next/cache";
import { Prisma } from "@ccelog/db";

export async function createTemplateAction(formData: FormData) {
  const name = formData.get("name") as string;
  const code = formData.get("code") as string;
  const nomenclature = formData.get("nomenclature") as string;
  try {
    await db.attestationTemplate.create({ data: { name, code, nomenclature } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error(`Un template avec le code "${code}" existe déjà.`);
    }
    throw e;
  }
  revalidatePath("/parametres/templates");
}

export async function toggleTemplateAction(id: string, active: boolean) {
  await db.attestationTemplate.update({ where: { id }, data: { active } });
  revalidatePath("/parametres/templates");
}

export async function updateTemplateAction(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const nomenclature = formData.get("nomenclature") as string;
  await db.attestationTemplate.update({ where: { id }, data: { name, nomenclature } });
  revalidatePath("/parametres/templates");
}
