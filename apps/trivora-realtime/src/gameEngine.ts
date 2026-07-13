import type { Server, Socket } from "socket.io";
import { prisma } from "@trivora/db";
import {
  computeSpeedScore,
  isPuzzleOrderCorrect,
  FUN_TEAM_NAMES,
  TEAM_COLORS,
  type ClientToServerEvents,
  type ServerToClientEvents,
  type PublicPlayer,
  type GameSessionStatus,
  type TeamStanding,
} from "@trivora/shared";

export type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
export type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

type LoadedChoice = { id: string; order: number; text: string; isCorrect: boolean; puzzlePosition: number | null };
type LoadedQuestion = {
  id: string;
  order: number;
  type: "MCQ" | "TRUE_FALSE" | "POLL" | "PUZZLE";
  text: string;
  mediaUrl: string | null;
  mediaType: "IMAGE" | "VIDEO" | null;
  timeLimitSec: number;
  points: number;
  choices: LoadedChoice[];
};

type PlayerState = {
  id: string;
  nickname: string;
  avatarColor: string;
  teamId: string | null;
  totalScore: number;
  connected: boolean;
  socketId: string | null;
};

type AnswerState = {
  playerId: string;
  choiceId?: string;
  puzzleOrder?: string[];
  timeMs: number;
  isCorrect: boolean;
  pointsAwarded: number;
};

const LOBBY_IDLE_TIMEOUT_MS = 3 * 60 * 60 * 1000;

export class GameRoom {
  readonly sessionId: string;
  readonly pin: string;
  readonly hostId: string;
  readonly teamMode: boolean;
  status: GameSessionStatus = "LOBBY";
  currentQuestionIndex = -1;
  players = new Map<string, PlayerState>();
  teams = new Map<string, { id: string; name: string; color: string }>();
  answersByQuestion = new Map<string, Map<string, AnswerState>>();
  hostSocketId: string | null = null;

  private questionStartedAt = 0;
  private questionTimer: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout;

  constructor(
    private io: IOServer,
    session: { id: string; pin: string; hostId: string; teamMode: boolean },
    private questions: LoadedQuestion[],
    private onEmpty: () => void
  ) {
    this.sessionId = session.id;
    this.pin = session.pin;
    this.hostId = session.hostId;
    this.teamMode = session.teamMode;
    this.questions = [...questions].sort((a, b) => a.order - b.order);
    this.cleanupTimer = setTimeout(() => this.onEmpty(), LOBBY_IDLE_TIMEOUT_MS);
  }

  private get roomChannel() {
    return `pin:${this.pin}`;
  }

  private resetCleanupTimer() {
    clearTimeout(this.cleanupTimer);
    this.cleanupTimer = setTimeout(() => this.onEmpty(), LOBBY_IDLE_TIMEOUT_MS);
  }

  private publicTeams(): { id: string; name: string; color: string }[] | undefined {
    if (!this.teamMode || this.teams.size === 0) return undefined;
    return [...this.teams.values()];
  }

  private publicPlayers(): PublicPlayer[] {
    return [...this.players.values()]
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((p) => ({
        id: p.id,
        nickname: p.nickname,
        avatarColor: p.avatarColor,
        teamId: p.teamId,
        totalScore: p.totalScore,
        connected: p.connected,
      }));
  }

  attachHostSocket(socket: IOSocket) {
    this.hostSocketId = socket.id;
    socket.join(this.roomChannel);
    socket.emit("lobby:update", { pin: this.pin, players: this.publicPlayers(), teams: this.publicTeams() });
    socket.emit("game:status", { status: this.status });
  }

  async addPlayer(socket: IOSocket, nickname: string): Promise<{ ok: true; playerId: string } | { ok: false; error: string }> {
    if (this.status !== "LOBBY") {
      return { ok: false, error: "La partie a déjà commencé." };
    }
    const trimmed = nickname.trim();
    const alreadyTaken = [...this.players.values()].some(
      (p) => p.nickname.toLowerCase() === trimmed.toLowerCase()
    );
    if (alreadyTaken) {
      return { ok: false, error: "Ce pseudo est déjà pris." };
    }
    try {
      const avatarColor = randomAvatarColor();
      const player = await prisma.player.create({
        data: { sessionId: this.sessionId, nickname: trimmed, avatarColor },
      });
      this.players.set(player.id, {
        id: player.id,
        nickname: player.nickname,
        avatarColor: player.avatarColor,
        teamId: null,
        totalScore: 0,
        connected: true,
        socketId: socket.id,
      });
      socket.join(this.roomChannel);
      this.resetCleanupTimer();
      this.io.to(this.roomChannel).emit("lobby:update", { pin: this.pin, players: this.publicPlayers(), teams: this.publicTeams() });
      return { ok: true, playerId: player.id };
    } catch {
      return { ok: false, error: "Impossible de rejoindre la partie." };
    }
  }

