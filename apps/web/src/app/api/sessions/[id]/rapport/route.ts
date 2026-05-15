import { NextResponse } from "next/server";
import { db } from "@ccelog/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import crypto from "crypto";
import { addDays } from "date-fns";

type RouteContext = { params: Promise<{ id: string }> };

const UpdateReportSchema = z.object({
  status: z.enum(["ATTENDU", "RECU", "CORRIGE", "ENVOYE_CLIENT"]).optional(),
  rawFromTrainer: z.string().optional(),
  finalFileUrl: z.string().url().optional(),
  finalPdfUrl: z.string().url().optional(),
});

// GET — récupérer le rapport + générer un token formateur si besoin
export async function GET(_req: Request, ctx: RouteContext) {
  const authSession = await auth();
  if (!authSession) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await ctx.params;

  let report = await db.trainingReport.findUnique({
    where: { sessionId: id },
    include: { session: { include: { trainer: true, theme: true, request: { include: { client: true } } } } },
  });

  if (!report) {
    report = await db.trainingReport.create({
      data: { sessionId: id, status: "ATTENDU" },
      include: { session: { include: { trainer: true, theme: true, request: { include: { client: true } } } } },
    });
  }

  // Générer un token d'upload si absent ou expiré
  if (!report.trainerUploadToken || (report.trainerUploadExpiry && report.trainerUploadExpiry < new Date())) {
    const token = crypto.randomBytes(32).toString("hex");
    const expiry = addDays(new Date(), 7);
    report = await db.trainingReport.update({
      where: { id: report.id },
      data: { trainerUploadToken: token, trainerUploadExpiry: expiry },
      include: { session: { include: { trainer: true, theme: true, request: { include: { client: true } } } } },
    });
  }

  const uploadLink = `${process.env.APP_URL ?? "http://localhost:3000"}/rapport/upload/${report.trainerUploadToken}`;

  return NextResponse.json({ ...report, uploadLink });
}

// PATCH — mise à jour du rapport (correction Reda)
export async function PATCH(req: Request, ctx: RouteContext) {
  const authSession = await auth();
  if (!authSession) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await ctx.params;

  try {
    const body = await req.json();
    const data = UpdateReportSchema.parse(body);

    const report = await db.trainingReport.upsert({
      where: { sessionId: id },
      update: data,
      create: { sessionId: id, ...data, status: data.status ?? "ATTENDU" },
    });

    await db.auditLog.create({
      data: {
        userId: authSession.user?.id,
        action: "UPDATE",
        entityType: "TrainingReport",
        entityId: report.id,
        after: JSON.stringify(data),
      },
    });

    return NextResponse.json(report);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides", details: error.errors }, { status: 422 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
