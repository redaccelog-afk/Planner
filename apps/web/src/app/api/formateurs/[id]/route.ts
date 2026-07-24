import { NextResponse } from "next/server";
import { db } from "@ccelog/db";
import { UpdateTrainerSchema } from "@ccelog/shared";
import { geocodeAddress } from "@ccelog/integrations";
import { requireRole, isAuthErr } from "@/lib/api-auth";
import { z } from "zod";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteContext) {
  const check = await requireRole(["ADMIN", "PLANIFICATEUR", "PREPARATEUR", "COMPTABILITE", "FORMATEUR"]);
  if (isAuthErr(check)) return check;
  const { role } = check;

  const { id } = await ctx.params;

  const trainer = await db.trainer.findUnique({
    where: { id },
    include: {
      themes: { include: { theme: true } },
      rates: { orderBy: { validFrom: "desc" } },
      availabilities: { orderBy: { date: "asc" }, take: 30 },
    },
  });

  if (!trainer) return NextResponse.json({ error: "Formateur introuvable" }, { status: 404 });

  // Champs bancaires/fiscaux réservés à ADMIN et COMPTABILITE
  const canSeeSensitive = role === "ADMIN" || role === "COMPTABILITE";
  if (!canSeeSensitive) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { iban, bankName, ice, rc, ifFiscal, cnss, ...safeTrainer } = trainer;
    return NextResponse.json(safeTrainer);
  }

  return NextResponse.json(trainer);
}

export async function PATCH(req: Request, ctx: RouteContext) {
  const check = await requireRole(["ADMIN", "PLANIFICATEUR"]);
  if (isAuthErr(check)) return check;

  const { id } = await ctx.params;

  try {
    const body = await req.json();
    const data = UpdateTrainerSchema.parse(body);

    if (data.address && !data.latitude) {
      const coords = await geocodeAddress(`${data.address}, ${data.city ?? ""}, Maroc`);
      if (coords) {
        data.latitude = coords.lat;
        data.longitude = coords.lng;
      }
    }

    const trainer = await db.trainer.update({ where: { id }, data });
    return NextResponse.json(trainer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides", details: error.errors }, { status: 422 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: RouteContext) {
  const check = await requireRole(["ADMIN", "PLANIFICATEUR"]);
  if (isAuthErr(check)) return check;

  const { id } = await ctx.params;

  await db.trainer.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ ok: true });
}