  async formTeams(teamCount: number) {
    if (this.status !== "LOBBY" || !this.teamMode) return;
    const count = Math.max(2, Math.min(8, Math.floor(teamCount)));
    const shuffledNames = [...FUN_TEAM_NAMES].sort(() => Math.random() - 0.5).slice(0, count);

    await prisma.team.deleteMany({ where: { sessionId: this.sessionId } });
    this.teams.clear();

    const teams = await Promise.all(
      shuffledNames.map((name, i) =>
        prisma.team.create({
          data: { sessionId: this.sessionId, name, color: TEAM_COLORS[i % TEAM_COLORS.length] },
        })
      )
    );
    teams.forEach((t) => this.teams.set(t.id, { id: t.id, name: t.name, color: t.color }));

    const playerIds = [...this.players.keys()];
    await Promise.all(
      playerIds.map((playerId, index) => {
        const team = teams[index % teams.length];
        const player = this.players.get(playerId);
        if (player) player.teamId = team.id;
        return prisma.player.update({ where: { id: playerId }, data: { teamId: team.id } });
      })
    );

    this.io.to(this.roomChannel).emit("lobby:update", { pin: this.pin, players: this.publicPlayers(), teams: this.publicTeams() });
  }

  private teamStandings(): TeamStanding[] | undefined {
    if (!this.teamMode || this.teams.size === 0) return undefined;
    const totals = new Map<string, number>();
    for (const player of this.players.values()) {
      if (!player.teamId) continue;
      totals.set(player.teamId, (totals.get(player.teamId) ?? 0) + player.totalScore);
    }
    return [...this.teams.values()]
      .map((team) => ({ id: team.id, name: team.name, color: team.color, totalScore: totals.get(team.id) ?? 0 }))
      .sort((a, b) => b.totalScore - a.totalScore);
  }

  markPlayerSocket(playerId: string, socketId: string | null) {
    const player = this.players.get(playerId);
    if (!player) return;
    player.socketId = socketId;
    player.connected = socketId !== null;
    this.io.to(this.roomChannel).emit("lobby:update", { pin: this.pin, players: this.publicPlayers(), teams: this.publicTeams() });
  }

  async start() {
    if (this.status !== "LOBBY" || this.questions.length === 0) return;
    await prisma.gameSession.update({ where: { id: this.sessionId }, data: { startedAt: new Date() } });
    this.currentQuestionIndex = -1;
    this.advanceToNextQuestion();
  }

  /** Host clicked "next": force-advance the state machine one step. */
  hostNext() {
    if (this.status === "QUESTION") {
      this.reveal();
    } else if (this.status === "REVEAL") {
      this.showLeaderboard();
    } else if (this.status === "LEADERBOARD") {
      this.advanceToNextQuestion();
    }
  }

  private currentQuestion(): LoadedQuestion | undefined {
    return this.questions[this.currentQuestionIndex];
  }

  private advanceToNextQuestion() {
    this.currentQuestionIndex += 1;
    const question = this.currentQuestion();
    if (!question) {
      this.end();
      return;
    }
    this.status = "QUESTION";
    this.answersByQuestion.set(question.id, new Map());
    this.questionStartedAt = Date.now();
    this.io.to(this.roomChannel).emit("game:question", {
      id: question.id,
      index: this.currentQuestionIndex,
      total: this.questions.length,
      type: question.type,
      text: question.text,
      mediaUrl: question.mediaUrl,
      mediaType: question.mediaType,
      timeLimitSec: question.timeLimitSec,
      choices: question.choices
        .sort((a, b) => a.order - b.order)
        .map((c) => ({ id: c.id, text: c.text })),
      startedAt: this.questionStartedAt,
    });
    this.io.to(this.roomChannel).emit("game:status", { status: this.status });
    if (this.questionTimer) clearTimeout(this.questionTimer);
    this.questionTimer = setTimeout(() => this.reveal(), question.timeLimitSec * 1000 + 300);
  }

