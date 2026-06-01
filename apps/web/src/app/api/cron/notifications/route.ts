import { NextResponse } from "next/server";
// @ts-expect-error -- bullmq is a server-only external package
import { Queue } from "bullmq";
// @ts-expect-error -- ioredis is a server-only external package
import IORedis from "ioredis";
// @ts-expect-error -- @ccelog/worker is server-side only, loaded at runtime
import { scheduleSessionNotifications } from "@ccelog/worker/src/jobs/notification-scheduler";

/**
 * Daily cron triggered by Vercel Cron (see vercel.json) or an external scheduler.
 * Secured by CRON_SECRET to prevent unauthorized calls.
 *
 * Creates a lightweight Queue client (no worker) just to enqueue jobs.
 * The actual processing is handled by apps/worker running separately.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret") ?? new URL(req.url).searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return NextResponse.json({ error: "REDIS_URL non configuré" }, { status: 503 });
  }

  const connection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  });

  try {
    await connection.connect();

    const notificationsQueue = new Queue<{ notificationId: string }>("notifications", {
      connection,
    });

    const result = await scheduleSessionNotifications(notificationsQueue);

    await notificationsQueue.close();
    await connection.quit();

    console.log(`[cron/notifications] created=${result.created} enqueued=${result.enqueued}`);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    await connection.quit().catch(() => null);
    console.error("[cron/notifications] erreur :", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
