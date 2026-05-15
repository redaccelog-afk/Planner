import type { Job } from "bullmq";

export async function pingProcessor(job: Job): Promise<{ pong: boolean; ts: string }> {
  console.log(`[ping] Job ${job.id} — données:`, job.data);
  return { pong: true, ts: new Date().toISOString() };
}
