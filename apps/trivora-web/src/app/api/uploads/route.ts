import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { auth } from "@/lib/auth";

const ALLOWED_TYPES: Record<string, "IMAGE" | "VIDEO"> = {
  "image/png": "IMAGE",
  "image/jpeg": "IMAGE",
  "image/webp": "IMAGE",
  "image/gif": "IMAGE",
  "video/mp4": "VIDEO",
  "video/webm": "VIDEO",
};

const MAX_SIZE_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }
  const mediaType = ALLOWED_TYPES[file.type];
  if (!mediaType) {
    return NextResponse.json({ error: "Type de fichier non supporté (image ou vidéo uniquement)" }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "Fichier trop volumineux (25 Mo max)" }, { status: 400 });
  }

  const extension = file.name.includes(".") ? file.name.split(".").pop() : mediaType === "IMAGE" ? "png" : "mp4";
  const filename = `${randomUUID()}.${extension}`;
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadsDir, filename), bytes);

  const origin = new URL(request.url).origin;
  return NextResponse.json({ url: `${origin}/uploads/${filename}`, mediaType }, { status: 201 });
}
