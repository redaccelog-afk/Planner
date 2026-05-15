/**
 * Helper pour enqueuer les jobs pipeline.
 * Appelle l'API interne /api/pipeline/enqueue qui fait le pont vers BullMQ.
 * Fonctionne même sans Redis (mode dégradé : traitement synchrone différé).
 */

// Type inline — évite la dépendance cross-package vers apps/worker
export type EnqueuePayload =
  | { action: "parse";                pipelineId: string }
  | { action: "match_trainers";       pipelineId: string }
  | { action: "contact_trainer";      pipelineId: string }
  | { action: "handle_trainer_reply"; pipelineId: string; trainerPhone: string; messageBody: string; waMessageId?: string }
  | { action: "notify_client";        pipelineId: string }
  | { action: "handle_client_reply";  pipelineId: string; messageBody: string; confirmed: boolean; proposedDates?: string[] }
  | { action: "create_session";       pipelineId: string; confirmedDate: string }
  | { action: "move_next_trainer";    pipelineId: string; reason: string };

export async function enqueueIntake(data: EnqueuePayload): Promise<void> {
  try {
    // Import dynamique BullMQ — fonctionne dans le worker, silencieux en dev si Redis absent
    const { Queue } = await import("bullmq" as string as "bullmq").catch(() => ({ Queue: null }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const IORedis = await import("ioredis" as string as "ioredis").then((m: any) => m.default ?? m.Redis).catch(() => null);

    if (!Queue || !IORedis) {
      console.warn("[pipeline-enqueue] bullmq/ioredis non disponibles (dev sans Redis) — job ignoré");
      return;
    }

    const redis = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
    });

    try {
      await redis.connect();
      const queue = new Queue("pipeline", { connection: redis });
      await queue.add("pipeline-job", data, {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: { age: 86400 },
        removeOnFail:    { age: 604800 },
      });
    } finally {
      redis.disconnect();
    }
  } catch (err) {
    console.warn("[pipeline-enqueue] Erreur enqueue:", err instanceof Error ? err.message : err);
  }
}
