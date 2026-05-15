import { NextResponse } from "next/server";
import { db } from "@ccelog/db";
import { CreateTrainerSchema } from "@ccelog/shared";
import { geocodeAddress } from "@ccelog/integrations";
import { auth } from "@/lib/auth";
import { z } from "zod";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const trainers = await db.trainer.findMany({
    where: { active: true },
    include: {
      themes: { include: { theme: true } },
      rates: { orderBy: { validFrom: "desc" }, take: 1 },
    },
    orderBy: { fullName: "asc" },
  });

  return NextResponse.json(trainers);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const body = await req.json();
    const data = CreateTrainerSchema.parse(body);

    let latitude = data.latitude;
    let longitude = data.longitude;

    if (!latitude && data.address) {
      const coords = await geocodeAddress(`${data.address}, ${data.city}, Maroc`);
      if (coords) {
        latitude = coords.lat;
        longitude = coords.lng;
      }
    }

    const trainer = await db.trainer.create({
      data: { ...data, latitude, longitude },
    });

    return NextResponse.json(trainer, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides", details: error.errors }, { status: 422 });
    }
    console.error("POST /api/formateurs", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
