import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await params;

  const gameSession = await prisma.gameSession.findUnique({
    where: { id },
    include: {
      quiz: { include: { questions: { orderBy: { order: "asc" }, include: { choices: true } } } },
      players: { orderBy: { totalScore: "desc" } },
      answers: true,
    },
  });
  if (!gameSession) return NextResponse.json({ error: "Session introuvable" }, { status: 404 });
  if (gameSession.hostId !== session.user.id) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  return NextResponse.json(gameSession);
}
