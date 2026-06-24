import { NextResponse } from "next/server";
import { Queue } from "bullmq";
import IORedis from "ioredis";

/**
 * Daily cron triggered by Vercel Cron (see vercel.json) or an external scheduler.
 * Secured by CRON_SECRET to prevent unauthorized calls.
 *
 * bullmq/ioredis/worker sont dans serverExternalPackages — exclus du bundle webpack,
 * résolus à runtime par Node.js depuis apps/worker.
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

    // Import du scheduler via Function() pour éviter que webpack résolve statiquement
    // le chemin interne du workspace @ccelog/worker (non bundlé — serverExternalPackages)
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const workerImport = new Function("m", "return import(m)");
    const { scheduleSessionNotifications } = await workerImport(
      "@ccelog/worker/src/jobs/notification-scheduler"
    );

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
