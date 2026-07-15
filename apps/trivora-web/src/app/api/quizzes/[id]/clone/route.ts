import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await params;

  const source = await prisma.quiz.findUnique({
    where: { id },
    include: { questions: { include: { choices: true } } },
  });
  if (!source) return NextResponse.json({ error: "Quiz introuvable" }, { status: 404 });
  if (source.visibility !== "PUBLIC" && source.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const clone = await prisma.quiz.create({
    data: {
      ownerId: session.user.id,
      title: `${source.title} (copie)`,
      description: source.description,
      category: source.category,
      coverImageUrl: source.coverImageUrl,
      visibility: "PRIVATE",
      clonedFromId: source.id,
      questions: {
        create: source.questions.map((q) => ({
          order: q.order,
          type: q.type,
          text: q.text,
          mediaUrl: q.mediaUrl,
          mediaType: q.mediaType,
          timeLimitSec: q.timeLimitSec,
          points: q.points,
          choices: {
            create: q.choices.map((c) => ({
              order: c.order,
              text: c.text,
              isCorrect: c.isCorrect,
              puzzlePosition: c.puzzlePosition,
            })),
          },
        })),
      },
    },
  });

  return NextResponse.json({ id: clone.id }, { status: 201 });
}
