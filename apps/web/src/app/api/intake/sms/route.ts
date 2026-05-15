/**
 * Webhook SMS (Twilio)
 * URL à configurer dans Twilio Console : POST https://app.ccelog.ma/api/intake/sms
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@ccelog/db";
import { enqueueIntake } from "@/lib/pipeline-enqueue";

// Vérification signature Twilio
function verifyTwilio(req: NextRequest, _body: string): boolean {
  const twilioSig = req.headers.get("x-twilio-signature");
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return false;
  if (!twilioSig) return false;

  // En production, valider avec twilio SDK
  // Pour l'instant on vérifie juste la présence du token
  return true; // TODO: signature HMAC-SHA1
}

export async function POST(req: NextRequest) {
  let body: string;
  let params: URLSearchParams;

  try {
    body = await req.text();
    params = new URLSearchParams(body);
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  if (!verifyTwilio(req, body)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const from = params.get("From") ?? "";
  const messageBody = params.get("Body") ?? "";
  const twilioMsgId = params.get("MessageSid") ?? undefined;

  if (!from || !messageBody) {
    return NextResponse.json({ ok: true }); // Twilio attend un 200 même si vide
  }

  // Vérifier si c'est une réponse client à un pipeline en attente
  const activePipeline = await db.demandePipeline.findFirst({
    where: {
      fromAddress: from,
      status: "WAITING_CLIENT",
      channel: "SMS",
    },
  });

  if (activePipeline) {
    // Traiter comme réponse client
    await enqueueIntake({
      action: "handle_client_reply",
      pipelineId: activePipeline.id,
      messageBody,
      confirmed: isConfirmation(messageBody),
    });
    return new NextResponse("<?xml version='1.0'?><Response></Response>", {
      headers: { "Content-Type": "application/xml" },
    });
  }

  // Nouvelle demande
  const pipeline = await db.demandePipeline.create({
    data: {
      channel: "SMS",
      rawMessage: messageBody,
      fromAddress: from,
      externalMsgId: twilioMsgId,
      status: "RECEIVED",
    },
  });

  await db.pipelineMessage.create({
    data: {
      pipelineId: pipeline.id,
      direction: "ENTRANT",
      channel: "SMS",
      fromAddr: from,
      toAddr: process.env.TWILIO_PHONE_NUMBER ?? "ccelog",
      body: messageBody,
    },
  });

  await enqueueIntake({ action: "parse", pipelineId: pipeline.id });

  // Réponse TwiML
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Bonjour ! Votre demande de formation a bien été reçue. Notre équipe vous contacte rapidement. — CCE LOG</Message></Response>`,
    { headers: { "Content-Type": "application/xml" } }
  );
}

function isConfirmation(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return lower === "oui" || lower === "ok" || lower === "yes" || lower.startsWith("je confirme") || lower === "1";
}
