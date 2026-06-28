import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@ccelog/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authSession = await auth();
  if (!authSession) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const formData = await req.formData();
  const file = formData.get("photo") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Aucun fichier" }, { status: 400 });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  let photoUrl: string;

  if (supabaseUrl && supabaseKey) {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = file.type.split("/")[1] ?? "jpg";
    const fileName = `participants/${id}/photo.${ext}`;

    const uploadRes = await fetch(
      `${supabaseUrl}/storage/v1/object/formations/${fileName}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": file.type,
          "x-upsert": "true",
        },
        body: buffer,
      }
    );

    if (!uploadRes.ok) {
      return NextResponse.json({ error: "Erreur upload" }, { status: 500 });
    }

    photoUrl = `${supabaseUrl}/storage/v1/object/public/formations/${fileName}`;
  } else {
    // Fallback: base64 data URL (not for production)
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    photoUrl = `data:${file.type};base64,${base64}`;
  }

  await db.participant.update({
    where: { id },
    data: { photoUrl },
  });

  return NextResponse.json({ photoUrl });
}
