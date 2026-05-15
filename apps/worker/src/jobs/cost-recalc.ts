import type { Job } from "bullmq";
import { db } from "@ccelog/db";
import { calculateSessionCost, shouldRequireHotel } from "@ccelog/shared";

interface CostRecalcJobData {
  sessionId: string;
}

export async function costRecalcProcessor(job: Job<CostRecalcJobData>): Promise<void> {
  const { sessionId } = job.data;

  const session = await db.trainingSession.findUnique({
    where: { id: sessionId },
    include: {
      trainer: { include: { rates: { orderBy: { validFrom: "desc" }, take: 1 } } },
      theme: { include: { consumableNeeds: { include: { consumable: true } } } },
      request: { include: { site: true } },
      hotelBooking: true,
    },
  });

  if (!session) return;

  const trainerRate = session.trainer.rates[0]?.ratePerDay ?? 1500;
  const durationDays = Math.ceil(
    (session.endDate.getTime() - session.startDate.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;

  const distance = await db.distanceCache.findUnique({
    where: { trainerId_siteId: { trainerId: session.trainerId, siteId: session.request.siteId } },
  });
  const distanceKm = distance?.distanceKm ?? 0;

  const needsHotel = shouldRequireHotel(distanceKm);
  const hotelNights = needsHotel ? durationDays : 0;
  const hotelCostPerNight = session.hotelBooking?.cost
    ? session.hotelBooking.cost / Math.max(1, hotelNights)
    : 450;

  const consumablesCost = session.theme.consumableNeeds.reduce((sum, need) => {
    return sum + (need.consumable.unitCost ?? 0) * need.qtyPerParticipant * (session.request as { participants?: number }).participants ?? 10;
  }, 0);

  const breakdown = calculateSessionCost({
    trainerRatePerDay: trainerRate,
    durationDays,
    distanceKm,
    needsHotel,
    hotelNights,
    hotelCostPerNight,
    consumablesCost,
  });

  await db.trainingSession.update({
    where: { id: sessionId },
    data: {
      totalCost: breakdown.total,
      costBreakdown: JSON.stringify(breakdown),
    },
  });

  console.log(`[cost-recalc] Session ${sessionId} — coût total: ${breakdown.total} MAD`);
}
