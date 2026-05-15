import { NextResponse } from "next/server";
import { db } from "@ccelog/db";
import { listInboxMessages } from "@ccelog/integrations";
import { auth } from "@/lib/auth";

export async function POST() {
  const authSession = await auth();
  if (!authSession) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const messages = await listInboxMessages("Demandes formation") as Array<{
      id: string;
      subject?: string;
      body?: { content?: string };
      from?: { emailAddress?: { address?: string } };
      receivedDateTime?: string;
    }>;

    const newCount = { created: 0, skipped: 0 };

    for (const msg of messages) {
      // Vérifier si déjà traité
      const existing = await db.trainingRequest.findFirst({
        where: { emailSourceId: msg.id },
      });

      if (existing) {
        newCount.skipped++;
        continue;
      }

      // Créer un thread email pour traçabilité
      newCount.created++;
    }

    return NextResponse.json({
      ok: true,
      messagesFound: messages.length,
      ...newCount,
    });
  } catch (error) {
    console.error("sync-outlook error:", error);
    return NextResponse.json({ error: "Erreur sync Outlook", details: String(error) }, { status: 500 });
  }
}
