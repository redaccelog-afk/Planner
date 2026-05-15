"use server";

import { db } from "@ccelog/db";
import { revalidatePath } from "next/cache";

export async function updateClientAction(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const notes = formData.get("notes") as string | null;
  const active = formData.get("active") === "true";

  if (!id || !name?.trim()) {
    throw new Error("Nom du client requis");
  }

  await db.client.update({
    where: { id },
    data: {
      name: name.trim(),
      normalizedName: name.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""),
      notes: notes?.trim() || null,
      active,
    },
  });

  revalidatePath(`/clients/${id}`);
  revalidatePath("/clients");
}

export async function addContactAction(formData: FormData) {
  const clientId = formData.get("clientId") as string;
  const name = formData.get("name") as string;
  const email = formData.get("email") as string | null;
  const phone = formData.get("phone") as string | null;
  const role = formData.get("role") as string | null;
  const primary = formData.get("primary") === "true";

  if (!clientId || !name?.trim()) {
    throw new Error("Nom du contact requis");
  }

  if (primary) {
    await db.clientContact.updateMany({
      where: { clientId },
      data: { primary: false },
    });
  }

  await db.clientContact.create({
    data: {
      clientId,
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      role: role?.trim() || null,
      primary,
    },
  });

  revalidatePath(`/clients/${clientId}`);
}

export async function removeContactAction(formData: FormData) {
  const contactId = formData.get("contactId") as string;
  const clientId = formData.get("clientId") as string;

  if (!contactId) throw new Error("Contact introuvable");

  await db.clientContact.delete({ where: { id: contactId } });

  revalidatePath(`/clients/${clientId}`);
}

export async function setPrimaryContactAction(formData: FormData) {
  const contactId = formData.get("contactId") as string;
  const clientId = formData.get("clientId") as string;

  if (!contactId || !clientId) throw new Error("Paramètres manquants");

  await db.clientContact.updateMany({
    where: { clientId },
    data: { primary: false },
  });

  await db.clientContact.update({
    where: { id: contactId },
    data: { primary: true },
  });

  revalidatePath(`/clients/${clientId}`);
}

export async function addSiteAction(formData: FormData) {
  const clientId = formData.get("clientId") as string;
  const label = formData.get("label") as string;
  const address = formData.get("address") as string;
  const city = formData.get("city") as string;

  if (!clientId || !label?.trim() || !address?.trim() || !city?.trim()) {
    throw new Error("Label, adresse et ville requis");
  }

  await db.clientSite.create({
    data: {
      clientId,
      label: label.trim(),
      address: address.trim(),
      city: city.trim(),
      active: true,
    },
  });

  revalidatePath(`/clients/${clientId}`);
}

export async function toggleSiteAction(formData: FormData) {
  const siteId = formData.get("siteId") as string;
  const clientId = formData.get("clientId") as string;
  const active = formData.get("active") === "true";

  if (!siteId) throw new Error("Site introuvable");

  await db.clientSite.update({
    where: { id: siteId },
    data: { active: !active },
  });

  revalidatePath(`/clients/${clientId}`);
}
