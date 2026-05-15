import { db } from "@ccelog/db";
import { NOTIFICATION_OFFSETS } from "@ccelog/shared";
import { addDays, startOfDay, endOfDay, differenceInDays } from "date-fns";
import type { Queue } from "bullmq";

interface NotificationQueueItem {
  notificationId: string;
}

/**
 * Scans upcoming sessions and creates/enqueues Notification records
 * for each offset defined in NOTIFICATION_OFFSETS.
 * Idempotent: skips notifications already created for a session+type.
 * Called daily by /api/cron/notifications.
 */
export async function scheduleSessionNotifications(
  notificationsQueue: Queue<NotificationQueueItem>
): Promise<{ created: number; enqueued: number }> {
  const now = new Date();
  let created = 0;
  let enqueued = 0;

  // Look at sessions within the relevant window (farthest offset is -7 days)
  const lookAheadDays = Math.abs(Math.min(...Object.values(NOTIFICATION_OFFSETS))) + 1;
  const lookBehindDays = Math.abs(Math.max(...Object.values(NOTIFICATION_OFFSETS))) + 1;

  const sessions = await db.trainingSession.findMany({
    where: {
      status: { in: ["CONFIRMEE", "PROVISOIRE"] },
      startDate: {
        gte: addDays(now, -lookBehindDays),
        lte: addDays(now, lookAheadDays),
      },
    },
    include: {
      trainer: true,
      theme: true,
      request: { include: { client: { include: { contacts: true } }, site: true } },
    },
  });

  for (const session of sessions) {
    const primaryContact = session.request.client.contacts.find((c) => c.primary);
    const trainerPhone = session.trainer.phone;
    const clientEmail = primaryContact?.email;

    for (const [notifType, offsetDays] of Object.entries(NOTIFICATION_OFFSETS)) {
      const targetDate = addDays(session.startDate, offsetDays);
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);

      // Only schedule notifications whose trigger date is today
      if (targetDate < todayStart || targetDate > todayEnd) continue;

      // Determine channel and recipient
      const { channel, recipient } = resolveChannelAndRecipient(
        notifType,
        trainerPhone,
        clientEmail
      );
      if (!recipient) continue;

      // Idempotency: skip if already exists
      const existing = await db.notification.findFirst({
        where: { sessionId: session.id, type: notifType },
      });
      if (existing) {
        // Re-enqueue if it's still PLANIFIEE (e.g., worker was down)
        if (existing.status === "PLANIFIEE") {
          await notificationsQueue.add("send-notification", { notificationId: existing.id });
          enqueued++;
        }
        continue;
      }

      // Create and enqueue
      const notification = await db.notification.create({
        data: {
          sessionId: session.id,
          type: notifType,
          channel,
          recipient,
          status: "PLANIFIEE",
          scheduledFor: targetDate,
          payload: JSON.stringify(buildPayload(notifType, session)),
        },
      });

      await notificationsQueue.add(
        "send-notification",
        { notificationId: notification.id },
        { attempts: 3, backoff: { type: "exponential", delay: 60_000 } }
      );

      created++;
      enqueued++;
    }
  }

  return { created, enqueued };
}

function resolveChannelAndRecipient(
  notifType: string,
  trainerPhone: string | null,
  clientEmail: string | null | undefined
): { channel: "whatsapp" | "email"; recipient: string | null } {
  // Trainer-facing notifications → WhatsApp
  if (
    notifType === "RAPPEL_FORMATEUR" ||
    notifType === "DOCUMENTS_PRETS" ||
    notifType === "RAPPEL_HOTEL_ITINERAIRE" ||
    notifType === "DEMANDE_RAPPORT" ||
    notifType === "RELANCE_RAPPORT"
  ) {
    return { channel: "whatsapp", recipient: trainerPhone };
  }
  // Client-facing notifications → email
  return { channel: "email", recipient: clientEmail ?? null };
}

function buildPayload(
  notifType: string,
  session: {
    id: string;
    startDate: Date;
    theme: { label: string };
    trainer: { fullName: string; phone: string | null };
    request: { client: { name: string }; site: { city: string } };
  }
): Record<string, unknown> {
  return {
    sessionId: session.id,
    themeName: session.theme.label,
    trainerName: session.trainer.fullName,
    clientName: session.request.client.name,
    city: session.request.site.city,
    startDate: session.startDate.toISOString(),
    notifType,
  };
}
