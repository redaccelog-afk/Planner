import { NextResponse } from "next/server";
import { db } from "@ccelog/db";
import { z } from "zod";

type RouteContext = { params: Promise<{ token: string }> };

const UploadSchema = z.object({
  rawContent: z.string().min(10),
  fileUrl: z.string().url().optional(),
});

// Upload rapport par le formateur (sans authentification, via token magique)
export async function POST(req: Request, ctx: RouteContext) {
  const { token } = await ctx.params;

  const report = await db.trainingReport.findFirst({
    where: {
      trainerUploadToken: token,
      trainerUploadExpiry: { gt: new Date() },
    },
    include: {
      session: { include: { trainer: true, theme: true } },
    },
  });

  if (!report) {
    return NextResponse.json(
      { error: "Lien expiré ou invalide. Contactez CCE LOG pour obtenir un nouveau lien." },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { rawContent, fileUrl } = UploadSchema.parse(body);

    const updated = await db.trainingReport.update({
      where: { id: report.id },
      data: {
        rawFromTrainer: rawContent,
        rawFileUrl: fileUrl,
        status: "RECU",
        // Invalider le token après usage
        trainerUploadToken: null,
        trainerUploadExpiry: null,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Rapport reçu. Merci !",
      reportId: updated.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Contenu invalide", details: error.errors }, { status: 422 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// GET — afficher la page d'upload (informations session)
export async function GET(_req: Request, ctx: RouteContext) {
  const { token } = await ctx.params;

  const report = await db.trainingReport.findFirst({
    where: {
      trainerUploadToken: token,
      trainerUploadExpiry: { gt: new Date() },
    },
    select: {
      id: true,
      status: true,
      session: {
        select: {
          startDate: true,
          endDate: true,
          trainer: { select: { fullName: true } },
          theme: { select: { label: true } },
          request: { select: { client: { select: { name: true } } } },
        },
      },
    },
  });

  if (!report) {
    return NextResponse.json({ error: "Lien expiré ou invalide" }, { status: 401 });
  }

  return NextResponse.json(report);
}
