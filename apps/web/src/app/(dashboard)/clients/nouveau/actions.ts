"use server";

import { db } from "@ccelog/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createClientAction(formData: FormData) {
  const name = formData.get("name") as string;
  const notes = formData.get("notes") as string | null;

  // Site optionnel
  const siteLabel = formData.get("siteLabel") as string | null;
  const siteAddress = formData.get("siteAddress") as string | null;
  const siteCity = formData.get("siteCity") as string | null;

  // Contact optionnel
  const contactName = formData.get("contactName") as string | null;
  const contactEmail = formData.get("contactEmail") as string | null;
  const contactPhone = formData.get("contactPhone") as string | null;
  const contactRole = formData.get("contactRole") as string | null;

  if (!name?.trim()) {
    throw new Error("Le nom du client est requis");
  }

  const normalizedName = name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

  const client = await db.client.create({
    data: {
      name: name.trim(),
      normalizedName,
      active: true,
      notes: notes?.trim() || null,
      sites:
        siteLabel?.trim() && siteAddress?.trim() && siteCity?.trim()
          ? {
              create: {
                label: siteLabel.trim(),
                address: siteAddress.trim(),
                city: siteCity.trim(),
                active: true,
              },
            }
          : undefined,
      contacts:
        contactName?.trim()
          ? {
              create: {
                name: contactName.trim(),
                email: contactEmail?.trim() || null,
                phone: contactPhone?.trim() || null,
                role: contactRole?.trim() || null,
                primary: true,
              },
            }
          : undefined,
    },
  });

  revalidatePath("/clients");
  redirect(`/clients/${client.id}`);
}
