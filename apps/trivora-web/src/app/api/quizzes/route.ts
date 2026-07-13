import { NextResponse } from "next/server";
import { quizInputSchema } from "@trivora/shared";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const quizzes = await prisma.quiz.findMany({
    where: { ownerId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { questions: true } } },
  });

  return NextResponse.json(quizzes);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await request.json();
  const parsed = quizInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Requête invalide" }, { status: 400 });
  }

  const { questions, ...quizData } = parsed.data;
  const quiz = await prisma.quiz.create({
    data: {
      ...quizData,
      ownerId: session.user.id,
      questions: {
        create: questions.map((q, index) => ({
          order: index,
          type: q.type,
          text: q.text,
          mediaUrl: q.mediaUrl,
          mediaType: q.mediaType,
          timeLimitSec: q.timeLimitSec,
          points: q.points,
          choices: {
            create: q.choices.map((c, cIndex) => ({
              order: cIndex,
              text: c.text,
              isCorrect: c.isCorrect,
              puzzlePosition: q.type === "PUZZLE" ? cIndex : null,
            })),
          },
        })),
      },
    },
  });

  return NextResponse.json(quiz, { status: 201 });
}
