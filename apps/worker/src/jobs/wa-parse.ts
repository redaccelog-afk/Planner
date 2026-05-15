import type { Job } from "bullmq";
import { db } from "@ccelog/db";
import Anthropic from "@anthropic-ai/sdk";
import { WHATSAPP_INTENT_PROMPT } from "@ccelog/shared";
import type { WaIntent } from "@ccelog/shared";

interface WaParseJobData {
  messageId: string;
}

export async function waParseProcessor(job: Job<WaParseJobData>): Promise<void> {
  const { messageId } = job.data;

  const message = await db.whatsAppMessage.findUnique({
    where: { id: messageId },
    include: { thread: { include: { session: true } } },
  });

  if (!message || message.direction !== "ENTRANT") {
    return;
  }

  console.log(`[wa-parse] Analyse message ${messageId}`);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `${WHATSAPP_INTENT_PROMPT}\n\nMessage :\n"${message.body}"`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  try {
    const parsed = JSON.parse(text) as WaIntent;

    await db.whatsAppMessage.update({
      where: { id: messageId },
      data: {
        intent: parsed.intent,
        parsedDate: parsed.proposedDates?.[0] ? new Date(parsed.proposedDates[0]) : null,
        parsedDates: parsed.proposedDates ? JSON.stringify(parsed.proposedDates) : undefined,
      },
    });

    console.log(`[wa-parse] Intent détecté: ${parsed.intent} (confiance: ${parsed.confidence})`);
  } catch {
    console.warn(`[wa-parse] Impossible de parser la réponse IA: ${text}`);
  }
}
