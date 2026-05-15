import type { Job } from "bullmq";
import { db } from "@ccelog/db";

interface OutlookSyncJobData {
  sessionId: string;
  action: "create" | "update" | "delete";
}

export async function outlookSyncProcessor(job: Job<OutlookSyncJobData>): Promise<void> {
  const { sessionId, action } = job.data;

  const session = await db.trainingSession.findUnique({
    where: { id: sessionId },
    include: { trainer: true, theme: true, request: { include: { client: true, site: true } } },
  });

  if (!session) {
    throw new Error(`Session ${sessionId} introuvable`);
  }

  console.log(`[outlook-sync] ${action.toUpperCase()} session ${sessionId} — statut: ${session.status}`);

  // Mapping statut → showAs Outlook
  const showAs = session.status === "CONFIRMEE" ? "busy" : "tentative";

  if (action === "delete" || session.status === "ANNULEE") {
    if (session.outlookEventId) {
      console.log(`[outlook-sync] Suppression événement Outlook ${session.outlookEventId}`);
      // TODO: await m365Client.deleteCalendarEvent(session.outlookEventId);
      await db.trainingSession.update({
        where: { id: sessionId },
        data: { outlookEventId: null },
      });
    }
    return;
  }

  const eventData = {
    subject: `[CCE LOG] ${session.theme.label} — ${session.request.client.name}`,
    start: { dateTime: session.startDate.toISOString(), timeZone: "Africa/Casablanca" },
    end: { dateTime: session.endDate.toISOString(), timeZone: "Africa/Casablanca" },
    location: { displayName: session.request.site.city },
    showAs,
    body: {
      contentType: "text",
      content: `Formation : ${session.theme.label}\nClient : ${session.request.client.name}\nLieu : ${session.request.site.label}`,
    },
  };

  if (session.outlookEventId) {
    console.log(`[outlook-sync] Mise à jour événement ${session.outlookEventId}`);
    // TODO: await m365Client.updateCalendarEvent(session.outlookEventId, eventData);
  } else {
    console.log(`[outlook-sync] Création événement — formateur: ${session.trainer.fullName}`);
    // TODO: const event = await m365Client.createCalendarEvent(eventData);
    // await db.trainingSession.update({ where: { id: sessionId }, data: { outlookEventId: event.id } });
  }

  console.log(`[outlook-sync] ✓ Sync Outlook terminé — showAs: ${showAs}`);
}
