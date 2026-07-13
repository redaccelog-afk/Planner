export type PublicQuestion = {
  id: string;
  index: number;
  total: number;
  type: "MCQ" | "TRUE_FALSE" | "POLL" | "PUZZLE";
  text: string;
  mediaUrl?: string | null;
  mediaType?: "IMAGE" | "VIDEO" | null;
  timeLimitSec: number;
  choices: { id: string; text: string }[];
  startedAt: number;
};

export type PublicPlayer = {
  id: string;
  nickname: string;
  avatarColor: string;
  teamId?: string | null;
  totalScore: number;
  connected: boolean;
};

export type AnswerDistributionEntry = {
  choiceId: string;
  count: number;
};

export type RevealPayload = {
  questionId: string;
  correctChoiceIds: string[];
  correctPuzzleOrder?: string[];
  distribution: AnswerDistributionEntry[];
  answeredCount: number;
  playerCount: number;
};

export type PlayerResultPayload = {
  questionId: string;
  isCorrect: boolean;
  pointsAwarded: number;
  totalScore: number;
  rank: number;
};

export type TeamStanding = {
  id: string;
  name: string;
  color: string;
  totalScore: number;
};

export type LeaderboardPayload = {
  players: PublicPlayer[];
  teams?: TeamStanding[];
  isFinal: boolean;
};

export type GameSessionStatus = "LOBBY" | "QUESTION" | "REVEAL" | "LEADERBOARD" | "ENDED";

/** Events emitted by clients (host or player) to the realtime server. */
export interface ClientToServerEvents {
  "host:authenticate": (payload: { sessionId: string; hostToken: string }) => void;
  "host:start": () => void;
  "host:next": () => void;
  "host:end": () => void;
  "host:formTeams": (payload: { teamCount: number }) => void;
  "player:join": (
    payload: { pin: string; nickname: string },
    ack: (result: { ok: true; playerId: string } | { ok: false; error: string }) => void
  ) => void;
  "player:answer": (payload: {
    questionId: string;
    choiceId?: string;
    puzzleOrder?: string[];
    clientElapsedMs: number;
  }) => void;
}

/** Events emitted by the realtime server to clients. */
export interface ServerToClientEvents {
  "lobby:update": (payload: {
    pin: string;
    players: PublicPlayer[];
    teams?: { id: string; name: string; color: string }[];
  }) => void;
  "game:question": (payload: PublicQuestion) => void;
  "game:answerCount": (payload: { answeredCount: number; playerCount: number }) => void;
  "game:reveal": (payload: RevealPayload) => void;
  "game:leaderboard": (payload: LeaderboardPayload) => void;
  "game:status": (payload: { status: GameSessionStatus }) => void;
  "player:result": (payload: PlayerResultPayload) => void;
  "error": (payload: { message: string }) => void;
}
