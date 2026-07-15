import ExcelJS from "exceljs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

function sanitizeSheetName(name: string, used: Set<string>): string {
  let clean = name.replace(/[*?:/\\[\]]/g, "").trim();
  if (clean.length === 0) clean = "Participant";
  clean = clean.slice(0, 28);
  let candidate = clean;
  let suffix = 2;
  while (used.has(candidate.toLowerCase())) {
    candidate = `${clean} (${suffix})`.slice(0, 31);
    suffix += 1;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Non authentifié", { status: 401 });
  const { id } = await params;

  const gameSession = await prisma.gameSession.findUnique({
    where: { id },
    include: {
      quiz: { include: { questions: { orderBy: { order: "asc" }, include: { choices: { orderBy: { order: "asc" } } } } } },
      players: { orderBy: { totalScore: "desc" }, include: { team: true } },
      answers: true,
    },
  });
  if (!gameSession) return new Response("Session introuvable", { status: 404 });
  if (gameSession.hostId !== session.user.id) return new Response("Accès refusé", { status: 403 });

  const questions = gameSession.quiz.questions;
  const scorableQuestions = questions.filter((q) => q.type !== "POLL");
  const answersByPlayerAndQuestion = new Map(
    gameSession.answers.map((a) => [`${a.playerId}:${a.questionId}`, a])
  );

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Trivora";
  workbook.created = new Date();

  // Sheet 1 — Bilan général
  const summarySheet = workbook.addWorksheet("Bilan général");
  const scorableAnswers = gameSession.answers.filter((a) => {
    const q = questions.find((question) => question.id === a.questionId);
    return q && q.type !== "POLL";
  });
  const correctCount = scorableAnswers.filter((a) => a.isCorrect).length;
  const totalPossible = gameSession.players.length * scorableQuestions.length;
  const successRate = totalPossible > 0 ? Math.round((correctCount / totalPossible) * 1000) / 10 : 0;

  summarySheet.columns = [
    { header: "Indicateur", key: "label", width: 40 },
    { header: "Valeur", key: "value", width: 20 },
  ];
  summarySheet.addRows([
    { label: "Quiz", value: gameSession.quiz.title },
    { label: "Date de la partie", value: gameSession.endedAt ? new Date(gameSession.endedAt).toLocaleString("fr-FR") : "" },
    { label: "Code PIN", value: gameSession.pin },
    { label: "Nombre de participants", value: gameSession.players.length },
    { label: "Nombre de questions", value: questions.length },
    { label: "Nombre de questions notées (hors sondages)", value: scorableQuestions.length },
    { label: "Réponses correctes (total)", value: correctCount },
    { label: "Réponses incorrectes / sans réponse (total)", value: Math.max(totalPossible - correctCount, 0) },
    { label: "Taux de réussite global", value: `${successRate}%` },
  ]);
  summarySheet.getRow(1).font = { bold: true };

  // Sheet 2 — Participants
  const participantsSheet = workbook.addWorksheet("Participants");
  const participantColumns = [
    { header: "Pseudo", key: "nickname", width: 24 },
    ...(gameSession.teamMode ? [{ header: "Équipe", key: "team", width: 20 }] : []),
    { header: "Bonnes réponses", key: "correct", width: 18 },
    { header: "Mauvaises réponses", key: "incorrect", width: 20 },
    { header: "Score total", key: "score", width: 14 },
  ];
  participantsSheet.columns = participantColumns;

  const usedSheetNames = new Set<string>(["bilan général", "participants"]);

  for (const player of gameSession.players) {
    let correct = 0;
    let incorrect = 0;
    for (const q of scorableQuestions) {
      const answer = answersByPlayerAndQuestion.get(`${player.id}:${q.id}`);
      if (answer?.isCorrect) correct += 1;
      else incorrect += 1;
    }
    participantsSheet.addRow({
      nickname: player.nickname,
      team: player.team?.name ?? "—",
      correct,
      incorrect,
      score: player.totalScore,
    });
  }
  participantsSheet.getRow(1).font = { bold: true };

  // One sheet per participant
  for (const player of gameSession.players) {
    const sheetName = sanitizeSheetName(player.nickname, usedSheetNames);
    const sheet = workbook.addWorksheet(sheetName);
    sheet.columns = [
      { header: "Question", key: "question", width: 50 },
      { header: "Réponse donnée", key: "answer", width: 40 },
      { header: "Statut", key: "status", width: 16 },
      { header: "Points", key: "points", width: 10 },
      { header: "Temps (s)", key: "time", width: 12 },
    ];
    sheet.getRow(1).font = { bold: true };

    questions.forEach((q, index) => {
      const answer = answersByPlayerAndQuestion.get(`${player.id}:${q.id}`);
      let answerText = "Pas de réponse";
      if (answer) {
        if (q.type === "PUZZLE") {
          const order = Array.isArray(answer.puzzleOrderJson) ? (answer.puzzleOrderJson as string[]) : [];
          answerText = order.map((choiceId) => q.choices.find((c) => c.id === choiceId)?.text ?? "?").join(" → ");
        } else if (answer.choiceId) {
          answerText = q.choices.find((c) => c.id === answer.choiceId)?.text ?? "—";
        }
      }
      const status = q.type === "POLL" ? "Sondage" : answer ? (answer.isCorrect ? "Correct" : "Incorrect") : "Sans réponse";
      sheet.addRow({
        question: `Q${index + 1}. ${q.text}`,
        answer: answerText,
        status,
        points: answer?.pointsAwarded ?? 0,
        time: answer ? Math.round(answer.timeMs / 100) / 10 : "",
      });
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="trivora-${gameSession.pin}.xlsx"`,
    },
  });
}
