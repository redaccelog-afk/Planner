import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import ExportCsvButton from "@/components/ExportCsvButton";

export default async function ReportDetailPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const session = await auth();

  const gameSession = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: {
      quiz: { include: { questions: { orderBy: { order: "asc" } } } },
      players: { orderBy: { totalScore: "desc" }, include: { team: true } },
      answers: true,
    },
  });
  if (!gameSession || gameSession.hostId !== session?.user.id) notFound();

  const questions = gameSession.quiz.questions;
  const rows = gameSession.players.map((player) => {
    const answersByQuestion = new Map(
      gameSession.answers.filter((a) => a.playerId === player.id).map((a) => [a.questionId, a])
    );
    return {
      nickname: player.nickname,
      teamName: player.team?.name ?? null,
      totalScore: player.totalScore,
      cells: questions.map((q) => {
        const a = answersByQuestion.get(q.id);
        return { isCorrect: a?.isCorrect ?? false, pointsAwarded: a?.pointsAwarded ?? 0, answered: Boolean(a) };
      }),
    };
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Rapport — {gameSession.quiz.title}</h1>
        <ExportCsvButton
          filename={`trivora-${gameSession.pin}.csv`}
          questions={questions.map((q, i) => `Q${i + 1}: ${q.text}`)}
          rows={rows}
        />
      </div>

      <div className="card overflow-x-auto p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-white/60">
              <th className="p-2">Joueur</th>
              {gameSession.teamMode && <th className="p-2">Équipe</th>}
              {questions.map((q, i) => (
                <th key={q.id} className="p-2" title={q.text}>
                  Q{i + 1}
                </th>
              ))}
              <th className="p-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.nickname} className="border-t border-white/10">
                <td className="p-2 font-medium">{row.nickname}</td>
                {gameSession.teamMode && <td className="p-2 text-white/70">{row.teamName ?? "—"}</td>}
                {row.cells.map((cell, i) => (
                  <td key={i} className="p-2">
                    {cell.answered ? (cell.isCorrect ? "✅" : "❌") : "—"} {cell.pointsAwarded || ""}
                  </td>
                ))}
                <td className="p-2 font-bold">{row.totalScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
