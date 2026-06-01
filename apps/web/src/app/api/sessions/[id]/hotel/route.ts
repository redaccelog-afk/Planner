import { NextResponse } from "next/server";
import { db } from "@ccelog/db";
import { auth } from "@/lib/auth";
import { shouldRequireHotel } from "@ccelog/shared";
import { getDistance } from "@ccelog/integrations";
import { z } from "zod";

type RouteContext = { params: Promise<{ id: string }> };

const HotelBookingSchema = z.object({
  hotelId: z.string().optional(),
  hotelName: z.string().min(2),
  city: z.string().min(2),
  checkIn: z.coerce.date(),
  checkOut: z.coerce.date(),
  cost: z.number().min(0),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

// Suggestion d'hôtels dans la ville
export async function GET(_req: Request, ctx: RouteContext) {
  const authSession = await auth();
  if (!authSession) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await ctx.params;

  const session = await db.trainingSession.findUnique({
    where: { id },
    include: {
      trainer: true,
      request: { include: { site: true } },
      hotelBooking: true,
    },
  });

  if (!session) return NextResponse.json({ error: "Session introuvable" }, { status: 404 });

  const city = session.request.site.city;

  // Calcul distance pour déterminer si hôtel nécessaire
  let distanceKm = 0;
  if (session.trainer.latitude && session.trainer.longitude && session.request.site.latitude && session.request.site.longitude) {
    try {
      const dist = await getDistance(
        session.trainerId,
        session.request.siteId,
        { lat: session.trainer.latitude, lng: session.trainer.longitude },
        { lat: session.request.site.latitude, lng: session.request.site.longitude }
      );
      distanceKm = dist.distanceKm;
    } catch { /* fallback */ }
  }

  const hotelRequired = shouldRequireHotel(distanceKm);

  const suggestedHotels = await db.hotel.findMany({
    where: { city: { contains: city, mode: "insensitive" }, active: true },
    orderBy: { priceMin: "asc" },
  });

  return NextResponse.json({
    hotelRequired,
    distanceKm,
    city,
    existingBooking: session.hotelBooking,
    suggestedHotels,
  });
}

// Créer/mettre à jour la réservation hôtel
export async function POST(req: Request, ctx: RouteContext) {
  const authSession = await auth();
  if (!authSession) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await ctx.params;

  try {
    const body = await req.json();
    const data = HotelBookingSchema.parse(body);

    const booking = await db.hotelBooking.upsert({
      where: { sessionId: id },
      update: data,
      create: { sessionId: id, ...data, status: "A_RESERVER" },
      include: { hotel: true },
    });

    // Recalculer le coût total
    try {
      // @ts-expect-error -- @ccelog/worker is server-side only, loaded at runtime
      const { queues } = await import("@ccelog/worker");
      await queues.costRecalc.add("recalc", { sessionId: id });
    } catch { /* worker non dispo */ }

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides", details: error.errors }, { status: 422 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