  async submitAnswer(
    socket: IOSocket,
    playerId: string,
    payload: { questionId: string; choiceId?: string; puzzleOrder?: string[] }
  ) {
    if (this.status !== "QUESTION") return;
    const question = this.currentQuestion();
    if (!question || question.id !== payload.questionId) return;
    const answers = this.answersByQuestion.get(question.id);
    const player = this.players.get(playerId);
    if (!answers || !player || answers.has(playerId)) return;

    const timeMs = Date.now() - this.questionStartedAt;
    let isCorrect = false;
    if (question.type === "POLL") {
      isCorrect = false;
    } else if (question.type === "PUZZLE") {
      const correctOrder = [...question.choices]
        .sort((a, b) => (a.puzzlePosition ?? 0) - (b.puzzlePosition ?? 0))
        .map((c) => c.id);
      isCorrect = isPuzzleOrderCorrect(payload.puzzleOrder ?? [], correctOrder);
    } else {
      const choice = question.choices.find((c) => c.id === payload.choiceId);
      isCorrect = Boolean(choice?.isCorrect);
    }

    const pointsAwarded =
      isCorrect && question.type !== "POLL"
        ? computeSpeedScore(question.points, timeMs, question.timeLimitSec)
        : 0;

    answers.set(playerId, {
      playerId,
      choiceId: payload.choiceId,
      puzzleOrder: payload.puzzleOrder,
      timeMs,
      isCorrect,
      pointsAwarded,
    });
    player.totalScore += pointsAwarded;

    await prisma.playerAnswer.create({
      data: {
        sessionId: this.sessionId,
        playerId,
        questionId: question.id,
        choiceId: question.type === "PUZZLE" ? null : payload.choiceId ?? null,
        puzzleOrderJson: payload.puzzleOrder ?? undefined,
        timeMs,
        isCorrect,
        pointsAwarded,
      },
    });
    await prisma.player.update({ where: { id: playerId }, data: { totalScore: player.totalScore } });

    this.io.to(this.roomChannel).emit("game:answerCount", {
      answeredCount: answers.size,
      playerCount: this.players.size,
    });
    socket.emit("player:result", {
      questionId: question.id,
      isCorrect,
      pointsAwarded,
      totalScore: player.totalScore,
      rank: this.rankOf(playerId),
    });

    if (this.players.size > 0 && answers.size >= this.players.size) {
      this.reveal();
    }
  }

  private rankOf(playerId: string): number {
    const sorted = [...this.players.values()].sort((a, b) => b.totalScore - a.totalScore);
    return sorted.findIndex((p) => p.id === playerId) + 1;
  }

  private reveal() {
    if (this.status !== "QUESTION") return;
    if (this.questionTimer) {
      clearTimeout(this.questionTimer);
      this.questionTimer = null;
    }
    const question = this.currentQuestion();
    if (!question) return;
    this.status = "REVEAL";
    const answers = this.answersByQuestion.get(question.id) ?? new Map();
    const distribution = question.choices.map((c) => ({
      choiceId: c.id,
      count: [...answers.values()].filter((a) => a.choiceId === c.id).length,
    }));
    this.io.to(this.roomChannel).emit("game:reveal", {
      questionId: question.id,
      correctChoiceIds: question.choices.filter((c) => c.isCorrect).map((c) => c.id),
      correctPuzzleOrder:
        question.type === "PUZZLE"
          ? [...question.choices].sort((a, b) => (a.puzzlePosition ?? 0) - (b.puzzlePosition ?? 0)).map((c) => c.id)
          : undefined,
      distribution,
      answeredCount: answers.size,
      playerCount: this.players.size,
    });
    this.io.to(this.roomChannel).emit("game:status", { status: this.status });
  }

  private showLeaderboard() {
    if (this.status !== "REVEAL") return;
    this.status = "LEADERBOARD";
    this.io
      .to(this.roomChannel)
      .emit("game:leaderboard", { players: this.publicPlayers(), teams: this.teamStandings(), isFinal: false });
    this.io.to(this.roomChannel).emit("game:status", { status: this.status });
  }

  private async end() {
    this.status = "ENDED";
    await prisma.gameSession.update({ where: { id: this.sessionId }, data: { status: "ENDED", endedAt: new Date() } });
    this.io
      .to(this.roomChannel)
      .emit("game:leaderboard", { players: this.publicPlayers(), teams: this.teamStandings(), isFinal: true });
    this.io.to(this.roomChannel).emit("game:status", { status: this.status });
    if (this.questionTimer) clearTimeout(this.questionTimer);
    clearTimeout(this.cleanupTimer);
    setTimeout(() => this.onEmpty(), 5 * 60 * 1000);
  }

  destroy() {
    if (this.questionTimer) clearTimeout(this.questionTimer);
    clearTimeout(this.cleanupTimer);
  }
}

function randomAvatarColor(): string {
  const palette = ["#7C3AED", "#E53935", "#1E88E5", "#FBC02D", "#43A047", "#FB8C00", "#00897B", "#D81B60"];
  return palette[Math.floor(Math.random() * palette.length)];
}
