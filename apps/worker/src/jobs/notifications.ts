import type { Job } from "bullmq";
import { db } from "@ccelog/db";
import { WA_TEMPLATES } from "@ccelog/shared";

interface NotificationJobData {
  notificationId: string;
}

export async function notificationProcessor(job: Job<NotificationJobData>): Promise<void> {
  const { notificationId } = job.data;

  const notification = await db.notification.findUnique({
    where: { id: notificationId },
    include: {
      session: {
        include: {
          trainer: true,
          theme: true,
          request: { include: { client: { include: { contacts: true } }, site: true } },
          report: true,
        },
      },
    },
  });

  if (!notification) throw new Error(`Notification ${notificationId} introuvable`);
  if (notification.status === "ENVOYEE") return; // already sent

  const { session } = notification;
  const payload = notification.payload
    ? (JSON.parse(notification.payload as string) as Record<string, unknown>)
    : {};

  try {
    if (notification.channel === "whatsapp") {
      await dispatchWhatsApp(notification.type, notification.recipient, session, payload);
    } else if (notification.channel === "email") {
      await dispatchEmail(notification.type, notification.recipient, session, payload);
    }

    await db.notification.update({
      where: { id: notificationId },
      data: { status: "ENVOYEE", sentAt: new Date() },
    });

    console.log(`[notifications] ✓ ${notification.type} → ${notification.recipient}`);
  } catch (error) {
    await db.notification.update({
      where: { id: notificationId },
      data: { status: "ECHOUEE", error: String(error) },
    });
    throw error;
  }
}

async function dispatchWhatsApp(
  notifType: string,
  recipient: string,
  session: NonNullable<Awaited<ReturnType<typeof db.notification.findUnique>>>["session"],
  _payload: Record<string, unknown>
): Promise<void> {
  const { sendWhatsAppTemplate } = await import("@ccelog/integrations");

  let templateName: string;
  let variables: string[];

  switch (notifType) {
    case "RAPPEL_FORMATEUR":
    case "DOCUMENTS_PRETS":
      templateName = WA_TEMPLATES.RAPPEL_DOCUMENTS;
      variables = [session.trainer.fullName, session.theme.label, session.request.site.city];
      break;
    case "RAPPEL_HOTEL_ITINERAIRE":
      templateName = WA_TEMPLATES.RAPPEL_MATERIEL;
      variables = [session.trainer.fullName, session.request.site.city];
      break;
    case "DEMANDE_RAPPORT":
      templateName = WA_TEMPLATES.DEMANDE_RAPPORT;
      variables = [session.trainer.fullName, session.theme.label];
      break;
    case "RELANCE_RAPPORT":
      templateName = WA_TEMPLATES.DEMANDE_RAPPORT;
      variables = [session.trainer.fullName, session.theme.label];
      break;
    default:
      console.warn(`[notifications] Type WhatsApp inconnu : ${notifType}`);
      return;
  }

  await sendWhatsAppTemplate(recipient, templateName, variables);
}

async function dispatchEmail(
  notifType: string,
  recipient: string,
  session: NonNullable<Awaited<ReturnType<typeof db.notification.findUnique>>>["session"],
  _payload: Record<string, unknown>
): Promise<void> {
  const { sendMail } = await import("@ccelog/integrations");

  const primaryContact = session.request.client.contacts.find((c) => c.primary);
  const clientName = session.request.client.name;
  const contactName = primaryContact?.name;

  let subject: string;
  let bodyHtml: string;

  const startDateFr = session.startDate.toLocaleDateString("fr-MA", {
    timeZone: "Africa/Casablanca",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  switch (notifType) {
    case "CONFIRMATION_CLIENT":
      subject = `CCE LOG — Confirmation de votre formation ${session.theme.label}`;
      bodyHtml = buildReminderHtml(clientName, contactName, session.theme.label, startDateFr, session.request.site.city);
      break;
    case "ENVOI_RAPPORT_CLIENT":
      subject = `CCE LOG — Rapport de formation ${session.theme.label} du ${startDateFr}`;
      bodyHtml = buildReportReminderHtml(clientName, contactName, session.theme.label, startDateFr);
      break;
    default:
      console.warn(`[notifications] Type email inconnu : ${notifType}`);
      return;
  }

  await sendMail({ to: [recipient], subject, bodyHtml });
}

function buildReminderHtml(
  clientName: string,
  contactName: string | undefined,
  themeName: string,
  dateStr: string,
  city: string
): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/></head>
<body style="font-family:Arial,sans-serif;color:#222;max-width:600px;margin:0 auto;padding:24px;">
  <div style="background:#1B4F8A;padding:16px 24px;border-radius:8px 8px 0 0;">
    <p style="color:#fff;font-size:18px;font-weight:bold;margin:0;">CCE LOG</p>
  </div>
  <div style="border:1px solid #ddd;border-top:none;border-radius:0 0 8px 8px;padding:24px;">
    <p>Bonjour${contactName ? ` ${contactName}` : ""},</p>
    <p>Nous vous rappelons votre formation <strong>${themeName}</strong> prévue le <strong>${dateStr}</strong> à <strong>${city}</strong>.</p>
    <p>Pour toute question, n'hésitez pas à nous contacter.</p>
    <p style="margin-top:24px;">Cordialement,</p>
    <p style="font-weight:bold;color:#1B4F8A;">L'équipe CCE LOG</p>
  </div>
</body></html>`;
}

function buildReportReminderHtml(
  clientName: string,
  contactName: string | undefined,
  themeName: string,
  dateStr: string
): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/></head>
<body style="font-family:Arial,sans-serif;color:#222;max-width:600px;margin:0 auto;padding:24px;">
  <div style="background:#1B4F8A;padding:16px 24px;border-radius:8px 8px 0 0;">
    <p style="color:#fff;font-size:18px;font-weight:bold;margin:0;">CCE LOG</p>
  </div>
  <div style="border:1px solid #ddd;border-top:none;border-radius:0 0 8px 8px;padding:24px;">
    <p>Bonjour${contactName ? ` ${contactName}` : ""},</p>
    <p>Le rapport de votre formation <strong>${themeName}</strong> du ${dateStr} est en cours de finalisation. Vous le recevrez prochainement.</p>
    <p style="margin-top:24px;">Cordialement,</p>
    <p style="font-weight:bold;color:#1B4F8A;">L'équipe CCE LOG</p>
  </div>
</body></html>`;
}
