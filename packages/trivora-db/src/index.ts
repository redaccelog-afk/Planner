import { PrismaClient } from "./generated/client";

declare global {
  // eslint-disable-next-line no-var
  var __trivoraPrisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.__trivoraPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__trivoraPrisma = prisma;
}

export * from "./generated/client";
