import { NextResponse } from "next/server";
import { db } from "@ccelog/db";
import { sendMail } from "@ccelog/integrations";
import { auth } from "@/lib/auth";
import { buildAvisFavorableEmail, buildConfirmationEmail, buildEnvoiRapportEmail } from "@/lib/email-templates";
import { z } from "zod";

// R7 — Aucun envoi automatique : toujours déclenché manuellement via ce endpoint
const SendMailSchema = z.object({
  sessionId: z.string(),
  templateType: z.enum(["AVIS_FAVORABLE", "CONFIRMATION_CLIENT", "ENVOI_RAPPORT"]),
  toAddresses: z.array(z.string().email()).min(1),
});

export async function POST(req: Request) {
  const authSession = await auth();
  if (!authSession) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const body = await req.json();
    const { sessionId, templateType, toAddresses } = SendMailSchema.parse(body);

    const session = await db.trainingSession.findUnique({
      where: { id: sessionId },
      include: {
        theme: true,
        request: {
          include: {
            client: { include: { contacts: true } },
            site: true,
          },
        },
        report: true,
      },
    });

    if (!session) return NextResponse.json({ error: "Session introuvable" }, { status: 404 });

    const data = {
      clientName: session.request.client.name,
      clientContactName: session.request.client.contacts.find((c) => c.primary)?.name,
      themeName: session.theme.label,
      startDate: session.startDate,
      endDate: session.endDate,
      city: session.request.site.city,
      participants: session.request.participants,
      estimatedCost: session.totalCost ?? undefined,
    };

    let emailPayload: { subject: string; bodyHtml: string };

    switch (templateType) {
      case "AVIS_FAVORABLE":
        emailPayload = buildAvisFavorableEmail(data);
        break;
      case "CONFIRMATION_CLIENT":
        emailPayload = buildConfirmationEmail(data);
        break;
      case "ENVOI_RAPPORT":
        emailPayload = buildEnvoiRapportEmail({
          clientName: data.clientName,
          clientContactName: data.clientContactName,
          themeName: data.themeName,
          sessionDate: session.startDate,
          reportUrl: session.report?.finalPdfUrl ?? undefined,
        });
        break;
    }

    // Envoi via Graph API (R7 — bouton manuel validé)
    await sendMail({ to: toAddresses, ...emailPayload });

    // Mise à jour statut rapport si envoi rapport
    if (templateType === "ENVOI_RAPPORT" && session.report) {
      await db.trainingReport.update({
        where: { id: session.report.id },
        data: { status: "ENVOYE_CLIENT", sentToClientAt: new Date() },
      });
    }

    // Audit log (R11)
    await db.auditLog.create({
      data: {
        userId: authSession.user?.id,
        action: "SEND_EMAIL",
        entityType: "TrainingSession",
        entityId: sessionId,
        after: JSON.stringify({ templateType, to: toAddresses }),
      },
    });

    return NextResponse.json({ ok: true, subject: emailPayload.subject });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides", details: error.errors }, { status: 422 });
    }
    console.error("mail send error:", error);
    return NextResponse.json({ error: "Erreur envoi mail", details: String(error) }, { status: 500 });
  }
}
