import { NextRequest, NextResponse } from "next/server";
import { db } from "@ccelog/db";
import { auth } from "@/lib/auth";
import { randomBytes } from "crypto";

export async function POST(req: NextRequest) {
  // Require authentication
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  // Only ADMIN or PLANIFICATEUR can generate portal links
  const role = (session.user as { role?: string } | undefined)?.role;
  if (role !== "ADMIN" && role !== "PLANIFICATEUR") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  let body: { clientId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const { clientId } = body;
  if (!clientId || typeof clientId !== "string") {
    return NextResponse.json({ error: "clientId requis" }, { status: 400 });
  }

  // Check client exists
  const client = await db.client.findUnique({
    where: { id: clientId },
    select: { id: true, name: true, active: true },
  });

  if (!client) {
    return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
  }

  if (!client.active) {
    return NextResponse.json({ error: "Ce client est inactif" }, { status: 400 });
  }

  // Generate a secure random token
  const token = randomBytes(32).toString("hex");
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 30); // 30 days validity

  await db.client.update({
    where: { id: clientId },
    data: {
      portalToken: token,
      portalTokenExpiry: expiry,
    },
  });

  // Build the portal URL
  const host =
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const portalUrl = `${protocol}://${host}/portal/${token}`;

  return NextResponse.json({
    url: portalUrl,
    token,
    clientId: client.id,
    clientName: client.name,
    expiresAt: expiry.toISOString(),
  });
}
