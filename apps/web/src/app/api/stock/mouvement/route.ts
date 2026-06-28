import { NextResponse } from "next/server";
import { db } from "@ccelog/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

const MouvementSchema = z.object({
  consumableId: z.string(),
  quantity: z.number().int().refine((n) => n !== 0, "La quantité ne peut pas être 0"),
  reason: z.string().min(3),
});

const DecrementSessionSchema = z.object({
  sessionId: z.string(),
});

// Mouvement manuel (entrée ou sortie)
export async function POST(req: Request) {
  const authSession = await auth();
  if (!authSession) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const body = await req.json();
    const { consumableId, quantity, reason } = MouvementSchema.parse(body);

    const consumable = await db.consumable.findUnique({ where: { id: consumableId } });
    if (!consumable) return NextResponse.json({ error: "Consommable introuvable" }, { status: 404 });

    const newBalance = consumable.stockQty + quantity;
    if (newBalance < 0) {
      return NextResponse.json(
        {
          error: `Stock insuffisant. Quantité disponible: ${consumable.stockQty}`,
        },
        { status: 409 }
      );
    }

    const alertTriggered = newBalance <= consumable.minStock;

    await db.$transaction(async (tx) => {
      await tx.consumable.update({
        where: { id: consumableId },
        data: { stockQty: newBalance },
      });
      await tx.stockMovement.create({
        data: { consumableId, quantity, reason, balanceAfter: newBalance },
      });

      if (alertTriggered && consumable.notifyUserId) {
        // TODO: also send email to notifyUser.email
        await tx.notification.create({
          data: {
            type: "ALERTE_STOCK",
            channel: "inapp",
            recipient: consumable.notifyUserId,
            scheduledAt: new Date(),
            payload: {
              title: `Stock bas — ${consumable.label}`,
              body: `Le stock de ${consumable.label} est descendu à ${newBalance} unités (seuil minimum: ${consumable.minStock})`,
              consumableId,
              newStock: newBalance,
              minStock: consumable.minStock,
            },
          },
        });
      }
    });

    return NextResponse.json({ ok: true, newBalance, alertTriggered });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides", details: error.errors }, { status: 422 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// Décrémentation automatique à la confirmation de session (R9)
export async function PUT(req: Request) {
  const authSession = await auth();
  if (!authSession) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const body = await req.json();
    const { sessionId } = DecrementSessionSchema.parse(body);

    const session = await db.trainingSession.findUnique({
      where: { id: sessionId },
      include: {
        theme: { include: { consumableNeeds: { include: { consumable: true } } } },
        request: true,
      },
    });

    if (!session) return NextResponse.json({ error: "Session introuvable" }, { status: 404 });
    if (session.status !== "CONFIRMEE") {
      return NextResponse.json({ error: "La session doit être CONFIRMEE pour décrémenter le stock" }, { status: 400 });
    }

    const issues: string[] = [];
    const movements: { consumableId: string; label: string; quantity: number; newBalance: number }[] = [];

    for (const need of session.theme.consumableNeeds) {
      const required = Math.ceil(need.qtyPerParticipant * session.request.participants);
      const consumable = need.consumable;

      if (consumable.stockQty < required) {
        issues.push(`${consumable.label} : besoin ${required}, stock ${consumable.stockQty}`);
        continue;
      }

      const newBalance = consumable.stockQty - required;
      movements.push({ consumableId: consumable.id, label: consumable.label, quantity: -required, newBalance });
    }

    if (issues.length > 0) {
      return NextResponse.json({ error: "Stock insuffisant (R9)", details: issues }, { status: 409 });
    }

    // Appliquer les mouvements en transaction + alertes stock bas
    const needsForAlert = session.theme.consumableNeeds.map((n) => n.consumable);

    await db.$transaction(async (tx) => {
      for (const { consumableId, quantity, newBalance } of movements) {
        await tx.consumable.update({ where: { id: consumableId }, data: { stockQty: newBalance } });
        await tx.stockMovement.create({
          data: { consumableId, quantity, reason: `session:${sessionId}`, balanceAfter: newBalance },
        });
        await tx.consumableUsage.upsert({
          where: { sessionId_consumableId: { sessionId, consumableId } },
          update: { decremented: true },
          create: { sessionId, consumableId, quantity: Math.abs(quantity), decremented: true },
        });

        // Task 2 — minimum stock alert after session decrement
        const consumable = needsForAlert.find((c) => c.id === consumableId);
        if (consumable && newBalance <= consumable.minStock && consumable.notifyUserId) {
          // TODO: also send email to notifyUser.email
          await tx.notification.create({
            data: {
              type: "ALERTE_STOCK",
              channel: "inapp",
              recipient: consumable.notifyUserId,
              scheduledAt: new Date(),
              payload: {
                title: `Stock bas — ${consumable.label}`,
                body: `Le stock de ${consumable.label} est descendu à ${newBalance} unités (seuil minimum: ${consumable.minStock})`,
                consumableId,
                newStock: newBalance,
                minStock: consumable.minStock,
              },
            },
          });
        }
      }
    });

    return NextResponse.json({ ok: true, movements });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides", details: error.errors }, { status: 422 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
