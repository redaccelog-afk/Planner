import { NextResponse } from "next/server";
import { db } from "@ccelog/db";
import { CreateSessionSchema } from "@ccelog/shared";
import { auth } from "@/lib/auth";
import { z } from "zod";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const trainerId = searchParams.get("trainerId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const status = searchParams.get("status");

  const sessions = await db.trainingSession.findMany({
    where: {
      ...(trainerId ? { trainerId } : {}),
      ...(status ? { status: status as "PROVISOIRE" | "CONFIRMEE" | "ANNULEE" } : {}),
      ...(from || to
        ? {
            startDate: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
    include: {
      trainer: true,
      theme: true,
      request: { include: { client: true, site: true } },
      hotelBooking: true,
    },
    orderBy: { startDate: "asc" },
  });

  return NextResponse.json(sessions);
}

export async function POST(req: Request) {
  const authSession = await auth();
  if (!authSession) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const body = await req.json();
    const data = CreateSessionSchema.parse(body);

    const trainingSession = await db.trainingSession.create({
      data: {
        requestId: data.requestId,
        trainerId: data.trainerId,
        themeId: data.themeId,
        startDate: data.startDate,
        endDate: data.endDate,
        location: data.location,
        notes: data.notes,
        status: "PROVISOIRE",
      },
      include: { trainer: true, theme: true, request: { include: { client: true } } },
    });

    // Déclencher le job de sync Outlook
    try {
      // @ts-expect-error -- @ccelog/worker is server-side only, loaded at runtime
      const { queues } = await import("@ccelog/worker");
      await queues.outlookSync.add("sync", { sessionId: trainingSession.id, action: "create" });
    } catch {
      console.warn("Worker non disponible — sync Outlook différée");
    }

    // Déclencher le calcul de coût
    try {
      // @ts-expect-error -- @ccelog/worker is server-side only, loaded at runtime
      const { queues } = await import("@ccelog/worker");
      await queues.costRecalc.add("recalc", { sessionId: trainingSession.id });
    } catch {
      // Silencieux si worker non dispo
    }

    return NextResponse.json(trainingSession, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides", details: error.errors }, { status: 422 });
    }
    console.error("POST /api/sessions", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
