import { NextResponse } from "next/server";
import { z } from "zod";
import { generatePin, signHostToken } from "@trivora/shared";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const createSessionSchema = z.object({
  quizId: z.string().min(1),
  teamMode: z.boolean().optional().default(false),
});

const REALTIME_SECRET = process.env.TRIVORA_REALTIME_SECRET;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!REALTIME_SECRET) return NextResponse.json({ error: "Configuration serveur manquante" }, { status: 500 });

  const body = await request.json();
  const parsed = createSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const quiz = await prisma.quiz.findUnique({ where: { id: parsed.data.quizId } });
  if (!quiz) return NextResponse.json({ error: "Quiz introuvable" }, { status: 404 });
  if (quiz.ownerId !== session.user.id) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  let pin = generatePin();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const clash = await prisma.gameSession.findUnique({ where: { pin } });
    if (!clash) break;
    pin = generatePin();
  }

  const gameSession = await prisma.gameSession.create({
    data: {
      quizId: quiz.id,
      hostId: session.user.id,
      pin,
      teamMode: parsed.data.teamMode,
    },
  });

  const hostToken = signHostToken(gameSession.id, REALTIME_SECRET);
  return NextResponse.json({ id: gameSession.id, pin: gameSession.pin, hostToken }, { status: 201 });
}
