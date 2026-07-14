import { prisma } from "@trivora/db";
import type { IOServer } from "./gameEngine";
import { GameRoom } from "./gameEngine";

const roomsByPin = new Map<string, GameRoom>();
const roomsBySessionId = new Map<string, GameRoom>();

export function getRoomByPin(pin: string): GameRoom | undefined {
  return roomsByPin.get(pin);
}

export function getRoomBySessionId(sessionId: string): GameRoom | undefined {
  return roomsBySessionId.get(sessionId);
}

export async function loadOrCreateRoom(io: IOServer, sessionId: string): Promise<GameRoom | null> {
  const existing = roomsBySessionId.get(sessionId);
  if (existing) return existing;

  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: { quiz: { include: { questions: { include: { choices: true } } } } },
  });
  if (!session) return null;

  const room = new GameRoom(
    io,
    { id: session.id, pin: session.pin, hostId: session.hostId, teamMode: session.teamMode },
    { backgroundTheme: session.quiz.backgroundTheme, musicTheme: session.quiz.musicTheme },
    session.quiz.questions.map((q) => ({
      id: q.id,
      order: q.order,
      type: q.type,
      text: q.text,
      mediaUrl: q.mediaUrl,
      mediaType: q.mediaType,
      mediaDisplayMode: q.mediaDisplayMode,
      timeLimitSec: q.timeLimitSec,
      points: q.points,
      choices: q.choices.map((c) => ({
        id: c.id,
        order: c.order,
        text: c.text,
        isCorrect: c.isCorrect,
        puzzlePosition: c.puzzlePosition,
      })),
    })),
    () => removeRoom(session.id, session.pin)
  );
  roomsByPin.set(session.pin, room);
  roomsBySessionId.set(session.id, room);
  return room;
}

function removeRoom(sessionId: string, pin: string) {
  const room = roomsBySessionId.get(sessionId);
  room?.destroy();
  roomsBySessionId.delete(sessionId);
  roomsByPin.delete(pin);
}
