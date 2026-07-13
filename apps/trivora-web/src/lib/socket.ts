"use client";

import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@trivora/shared";

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_TRIVORA_REALTIME_URL ?? "http://localhost:4001";
    socket = io(url, { autoConnect: false, transports: ["websocket", "polling"] });
  }
  return socket;
}
