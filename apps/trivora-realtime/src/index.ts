import "dotenv/config";
import { createServer } from "node:http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@trivora/shared";
import { verifyHostToken } from "@trivora/shared/server";
import { prisma } from "@trivora/db";
import { getRoomBySessionId, loadOrCreateRoom, getRoomByPin } from "./rooms";

const PORT = Number(process.env.PORT ?? 4001);
const WEB_ORIGIN = process.env.TRIVORA_WEB_ORIGIN ?? "http://localhost:3100";
const REALTIME_SECRET = process.env.TRIVORA_REALTIME_SECRET;

if (!REALTIME_SECRET) {
  throw new Error("TRIVORA_REALTIME_SECRET is required");
}

const app = express();
app.use(cors({ origin: WEB_ORIGIN }));
app.get("/healthz", (_req, res) => res.json({ ok: true }));

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: WEB_ORIGIN },
});

type SocketData = { playerId?: string; sessionId?: string; pin?: string; isHost?: boolean };

io.on("connection", (socket) => {
  const data = socket.data as SocketData;

  socket.on("host:authenticate", async ({ sessionId, hostToken }) => {
    if (!verifyHostToken(sessionId, hostToken, REALTIME_SECRET)) {
      socket.emit("error", { message: "Jeton hôte invalide." });
      return;
    }
    const room = await loadOrCreateRoom(io, sessionId);
    if (!room) {
      socket.emit("error", { message: "Session introuvable." });
      return;
    }
    data.sessionId = sessionId;
    data.isHost = true;
    room.attachHostSocket(socket);
  });

  socket.on("host:start", () => {
    if (!data.isHost || !data.sessionId) return;
    getRoomBySessionId(data.sessionId)?.start();
  });

  socket.on("host:next", () => {
    if (!data.isHost || !data.sessionId) return;
    getRoomBySessionId(data.sessionId)?.hostNext();
  });

  socket.on("host:end", () => {
    if (!data.isHost || !data.sessionId) return;
    getRoomBySessionId(data.sessionId)?.hostNext();
  });

  socket.on("host:formTeams", ({ teamCount }) => {
    if (!data.isHost || !data.sessionId) return;
    getRoomBySessionId(data.sessionId)?.formTeams(teamCount);
  });

  socket.on("player:join", async ({ pin, nickname }, ack) => {
    let room = getRoomByPin(pin);
    if (!room) {
      const session = await prisma.gameSession.findUnique({ where: { pin }, select: { id: true } });
      room = (session ? await loadOrCreateRoom(io, session.id) : undefined) ?? undefined;
    }
    if (!room) {
      ack({ ok: false, error: "Code introuvable. Vérifie le PIN." });
      return;
    }
    const result = await room.addPlayer(socket, nickname);
    if (result.ok) {
      data.playerId = result.playerId;
      data.pin = pin;
    }
    ack(result);
  });

  socket.on("player:answer", (payload) => {
    if (!data.playerId || !data.pin) return;
    const room = getRoomByPin(data.pin);
    room?.submitAnswer(socket, data.playerId, payload);
  });

  socket.on("disconnect", () => {
    if (data.playerId && data.pin) {
      getRoomByPin(data.pin)?.markPlayerSocket(data.playerId, null);
    }
  });
});

httpServer.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Trivora realtime server listening on :${PORT}`);
});
