"use server";

import { db } from "@ccelog/db";
import { revalidatePath } from "next/cache";

export async function updateTrainerAction(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return;

  const type = formData.get("type") as "INTERNE" | "EXTERNE";
  const fullName = formData.get("fullName") as string;
  const phone = formData.get("phone") as string;
  const email = (formData.get("email") as string) || null;
  const city = formData.get("city") as string;
  const address = (formData.get("address") as string) || null;
  const notes = (formData.get("notes") as string) || null;

  if (!fullName || !phone || !city) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic build per type
  const data: Record<string, any> = {
    type,
    fullName,
    phone,
    email,
    city,
    address,
    notes,
  };

  if (type === "INTERNE") {
    data.employeeId = (formData.get("employeeId") as string) || null;
    const employerCostRaw = formData.get("employerCost") as string;
    data.employerCost = employerCostRaw ? parseFloat(employerCostRaw) : null;
  } else {
    data.legalStatus = (formData.get("legalStatus") as string) || null;
    data.ice = (formData.get("ice") as string) || null;
    data.rc = (formData.get("rc") as string) || null;
    data.ifFiscal = (formData.get("ifFiscal") as string) || null;
    data.cnss = (formData.get("cnss") as string) || null;
    data.iban = (formData.get("iban") as string) || null;
    data.bankName = (formData.get("bankName") as string) || null;
    const defaultDayRateRaw = formData.get("defaultDayRate") as string;
    data.defaultDayRate = defaultDayRateRaw ? parseFloat(defaultDayRateRaw) : null;
    const paymentTermsRaw = formData.get("paymentTerms") as string;
    data.paymentTerms = paymentTermsRaw ? parseInt(paymentTermsRaw, 10) : 30;
  }

  await db.trainer.update({ where: { id }, data });

  revalidatePath(`/formateurs/${id}`);
  revalidatePath("/formateurs");
}

export async function toggleActiveAction(formData: FormData) {
  const id = formData.get("id") as string;
  const currentActive = formData.get("active") === "true";
  if (!id) return;

  await db.trainer.update({
    where: { id },
    data: { active: !currentActive },
  });

  revalidatePath(`/formateurs/${id}`);
  revalidatePath("/formateurs");
}

export async function addThemeAction(formData: FormData) {
  const trainerId = formData.get("trainerId") as string;
  const themeId = formData.get("themeId") as string;
  const ratePerDayRaw = formData.get("ratePerDay") as string;
  const certifiedRaw = formData.get("certified") as string;
  const certifiedUntilRaw = formData.get("certifiedUntil") as string;

  if (!trainerId || !themeId) return;

  const ratePerDay = ratePerDayRaw ? parseFloat(ratePerDayRaw) : null;
  const certified = certifiedRaw === "true" || certifiedRaw === "on";
  const certifiedUntil = certifiedUntilRaw ? new Date(certifiedUntilRaw) : null;

  await db.trainerTheme.upsert({
    where: { trainerId_themeId: { trainerId, themeId } },
    update: { ratePerDay, certified, certifiedUntil },
    create: { trainerId, themeId, ratePerDay, certified, certifiedUntil },
  });

  revalidatePath(`/formateurs/${trainerId}`);
}

export async function removeThemeAction(formData: FormData) {
  const trainerId = formData.get("trainerId") as string;
  const themeId = formData.get("themeId") as string;

  if (!trainerId || !themeId) return;

  await db.trainerTheme.delete({
    where: { trainerId_themeId: { trainerId, themeId } },
  });

  revalidatePath(`/formateurs/${trainerId}`);
}

export async function addRateAction(formData: FormData) {
  const trainerId = formData.get("trainerId") as string;
  const ratePerDayRaw = formData.get("ratePerDay") as string;
  const validFromRaw = formData.get("validFrom") as string;
  const validUntilRaw = formData.get("validUntil") as string;

  if (!trainerId || !ratePerDayRaw) return;

  const ratePerDay = parseFloat(ratePerDayRaw);
  const validFrom = validFromRaw ? new Date(validFromRaw) : new Date();
  const validUntil = validUntilRaw ? new Date(validUntilRaw) : null;

  await db.trainerRate.create({
    data: { trainerId, ratePerDay, validFrom, validUntil },
  });

  revalidatePath(`/formateurs/${trainerId}`);
}
