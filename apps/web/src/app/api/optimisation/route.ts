import { NextResponse } from "next/server";
import { db } from "@ccelog/db";
import { calculateSessionCost, shouldRequireHotel } from "@ccelog/shared";
import { getDistance } from "@ccelog/integrations";
import { auth } from "@/lib/auth";
import { differenceInCalendarDays } from "date-fns";
import { z } from "zod";

const OptimisationSchema = z.object({
  trainerId: z.string(),
  periodFrom: z.coerce.date(),
  periodTo: z.coerce.date(),
});

export async function POST(req: Request) {
  const authSession = await auth();
  if (!authSession) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const body = await req.json();
    const { trainerId, periodFrom, periodTo } = OptimisationSchema.parse(body);

    const trainer = await db.trainer.findUnique({
      where: { id: trainerId },
      include: { rates: { orderBy: { validFrom: "desc" }, take: 1 } },
    });

    if (!trainer) return NextResponse.json({ error: "Formateur introuvable" }, { status: 404 });

    const sessions = await db.trainingSession.findMany({
      where: {
        trainerId,
        status: { not: "ANNULEE" },
        startDate: { gte: periodFrom },
        endDate: { lte: periodTo },
      },
      include: {
        theme: true,
        request: { include: { site: true, client: true } },
        hotelBooking: true,
      },
      orderBy: { startDate: "asc" },
    });

    const ratePerDay = trainer.rates[0]?.ratePerDay ?? 1500;

    // ── Analyse des groupes consécutifs (R1) ──────────────────────
    const violations: string[] = [];
    const groups: typeof sessions[] = [];
    let currentGroup: typeof sessions = [];

    for (let i = 0; i < sessions.length; i++) {
      const s = sessions[i];
      if (currentGroup.length === 0) {
        currentGroup.push(s);
      } else {
        const prev = currentGroup[currentGroup.length - 1];
        const gap = differenceInCalendarDays(s.startDate, prev.endDate);
        if (gap <= 1) {
          currentGroup.push(s);
        } else {
          groups.push([...currentGroup]);
          currentGroup = [s];
        }
      }
    }
    if (currentGroup.length > 0) groups.push(currentGroup);

    groups.forEach((group) => {
      if (group.length > 3) {
        violations.push(
          `R1 violation : ${group.length} sessions consécutives (${group[0].request.client.name} → ${group[group.length - 1].request.client.name})`
        );
      }
    });

    // ── Calcul coût actuel et optimisé ───────────────────────────
    const currentScenario = [];
    const optimizedScenario = [];

    for (const session of sessions) {
      const durationDays = differenceInCalendarDays(session.endDate, session.startDate) + 1;
      const site = session.request.site;

      let distanceKm = 0;
      if (trainer.latitude && trainer.longitude && site.latitude && site.longitude) {
        try {
          const dist = await getDistance(
            trainerId,
            session.request.siteId,
            { lat: trainer.latitude, lng: trainer.longitude },
            { lat: site.latitude, lng: site.longitude }
          );
          distanceKm = dist.distanceKm;
        } catch { /* fallback 0 */ }
      }

      // Vérifier si la session suivante est J+1 dans la même ville
      const idx = sessions.indexOf(session);
      const nextSession = sessions[idx + 1];
      const hasNextDayInSameCity =
        nextSession &&
        nextSession.request.site.city === site.city &&
        differenceInCalendarDays(nextSession.startDate, session.endDate) <= 1;

      const needsHotel = shouldRequireHotel(distanceKm, 150, !!hasNextDayInSameCity);

      const currentCost = calculateSessionCost({
        trainerRatePerDay: ratePerDay,
        durationDays,
        distanceKm,
        needsHotel: session.hotelBooking ? true : needsHotel,
        hotelNights: session.hotelBooking ? durationDays : needsHotel ? durationDays : 0,
        hotelCostPerNight: session.hotelBooking?.cost ? session.hotelBooking.cost / durationDays : 450,
        consumablesCost: 0,
      });

      const optimizedCost = calculateSessionCost({
        trainerRatePerDay: ratePerDay,
        durationDays,
        distanceKm,
        needsHotel,
        hotelNights: needsHotel ? durationDays : 0,
        hotelCostPerNight: 420, // prix moyen hôtels partenaires
        consumablesCost: 0,
      });

      currentScenario.push({ sessionId: session.id, cost: currentCost, client: session.request.client.name });
      optimizedScenario.push({ sessionId: session.id, cost: optimizedCost, client: session.request.client.name });
    }

    const totalCurrent = currentScenario.reduce((sum, s) => sum + s.cost.total, 0);
    const totalOptimized = optimizedScenario.reduce((sum, s) => sum + s.cost.total, 0);

    // ── Suggestions d'enchaînement ────────────────────────────────
    const chainingSuggestions: string[] = [];
    for (let i = 0; i < sessions.length - 1; i++) {
      const a = sessions[i];
      const b = sessions[i + 1];
      const gap = differenceInCalendarDays(b.startDate, a.endDate);
      if (gap === 2 && a.request.site.city === b.request.site.city) {
        chainingSuggestions.push(
          `Enchaînement possible : ${a.request.client.name} (→ ${a.endDate.toLocaleDateString("fr-MA")}) + ${b.request.client.name} (← ${b.startDate.toLocaleDateString("fr-MA")}) à ${a.request.site.city} — écart 1 jour, nuit sur place économique`
        );
      }
    }

    return NextResponse.json({
      trainerId,
      trainerName: trainer.fullName,
      sessionsAnalyzed: sessions.length,
      violations,
      chainingSuggestions,
      currentTotal: totalCurrent,
      optimizedTotal: totalOptimized,
      savings: totalCurrent - totalOptimized,
      currentScenario,
      optimizedScenario,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides", details: error.errors }, { status: 422 });
    }
    console.error("optimisation error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
