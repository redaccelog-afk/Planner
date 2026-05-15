import { NextResponse } from "next/server";
import { db } from "@ccelog/db";
import { CreateClientSchema } from "@ccelog/shared";
import { geocodeAddress } from "@ccelog/integrations";
import { auth } from "@/lib/auth";
import { z } from "zod";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const clients = await db.client.findMany({
    where: { active: true },
    include: {
      contacts: { where: { primary: true } },
      sites: { where: { active: true } },
      _count: { select: { requests: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(clients);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const body = await req.json();
    const data = CreateClientSchema.parse(body);

    const client = await db.client.create({
      data: {
        name: data.name,
        normalizedName: data.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""),
        notes: data.notes,
      },
    });

    // Géocoder les sites si fournis
    if (body.sites?.length) {
      for (const site of body.sites as { label: string; address: string; city: string }[]) {
        const coords = await geocodeAddress(`${site.address}, ${site.city}, Maroc`);
        await db.clientSite.create({
          data: {
            clientId: client.id,
            label: site.label,
            address: site.address,
            city: site.city,
            latitude: coords?.lat,
            longitude: coords?.lng,
          },
        });
      }
    }

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides", details: error.errors }, { status: 422 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
