import { NextResponse } from "next/server";
import { db } from "@ccelog/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

const CreateConsomableSchema = z.object({
  label: z.string().min(2),
  unit: z.string().default("pièce"),
  stockQty: z.number().int().min(0).default(0),
  reorderAt: z.number().int().min(0).default(10),
  unitCost: z.number().min(0).optional(),
  minStock: z.number().int().min(0).default(0),
  notifyUserId: z.string().optional().nullable(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const consumables = await db.consumable.findMany({
    include: { _count: { select: { movements: true } } },
    orderBy: { label: "asc" },
  });

  return NextResponse.json(consumables);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const body = await req.json();
    const data = CreateConsomableSchema.parse(body);
    const consumable = await db.consumable.create({ data });
    return NextResponse.json(consumable, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides", details: error.errors }, { status: 422 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
