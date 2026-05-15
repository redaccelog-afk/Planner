"use server";

import { db } from "@ccelog/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createTrainerAction(formData: FormData) {
  const type = formData.get("type") as "INTERNE" | "EXTERNE";
  const fullName = formData.get("fullName") as string;
  const phone = formData.get("phone") as string;
  const email = (formData.get("email") as string) || null;
  const city = formData.get("city") as string;
  const address = (formData.get("address") as string) || null;
  const notes = (formData.get("notes") as string) || null;

  if (!fullName || !phone || !city || !type) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic fields per type
  const data: Record<string, any> = {
    type,
    fullName,
    phone,
    email,
    city,
    address,
    notes,
    active: true,
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

  const trainer = await db.trainer.create({ data });

  revalidatePath("/formateurs");

  redirect(`/formateurs/${trainer.id}`);
}
