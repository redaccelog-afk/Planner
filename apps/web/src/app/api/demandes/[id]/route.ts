import { NextResponse } from "next/server";
import { db } from "@ccelog/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

type RouteContext = { params: Promise<{ id: string }> };

const UpdateRequestSchema = z.object({
  status: z.enum(["NOUVELLE", "EN_RECHERCHE", "PROPOSEE", "CONFIRMEE", "ANNULEE", "CLOTUREE"]).optional(),
  participants: z.number().int().min(1).optional(),
  desiredDateFrom: z.coerce.date().optional().nullable(),
  desiredDateTo: z.coerce.date().optional().nullable(),
  notes: z.string().optional().nullable(),
  urgency: z.number().int().min(0).max(3).optional(),
  // Champs corrigés après validation humaine de l'extraction IA
  clientId: z.string().optional(),
  siteId: z.string().optional(),
});

export async function GET(_req: Request, ctx: RouteContext) {
  const authSession = await auth();
  if (!authSession) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await ctx.params;

  const request = await db.trainingRequest.findUnique({
    where: { id },
    include: {
      client: { include: { contacts: true, sites: true } },
      site: true,
      themes: { include: { theme: true } },
      sessions: {
        include: { trainer: true, theme: true },
        orderBy: { startDate: "asc" },
      },
      emailThread: { include: { messages: { orderBy: { receivedAt: "desc" }, take: 10 } } },
    },
  });

  if (!request) return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });

  return NextResponse.json(request);
}

export async function PATCH(req: Request, ctx: RouteContext) {
  const authSession = await auth();
  if (!authSession) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await ctx.params;

  try {
    const body = await req.json();
    const data = UpdateRequestSchema.parse(body);

    const request = await db.trainingRequest.update({
      where: { id },
      data,
      include: { client: true, site: true, themes: { include: { theme: true } } },
    });

    await db.auditLog.create({
      data: {
        userId: authSession.user?.id,
        action: "UPDATE",
        entityType: "TrainingRequest",
        entityId: id,
        after: JSON.stringify(data),
      },
    });

    return NextResponse.json(request);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides", details: error.errors }, { status: 422 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
