import { NextResponse } from "next/server";
import { db } from "@ccelog/db";
import { WaWebhookPayloadSchema, verifyWebhookSignature } from "@ccelog/integrations";

// Vérification du webhook Meta (GET)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WA_VERIFY_TOKEN) {
    return new Response(challenge ?? "", { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

// Réception des messages entrants (POST)
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256") ?? "";

  // Vérifier la signature (R8 — sécurité)
  if (process.env.WA_APP_SECRET && !verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = WaWebhookPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    // Ignorer les statuts de livraison (non-messages)
    return NextResponse.json({ ok: true });
  }

  for (const entry of parsed.data.entry) {
    for (const change of entry.changes) {
      const messages = change.value.messages ?? [];

      for (const msg of messages) {
        if (msg.type !== "text" || !msg.text?.body) continue;

        const phone = msg.from.startsWith("+") ? msg.from : `+${msg.from}`;

        // Trouver le formateur par numéro
        const trainer = await db.trainer.findFirst({ where: { phone } });
        if (!trainer) continue;

        // Trouver ou créer le thread actif
        let thread = await db.whatsAppThread.findFirst({
          where: { trainerId: trainer.id },
          orderBy: { updatedAt: "desc" },
        });

        if (!thread) {
          thread = await db.whatsAppThread.create({
            data: { trainerId: trainer.id, waThreadId: msg.from },
          });
        }

        // Enregistrer le message
        const waMessage = await db.whatsAppMessage.create({
          data: {
            threadId: thread.id,
            direction: "ENTRANT",
            body: msg.text.body,
            waMessageId: msg.id,
          },
        });

        // Mettre à jour le thread
        await db.whatsAppThread.update({
          where: { id: thread.id },
          data: { updatedAt: new Date() },
        });

        // Déclencher le parsing IA en async
        try {
          const { queues } = await import("@ccelog/worker");
          await queues.waParse.add("parse", { messageId: waMessage.id });
        } catch {
          // Worker non disponible — parsing différé
        }
      }
    }
  }

  // Meta exige une réponse 200 immédiate
  return NextResponse.json({ ok: true });
}
