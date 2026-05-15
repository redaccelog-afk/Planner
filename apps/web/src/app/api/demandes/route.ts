import { NextResponse } from "next/server";
import { db } from "@ccelog/db";
import { CreateTrainingRequestSchema } from "@ccelog/shared";
import { auth } from "@/lib/auth";
import { z } from "zod";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const clientId = searchParams.get("clientId");

  const requests = await db.trainingRequest.findMany({
    where: {
      ...(status ? { status: status as "NOUVELLE" | "EN_RECHERCHE" | "PROPOSEE" | "CONFIRMEE" | "ANNULEE" | "CLOTUREE" } : {}),
      ...(clientId ? { clientId } : {}),
    },
    include: {
      client: true,
      site: true,
      themes: { include: { theme: true } },
      sessions: { select: { id: true, status: true } },
    },
    orderBy: [{ urgency: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(requests);
}

export async function POST(req: Request) {
  const authSession = await auth();
  if (!authSession) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const body = await req.json();
    const data = CreateTrainingRequestSchema.parse(body);
    const { themeIds, ...rest } = data;

    const request = await db.trainingRequest.create({
      data: {
        ...rest,
        themes: { create: themeIds.map((id) => ({ themeId: id })) },
      },
      include: { client: true, site: true, themes: { include: { theme: true } } },
    });

    return NextResponse.json(request, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides", details: error.errors }, { status: 422 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
