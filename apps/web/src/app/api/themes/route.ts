import { NextResponse } from "next/server";
import { db } from "@ccelog/db";
import { CreateThemeSchema } from "@ccelog/shared";
import { auth } from "@/lib/auth";
import { z } from "zod";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const themes = await db.theme.findMany({
    where: { active: true },
    include: {
      consumableNeeds: { include: { consumable: true } },
      materialNeeds: { include: { material: true } },
      _count: { select: { sessions: true, trainers: true } },
    },
    orderBy: [{ category: "asc" }, { label: "asc" }],
  });

  return NextResponse.json(themes);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const body = await req.json();
    const data = CreateThemeSchema.parse(body);

    const theme = await db.theme.create({ data });
    return NextResponse.json(theme, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides", details: error.errors }, { status: 422 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
