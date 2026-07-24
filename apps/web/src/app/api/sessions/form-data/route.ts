import { NextResponse } from "next/server";
import { db } from "@ccelog/db";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const [clients, allSites, themes, trainers] = await Promise.all([
      db.client.findMany({
        where: { active: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      db.clientSite.findMany({
        where: { active: true },
        select: { id: true, label: true, city: true, clientId: true },
        orderBy: { label: "asc" },
      }),
      db.theme.findMany({
        where: { active: true },
        select: { id: true, code: true, label: true, durationDays: true },
        orderBy: { code: "asc" },
      }),
      db.trainer.findMany({
        where: { active: true },
        select: { id: true, fullName: true, phone: true, type: true },
        orderBy: { fullName: "asc" },
      }),
    ]);

    return NextResponse.json({ clients, sites: allSites, themes, trainers });
  } catch (err) {
    console.error("[api/sessions/form-data]", err);
    return NextResponse.json(
      { error: "Erreur interne", detail: String(err) },
      { status: 500 }
    );
  }
}
