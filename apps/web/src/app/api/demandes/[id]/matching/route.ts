import { NextResponse } from "next/server";
import { db } from "@ccelog/db";
import { scoreTrainer, rankTrainers, calculateSessionCost, shouldRequireHotel } from "@ccelog/shared";
import { getDistance } from "@ccelog/integrations";
import { auth } from "@/lib/auth";
import { addDays } from "date-fns";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteContext) {
  const authSession = await auth();
  if (!authSession) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await ctx.params;

  const request = await db.trainingRequest.findUnique({
    where: { id },
    include: {
      site: true,
      themes: { include: { theme: { include: { consumableNeeds: { include: { consumable: true } } } } } },
    },
  });

  if (!request) return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });

  const themeIds = request.themes.map((rt) => rt.themeId);
  const themeId = themeIds[0]; // Matching sur le premier thème principal
  const durationDays = request.themes[0]?.theme.durationDays ?? 1;

  // Récupérer formateurs compétents sur ce thème
  const trainersWithTheme = await db.trainer.findMany({
    where: {
      active: true,
      themes: { some: { themeId } },
    },
    include: {
      themes: { where: { themeId } },
      rates: { orderBy: { validFrom: "desc" }, take: 1 },
      availabilities: {
        where: {
          date: {
            gte: request.desiredDateFrom ?? new Date(),
            lte: request.desiredDateTo ?? addDays(new Date(), 90),
          },
          status: "OCCUPE",
        },
      },
      sessions: {
        where: {
          status: { not: "ANNULEE" },
          startDate: {
            gte: request.desiredDateFrom ? addDays(request.desiredDateFrom, -4) : addDays(new Date(), -4),
            lte: request.desiredDateTo ?? addDays(new Date(), 90),
          },
        },
        orderBy: { startDate: "asc" },
      },
    },
  });

  const candidates = await Promise.all(
    trainersWithTheme.map(async (trainer) => {
      // Vérifier disponibilité sur la période souhaitée
      const busyDays = trainer.availabilities.length;
      const isAvailable = busyDays === 0;

      // Calcul distance
      let distanceKm = 0;
      if (trainer.latitude && trainer.longitude && request.site.latitude && request.site.longitude) {
        try {
          const dist = await getDistance(
            trainer.id,
            request.siteId,
            { lat: trainer.latitude, lng: trainer.longitude },
            { lat: request.site.latitude, lng: request.site.longitude }
          );
          distanceKm = dist.distanceKm;
        } catch {
          distanceKm = 0;
        }
      }

      // Vérifier enchaînement (R1 — max 3 consécutifs)
      const consecutiveSessions = trainer.sessions.length;
      const hasConsecutiveBonus = consecutiveSessions > 0 && consecutiveSessions < 3;
      const isBlockedByRule1 = consecutiveSessions >= 3;

      // Tarif
      const ratePerDay = trainer.themes[0]?.ratePerDay ?? trainer.rates[0]?.ratePerDay ?? 1500;

      // Coût estimé
      const needsHotel = shouldRequireHotel(distanceKm);
      const consumablesCost = request.themes[0]?.theme.consumableNeeds.reduce(
        (sum, n) => sum + (n.consumable.unitCost ?? 0) * n.qtyPerParticipant * request.participants,
        0
      ) ?? 0;

      const estimatedCost = calculateSessionCost({
        trainerRatePerDay: ratePerDay,
        durationDays,
        distanceKm,
        needsHotel,
        hotelNights: needsHotel ? durationDays : 0,
        hotelCostPerNight: 450,
        consumablesCost,
      });

      return scoreTrainer({
        trainerId: trainer.id,
        fullName: trainer.fullName,
        city: trainer.city,
        phone: trainer.phone,
        hasTheme: true,
        isAvailable: isAvailable && !isBlockedByRule1,
        distanceKm,
        hasConsecutiveBonus,
        ratePerDay,
        estimatedCost,
      });
    })
  );

  const ranked = rankTrainers(candidates);

  // Mettre à jour le statut de la demande
  await db.trainingRequest.update({
    where: { id },
    data: { status: "EN_RECHERCHE" },
  });

  return NextResponse.json({
    requestId: id,
    themeId,
    candidates: ranked,
    totalCandidates: trainersWithTheme.length,
  });
}
