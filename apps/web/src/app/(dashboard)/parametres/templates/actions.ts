"use server";

import { db } from "@ccelog/db";
import { revalidatePath } from "next/cache";

export async function createTemplateAction(formData: FormData) {
  const name = formData.get("name") as string;
  const code = formData.get("code") as string;
  const nomenclature = formData.get("nomenclature") as string;
  await db.attestationTemplate.create({ data: { name, code, nomenclature } });
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
