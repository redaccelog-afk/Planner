"use server";

import { db } from "@ccelog/db";
import { revalidatePath } from "next/cache";

export async function updateConfigAction(formData: FormData) {
  const keys = [
    "hotel_distance_threshold_km",
    "max_consecutive_sessions",
    "distance_cache_days",
    "pipeline_trainer_timeout_hours",
    "pipeline_client_timeout_hours",
    "whatsapp_trainer_default_message",
  ];

  for (const key of keys) {
    const value = formData.get(key) as string | null;
    if (value === null) continue;

    await db.appConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  revalidatePath("/parametres");
}
