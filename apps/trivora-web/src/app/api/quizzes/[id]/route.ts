import { NextResponse } from "next/server";
import { quizInputSchema } from "@trivora/shared";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;

  const quiz = await prisma.quiz.findUnique({
    where: { id },
    include: { questions: { orderBy: { order: "asc" }, include: { choices: { orderBy: { order: "asc" } } } } },
  });
  if (!quiz) return NextResponse.json({ error: "Quiz introuvable" }, { status: 404 });

  const isOwner = session?.user?.id === quiz.ownerId;
  if (!isOwner && quiz.visibility !== "PUBLIC") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  return NextResponse.json({ ...quiz, isOwner });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await params;

  const quiz = await prisma.quiz.findUnique({ where: { id } });
  if (!quiz) return NextResponse.json({ error: "Quiz introuvable" }, { status: 404 });
  if (quiz.ownerId !== session.user.id) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const body = await request.json();
  const parsed = quizInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Requête invalide" }, { status: 400 });
  }

  const { questions, ...quizData } = parsed.data;
  const updated = await prisma.$transaction(async (tx) => {
    await tx.question.deleteMany({ where: { quizId: id } });
    return tx.quiz.update({
      where: { id },
      data: {
        ...quizData,
        questions: {
          create: questions.map((q, index) => ({
            order: index,
            type: q.type,
            text: q.text,
            mediaUrl: q.mediaUrl,
            mediaType: q.mediaType,
            mediaDisplayMode: q.mediaDisplayMode,
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
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await params;

  const quiz = await prisma.quiz.findUnique({ where: { id } });
  if (!quiz) return NextResponse.json({ error: "Quiz introuvable" }, { status: 404 });
  if (quiz.ownerId !== session.user.id) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  await prisma.quiz.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
