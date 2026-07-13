import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import CloneQuizButton from "@/components/CloneQuizButton";

export default async function LibraryPage() {
  const session = await auth();
  const quizzes = await prisma.quiz.findMany({
    where: { visibility: "PUBLIC" },
    orderBy: { updatedAt: "desc" },
    include: { owner: { select: { name: true } }, _count: { select: { questions: true } } },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="font-display text-3xl font-bold">Bibliothèque publique</h1>

      {quizzes.length === 0 && (
        <p className="card p-8 text-center text-white/60">Aucun quiz public pour l&apos;instant.</p>
      )}

      <ul className="space-y-3">
        {quizzes.map((quiz) => (
          <li key={quiz.id} className="card flex items-center justify-between p-4">
            <div>
              <p className="font-semibold">{quiz.title}</p>
              <p className="text-sm text-white/60">
                {quiz._count.questions} question{quiz._count.questions > 1 ? "s" : ""} · par {quiz.owner.name}
                {quiz.category ? ` · ${quiz.category}` : ""}
              </p>
            </div>
            {quiz.ownerId === session?.user?.id ? (
              <span className="text-sm text-white/40">Ton quiz</span>
            ) : (
              <CloneQuizButton quizId={quiz.id} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
