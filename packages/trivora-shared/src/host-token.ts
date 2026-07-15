import { createHmac, timingSafeEqual } from "node:crypto";

/** Server-only: proves to the realtime server that the caller is the legitimate host of a session. */
export function signHostToken(sessionId: string, secret: string): string {
  return createHmac("sha256", secret).update(sessionId).digest("hex");
}

export function verifyHostToken(sessionId: string, token: string, secret: string): boolean {
  const expected = signHostToken(sessionId, secret);
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
