import { NextResponse } from "next/server";
import { db } from "@ccelog/db";
import { generateDocument, uploadDocument } from "@ccelog/integrations";
import type { DocumentTemplateType } from "@ccelog/integrations";
import { auth } from "@/lib/auth";
import { z } from "zod";

type RouteContext = { params: Promise<{ id: string }> };

const GenerateDocSchema = z.object({
  type: z.enum([
    "CONVOCATION",
    "LISTE_PRESENCE",
    "EVALUATION",
    "TEST",
    "RAPPORT",
    "CERTIFICAT",
    "BON_SORTIE_MATERIEL",
  ]),
});

export async function POST(req: Request, ctx: RouteContext) {
  const authSession = await auth();
  if (!authSession) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await ctx.params;

  try {
    const body = await req.json();
    const { type } = GenerateDocSchema.parse(body);

    const session = await db.trainingSession.findUnique({
      where: { id },
      include: {
        trainer: true,
        theme: {
          include: {
            materialNeeds: { include: { material: true } },
          },
        },
        request: {
          include: {
            client: { include: { contacts: true } },
            site: true,
          },
        },
      },
    });

    if (!session) return NextResponse.json({ error: "Session introuvable" }, { status: 404 });

    // Vérification stock R9 avant de confirmer (uniquement sur CONFIRMEE)
    if (type === "CONVOCATION" && session.status === "CONFIRMEE") {
      const stockIssues = await checkStockForSession(session);
      if (stockIssues.length > 0) {
        return NextResponse.json(
          { error: "Stock insuffisant", details: stockIssues },
          { status: 409 }
        );
      }
    }

    const primaryContact = session.request.client.contacts.find((c) => c.primary);

    const docData = {
      client: {
        name: session.request.client.name,
        contactName: primaryContact?.name,
        contactEmail: primaryContact?.email ?? undefined,
      },
      site: {
        label: session.request.site.label,
        city: session.request.site.city,
        address: session.request.site.address,
      },
      trainer: {
        fullName: session.trainer.fullName,
        phone: session.trainer.phone,
      },
      theme: {
        code: session.theme.code,
        label: session.theme.label,
        durationDays: session.theme.durationDays,
      },
      session: {
        id: session.id,
        startDate: session.startDate,
        endDate: session.endDate,
        participants: session.request.participants,
        location: session.location ?? undefined,
      },
    };

    const buffer = await generateDocument(type as DocumentTemplateType, docData);
    const fileName = `${session.id}_${type}_${Date.now()}.docx`;
    const fileUrl = await uploadDocument(fileName, buffer);

    // Enregistrer en base
    const document = await db.document.upsert({
      where: {
        id: (
          await db.document.findFirst({ where: { sessionId: id, type } })
        )?.id ?? "new",
      },
      update: { fileUrl, fileName, status: "PRET" },
      create: {
        sessionId: id,
        type,
        status: "PRET",
        fileUrl,
        fileName,
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
    });

    await db.auditLog.create({
      data: {
        userId: authSession.user?.id,
        action: "CREATE",
        entityType: "Document",
        entityId: document.id,
        after: JSON.stringify({ type, fileUrl }),
      },
    });

    return NextResponse.json({ ok: true, document, fileUrl });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides", details: error.errors }, { status: 422 });
    }
    console.error("generate doc error:", error);
    return NextResponse.json({ error: "Erreur génération document", details: String(error) }, { status: 500 });
  }
}

async function checkStockForSession(
  session: Awaited<ReturnType<typeof db.trainingSession.findUnique>> & {
    request: { participants: number };
    theme: { consumableNeeds?: Array<{ consumableId: string; qtyPerParticipant: number; consumable: { stockQty: number; label: string } }> };
  }
) {
  const issues: string[] = [];
  if (!session) return issues;

  const needs = await db.consumableNeed.findMany({
    where: { themeId: session.themeId },
    include: { consumable: true },
  });

  for (const need of needs) {
    const required = Math.ceil(need.qtyPerParticipant * session.request.participants);
    if (need.consumable.stockQty < required) {
      issues.push(
        `${need.consumable.label} : besoin ${required}, stock ${need.consumable.stockQty}`
      );
    }
  }

  return issues;
}
