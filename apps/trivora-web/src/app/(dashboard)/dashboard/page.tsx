import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import HostGameButton from "@/components/HostGameButton";
import DeleteQuizButton from "@/components/DeleteQuizButton";

export default async function DashboardPage() {
  const session = await auth();
  const quizzes = await prisma.quiz.findMany({
    where: { ownerId: session!.user.id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { questions: true } } },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Mes quiz</h1>
        <Link href="/quizzes/new" className="btn-primary">
          + Nouveau quiz
        </Link>
      </div>

      {quizzes.length === 0 && (
        <p className="card p-8 text-center text-white/60">
          Tu n&apos;as pas encore de quiz. Crée le premier pour lancer ta première partie !
        </p>
      )}

      <ul className="space-y-3">
        {quizzes.map((quiz) => (
          <li key={quiz.id} className="card flex items-center justify-between p-4">
            <div>
              <p className="font-semibold">{quiz.title}</p>
              <p className="text-sm text-white/60">
                {quiz._count.questions} question{quiz._count.questions > 1 ? "s" : ""} ·{" "}
                {quiz.visibility === "PUBLIC" ? "Public" : "Privé"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <HostGameButton quizId={quiz.id} />
              <Link href={`/quizzes/${quiz.id}/edit`} className="btn-secondary">
                Éditer
              </Link>
              <DeleteQuizButton quizId={quiz.id} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
