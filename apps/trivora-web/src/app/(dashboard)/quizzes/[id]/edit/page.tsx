import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import QuizEditor from "@/components/QuizEditor";

export default async function EditQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const quiz = await prisma.quiz.findUnique({
    where: { id },
    include: { questions: { orderBy: { order: "asc" }, include: { choices: { orderBy: { order: "asc" } } } } },
  });
  if (!quiz || quiz.ownerId !== session?.user.id) notFound();

  return (
    <div>
      <h1 className="mb-6 text-center font-display text-3xl font-bold">Éditer « {quiz.title} »</h1>
      <QuizEditor
        quizId={quiz.id}
        initial={{
          title: quiz.title,
          description: quiz.description ?? "",
          category: quiz.category ?? "",
          visibility: quiz.visibility,
          backgroundTheme: quiz.backgroundTheme,
          musicTheme: quiz.musicTheme ?? "none",
          questions: quiz.questions.map((q) => ({
            id: q.id,
            type: q.type,
            text: q.text,
            mediaUrl: q.mediaUrl,
            mediaType: q.mediaType,
            mediaDisplayMode: q.mediaDisplayMode,
            timeLimitSec: q.timeLimitSec,
            points: q.points,
            choices: q.choices.map((c) => ({ id: c.id, text: c.text, isCorrect: c.isCorrect })),
          })),
        }}
      />
    </div>
  );
}
