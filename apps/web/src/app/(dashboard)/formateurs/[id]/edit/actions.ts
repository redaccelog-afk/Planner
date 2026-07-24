"use server";

import { db } from "@ccelog/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateTrainerAction(formData: FormData) {
  const id = formData.get("id") as string;
  const type = formData.get("type") as "INTERNE" | "EXTERNE";
  const fullName = formData.get("fullName") as string;
  const phone = formData.get("phone") as string;
  const email = (formData.get("email") as string) || null;
  const city = formData.get("city") as string;
  const address = (formData.get("address") as string) || null;
  const notes = (formData.get("notes") as string) || null;

  if (!id || !fullName || !phone || !city) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic fields per type
  const data: Record<string, any> = { fullName, phone, email, city, address, notes };

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await db.trainer.update({ where: { id }, data: data as any });

  revalidatePath(`/formateurs/${id}`);
  revalidatePath("/formateurs");

  redirect(`/formateurs/${id}`);
}

export async function addLegalEntityAction(formData: FormData) {
  const trainerId = formData.get("trainerId") as string;
  if (!trainerId) return;

  await db.trainerLegalEntity.create({
    data: {
      trainerId,
      entityName: (formData.get("entityName") as string) || null,
      legalStatus: (formData.get("legalStatus") as string) || null,
      ice: (formData.get("ice") as string) || null,
      rc: (formData.get("rc") as string) || null,
      ifFiscal: (formData.get("ifFiscal") as string) || null,
      cnss: (formData.get("cnss") as string) || null,
      iban: (formData.get("iban") as string) || null,
      bankName: (formData.get("bankName") as string) || null,
      isDefault: false,
    },
  });

  revalidatePath(`/formateurs/${trainerId}`);
  revalidatePath(`/formateurs/${trainerId}/edit`);
}

export async function removeLegalEntityAction(formData: FormData) {
  const id = formData.get("id") as string;
  const trainerId = formData.get("trainerId") as string;
  if (!id) return;

  await db.trainerLegalEntity.delete({ where: { id } });

  revalidatePath(`/formateurs/${trainerId}`);
  revalidatePath(`/formateurs/${trainerId}/edit`);
}
