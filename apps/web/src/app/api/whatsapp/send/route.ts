import { NextResponse } from "next/server";
import { db } from "@ccelog/db";
import { sendDispoRequest, sendConfirmationToTrainer } from "@ccelog/integrations";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { formatMaroc } from "@ccelog/shared";

const SendWaSchema = z.object({
  sessionId: z.string(),
  templateType: z.enum([
    "DISPO_FORMATEUR",
    "CONFIRMATION",
    "RAPPEL_DOCUMENTS",
    "RAPPEL_MATERIEL",
    "DEMANDE_RAPPORT",
  ]),
});

export async function POST(req: Request) {
  const authSession = await auth();
  if (!authSession) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const body = await req.json();
    const { sessionId, templateType } = SendWaSchema.parse(body);

    const session = await db.trainingSession.findUnique({
      where: { id: sessionId },
      include: {
        trainer: true,
        theme: true,
        request: { include: { client: true, site: true } },
      },
    });

    if (!session) return NextResponse.json({ error: "Session introuvable" }, { status: 404 });

    let waMessageId: string;
    const dateStr = formatMaroc(session.startDate);

    switch (templateType) {
      case "DISPO_FORMATEUR":
        waMessageId = await sendDispoRequest({
          phone: session.trainer.phone,
          trainerName: session.trainer.fullName,
          themeName: session.theme.label,
          clientName: session.request.client.name,
          dateFrom: dateStr,
          dateTo: formatMaroc(session.endDate),
          city: session.request.site.city,
        });
        break;

      case "CONFIRMATION":
        waMessageId = await sendConfirmationToTrainer({
          phone: session.trainer.phone,
          trainerName: session.trainer.fullName,
          themeName: session.theme.label,
          clientName: session.request.client.name,
          date: dateStr,
          city: session.request.site.city,
        });
        break;

      default:
        return NextResponse.json({ error: "Template non implémenté" }, { status: 400 });
    }

    // Enregistrer le message sortant
    let thread = await db.whatsAppThread.findFirst({
      where: { trainerId: session.trainerId, sessionId },
    });

    if (!thread) {
      thread = await db.whatsAppThread.create({
        data: { trainerId: session.trainerId, sessionId },
      });
    }

    await db.whatsAppMessage.create({
      data: {
        threadId: thread.id,
        direction: "SORTANT",
        body: `[Template: ${templateType}]`,
        waMessageId,
        intent: templateType.toLowerCase(),
      },
    });

    await db.auditLog.create({
      data: {
        userId: authSession.user?.id,
        action: "SEND_WHATSAPP",
        entityType: "TrainingSession",
        entityId: sessionId,
        after: JSON.stringify({ templateType, to: session.trainer.phone }),
      },
    });

    return NextResponse.json({ ok: true, waMessageId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides", details: error.errors }, { status: 422 });
    }
    console.error("WA send error:", error);
    return NextResponse.json({ error: "Erreur envoi WhatsApp", details: String(error) }, { status: 500 });
  }
}
