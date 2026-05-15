import "dotenv/config";
import { Worker, Queue } from "bullmq";
import IORedis from "ioredis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

connection.on("connect", () => console.log("✅ Redis connecté"));
connection.on("error", (err) => console.error("❌ Redis erreur :", err));

// ── Import des processors ────────────────────────────────────────
import { pingProcessor } from "./jobs/ping";
import { notificationProcessor } from "./jobs/notifications";
import { outlookSyncProcessor } from "./jobs/outlook-sync";
import { waParseProcessor } from "./jobs/wa-parse";
import { costRecalcProcessor } from "./jobs/cost-recalc";
import { pipelineProcessor } from "./jobs/pipeline-orchestrator";

// ── Définition des queues ────────────────────────────────────────
export const queues = {
  ping: new Queue("ping", { connection }),
  notifications: new Queue("notifications", { connection }),
  outlookSync: new Queue("outlook-sync", { connection }),
  waParse: new Queue("wa-parse", { connection }),
  costRecalc: new Queue("cost-recalc", { connection }),
  pipeline: new Queue("pipeline", { connection }),
};

// ── Workers ──────────────────────────────────────────────────────
const workers: Worker[] = [
  new Worker("ping", pingProcessor, { connection }),
  new Worker("notifications", notificationProcessor, { connection, concurrency: 5 }),
  new Worker("outlook-sync", outlookSyncProcessor, { connection, concurrency: 2 }),
  new Worker("wa-parse", waParseProcessor, { connection, concurrency: 3 }),
  new Worker("cost-recalc", costRecalcProcessor, { connection, concurrency: 3 }),
  new Worker("pipeline", pipelineProcessor, { connection, concurrency: 10 }),
];

workers.forEach((worker) => {
  worker.on("completed", (job) => {
    console.log(`✓ [${worker.name}] Job ${job.id} terminé`);
  });
  worker.on("failed", (job, err) => {
    console.error(`✗ [${worker.name}] Job ${job?.id} échoué :`, err.message);
  });
  worker.on("error", (err) => {
    console.error(`[${worker.name}] Erreur worker :`, err);
  });
});

console.log("🚀 CCE LOG Worker démarré — queues:", Object.keys(queues).join(", "));

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("👋 Arrêt gracieux en cours...");
  await Promise.all(workers.map((w) => w.close()));
  await connection.quit();
  process.exit(0);
});
