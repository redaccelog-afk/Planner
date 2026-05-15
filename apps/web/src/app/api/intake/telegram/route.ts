/**
 * Webhook Telegram Bot
 * URL à configurer : POST https://api.telegram.org/bot{TOKEN}/setWebhook?url=https://app.ccelog.ma/api/intake/telegram
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@ccelog/db";
import { enqueueIntake } from "@/lib/pipeline-enqueue";

// Types Telegram Update
interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: { id: number; first_name?: string; last_name?: string; username?: string };
    chat: { id: number };
    text?: string;
    date: number;
  };
}

function verifyTelegram(req: NextRequest): boolean {
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected) return true; // dev mode
  return secret === expected;
}

export async function POST(req: NextRequest) {
  if (!verifyTelegram(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const msg = update.message;
  if (!msg?.text) return NextResponse.json({ ok: true });

  const chatId = String(msg.chat.id);
  const fromName = [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(" ");
  const text = msg.text;
  const telegramMsgId = String(msg.message_id);

  // Commande /start
  if (text.startsWith("/start")) {
    await sendTelegramReply(chatId, `Bonjour ${fromName} 👋\n\nBienvenue chez *CCE LOG* !\nEnvoyez-nous votre demande de formation directement par message.`);
    return NextResponse.json({ ok: true });
  }

  // Vérifier si réponse client à un pipeline en attente
  const activePipeline = await db.demandePipeline.findFirst({
    where: { fromAddress: chatId, status: "WAITING_CLIENT", channel: "TELEGRAM" },
  });

  if (activePipeline) {
    const confirmed = isConfirmation(text);
    await enqueueIntake({
      action: "handle_client_reply",
      pipelineId: activePipeline.id,
      messageBody: text,
      confirmed,
    });
    await sendTelegramReply(
      chatId,
      confirmed
        ? "✅ Parfait ! Votre session est en cours de confirmation. Vous recevrez les détails sous peu."
        : "📅 D'accord. Nous cherchons d'autres disponibilités et vous recontactons rapidement."
    );
    return NextResponse.json({ ok: true });
  }

  // Nouvelle demande
  const pipeline = await db.demandePipeline.create({
    data: {
      channel: "TELEGRAM",
      rawMessage: text,
      fromAddress: chatId,
      fromName: fromName || undefined,
      externalMsgId: telegramMsgId,
      status: "RECEIVED",
    },
  });

  await db.pipelineMessage.create({
    data: {
      pipelineId: pipeline.id,
      direction: "ENTRANT",
      channel: "TELEGRAM",
      fromAddr: chatId,
      toAddr: "ccelog_bot",
      body: text,
    },
  });

  await enqueueIntake({ action: "parse", pipelineId: pipeline.id });

  await sendTelegramReply(
    chatId,
    `✅ Demande reçue !\n\nNous analysons votre besoin et revenons vers vous très rapidement avec des propositions de formateur et de dates.\n\n_CCE LOG — Formation professionnelle_`
  );

  return NextResponse.json({ ok: true });
}

async function sendTelegramReply(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  });
}

function isConfirmation(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return lower === "oui" || lower === "ok" || lower === "yes" || lower.startsWith("je confirme") || lower === "1";
}
