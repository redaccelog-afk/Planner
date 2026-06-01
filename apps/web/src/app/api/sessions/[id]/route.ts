import { NextResponse } from "next/server";
import { db } from "@ccelog/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

type RouteContext = { params: Promise<{ id: string }> };

const UpdateSessionSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  trainerId: z.string().optional(),
  status: z.enum(["PROVISOIRE", "CONFIRMEE", "ANNULEE"]).optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  trainerConfirmed: z.boolean().optional(),
  clientConfirmed: z.boolean().optional(),
});

export async function GET(_req: Request, ctx: RouteContext) {
  const authSession = await auth();
  if (!authSession) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await ctx.params;

  const session = await db.trainingSession.findUnique({
    where: { id },
    include: {
      trainer: { include: { themes: { include: { theme: true } } } },
      theme: { include: { consumableNeeds: { include: { consumable: true } }, materialNeeds: { include: { material: true } } } },
      request: { include: { client: { include: { contacts: true } }, site: true } },
      hotelBooking: { include: { hotel: true } },
      documents: { include: { versions: true } },
      consumables: { include: { consumable: true } },
      materials: { include: { material: true } },
      report: true,
      whatsappThreads: { include: { messages: { orderBy: { createdAt: "asc" } } } },
      notifications: { orderBy: { scheduledAt: "asc" } },
    },
  });

  if (!session) return NextResponse.json({ error: "Session introuvable" }, { status: 404 });

  return NextResponse.json(session);
}

export async function PATCH(req: Request, ctx: RouteContext) {
  const authSession = await auth();
  if (!authSession) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await ctx.params;

  try {
    const body = await req.json();
    const data = UpdateSessionSchema.parse(body);

    const before = await db.trainingSession.findUnique({ where: { id } });
    if (!before) return NextResponse.json({ error: "Session introuvable" }, { status: 404 });

    // Règle R2 : CONFIRMEE = trainerConfirmed ET clientConfirmed
    let finalStatus = data.status ?? before.status;
    const trainerConfirmed = data.trainerConfirmed ?? before.trainerConfirmed;
    const clientConfirmed = data.clientConfirmed ?? before.clientConfirmed;

    if (trainerConfirmed && clientConfirmed && finalStatus === "PROVISOIRE") {
      finalStatus = "CONFIRMEE";
    }

    const session = await db.trainingSession.update({
      where: { id },
      data: { ...data, status: finalStatus },
    });

    // Log audit
    await db.auditLog.create({
      data: {
        userId: authSession.user?.id,
        action: "UPDATE",
        entityType: "TrainingSession",
        entityId: id,
        before: JSON.stringify(before),
        after: JSON.stringify(session),
      },
    });

    // Sync Outlook si statut a changé
    if (finalStatus !== before.status) {
      try {
        // @ts-expect-error -- @ccelog/worker is server-side only, loaded at runtime
        const { queues } = await import("@ccelog/worker");
        const action = finalStatus === "ANNULEE" ? "delete" : "update";
        await queues.outlookSync.add("sync", { sessionId: id, action });
      } catch {
        // Silencieux si worker non dispo
      }
    }

    return NextResponse.json(session);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides", details: error.errors }, { status: 422 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
