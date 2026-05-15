/**
 * Pipeline Orchestrator — Machine d'état BullMQ
 *
 * Gère le cycle de vie complet d'une demande :
 *   RECEIVED → PARSING → PARSED → TRAINER_SELECTION →
 *   CONTACTING_TRAINER → WAITING_PLANNER → WAITING_CLIENT →
 *   CLIENT_CONFIRMED → COMPLETED
 */

import { Job } from "bullmq";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@ccelog/db";
import { sendMail } from "@ccelog/integrations";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Types ──────────────────────────────────────────────────────────

export type PipelineJobData =
  | { action: "parse";               pipelineId: string }
  | { action: "match_trainers";      pipelineId: string }
  | { action: "contact_trainer";     pipelineId: string }
  | { action: "handle_trainer_reply"; pipelineId: string; trainerPhone: string; messageBody: string; waMessageId?: string }
  | { action: "notify_client";       pipelineId: string }
  | { action: "handle_client_reply"; pipelineId: string; messageBody: string; confirmed: boolean; proposedDates?: string[] }
  | { action: "create_session";      pipelineId: string; confirmedDate: string }
  | { action: "move_next_trainer";   pipelineId: string; reason: string };

// ── Prompt extraction IA ───────────────────────────────────────────

const PARSE_PROMPT = `Tu es l'assistant IA de CCE LOG, organisme de formation marocain.
Analyse le message suivant et extrais les informations structurées.

MESSAGE :
{MESSAGE}

Réponds UNIQUEMENT en JSON valide avec cette structure exacte :
{
  "themeCode": "CACES_R489" | "CACES_R482" | "CACES_R484" | "CACES_R485" | "CACES_R486" |
               "VR_SECURITE" | "VR_RISQUES" | "SST" | "SECURITE_INCENDIE" |
               "TRAVAIL_HAUTEUR" | "HABILITATION_ELEC" | null,
  "themeLabel": "libellé brut extrait ou null",
  "dateFrom": "ISO 8601 ou null",
  "dateTo": "ISO 8601 ou null",
  "participants": number | null,
  "clientName": "nom client/entreprise ou null",
  "siteCity": "ville du site de formation ou null",
  "urgency": 0 | 1 | 2 | 3,
  "confidence": 0.0-1.0,
  "summary": "résumé en 1 phrase"
}
urgency : 0=normal, 1=bientôt, 2=urgent, 3=très urgent (< 1 semaine)
confidence : ta certitude sur l'extraction (0=très incertain, 1=certain)`;

// ── Processor principal ────────────────────────────────────────────

export async function pipelineProcessor(job: Job<PipelineJobData>) {
  const { action } = job.data;
  console.log(`[pipeline] action=${action} pipeline=${(job.data as { pipelineId?: string }).pipelineId}`);

  switch (action) {
    case "parse":
      return handleParse(job.data.pipelineId);
    case "match_trainers":
      return handleMatchTrainers(job.data.pipelineId);
    case "contact_trainer":
      return handleContactTrainer(job.data.pipelineId);
    case "handle_trainer_reply":
      return handleTrainerReply(job.data.pipelineId, job.data.trainerPhone, job.data.messageBody, job.data.waMessageId);
    case "notify_client":
      return handleNotifyClient(job.data.pipelineId);
    case "handle_client_reply":
      return handleClientReply(job.data.pipelineId, job.data.confirmed, job.data.proposedDates);
    case "create_session":
      return handleCreateSession(job.data.pipelineId, job.data.confirmedDate);
    case "move_next_trainer":
      return handleMoveNextTrainer(job.data.pipelineId, job.data.reason);
    default:
      throw new Error(`Action inconnue: ${(job.data as { action: string }).action}`);
  }
}

// ── 1. PARSING IA ──────────────────────────────────────────────────

async function handleParse(pipelineId: string) {
  const pipeline = await db.demandePipeline.findUniqueOrThrow({ where: { id: pipelineId } });

  await db.demandePipeline.update({ where: { id: pipelineId }, data: { status: "PARSING" } });

  let parsed: {
    themeCode: string | null;
    themeLabel: string | null;
    dateFrom: string | null;
    dateTo: string | null;
    participants: number | null;
    clientName: string | null;
    siteCity: string | null;
    urgency: number;
    confidence: number;
    summary: string;
  };

  try {
    const prompt = PARSE_PROMPT.replace("{MESSAGE}", pipeline.rawMessage);
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  } catch (err) {
    console.error("[pipeline] Erreur parsing IA:", err);
    // Parsing dégradé — on continue sans thème détecté
    parsed = {
      themeCode: null, themeLabel: null, dateFrom: null, dateTo: null,
      participants: null, clientName: null, siteCity: null,
      urgency: 0, confidence: 0, summary: pipeline.rawMessage.slice(0, 100),
    };
  }

  await db.demandePipeline.update({
    where: { id: pipelineId },
    data: {
      status: "PARSED",
      parsedThemeCode: parsed.themeCode,
      parsedThemeLabel: parsed.themeLabel,
      parsedDateFrom: parsed.dateFrom ? new Date(parsed.dateFrom) : null,
      parsedDateTo: parsed.dateTo ? new Date(parsed.dateTo) : null,
      parsedParticipants: parsed.participants,
      parsedClientName: parsed.clientName,
      parsedSiteCity: parsed.siteCity,
      parsedUrgency: parsed.urgency ?? 0,
      aiConfidence: parsed.confidence,
      aiRawOutput: parsed as never,
      parsedAt: new Date(),
    },
  });

  // Créer une notification inapp pour le planner
  await db.notification.create({
    data: {
      type: "AUTRE",
      status: "EN_ATTENTE",
      scheduledAt: new Date(),
      channel: "inapp",
      recipient: "planner",
      payload: {
        pipelineId,
        action: "validate_trainers",
        summary: parsed.summary,
        theme: parsed.themeCode ?? parsed.themeLabel ?? "Thème non détecté",
        confidence: parsed.confidence,
      },
    },
  });

  return { parsed };
}

// ── 2. MATCHING FORMATEURS ─────────────────────────────────────────

async function handleMatchTrainers(pipelineId: string) {
  const pipeline = await db.demandePipeline.findUniqueOrThrow({ where: { id: pipelineId } });

  // Trouver le thème
  let themeId: string | null = null;
  if (pipeline.parsedThemeCode) {
    const theme = await db.theme.findUnique({ where: { code: pipeline.parsedThemeCode } });
    themeId = theme?.id ?? null;
  }

  // Chercher les formateurs qualifiés et disponibles
  const themeFilter = themeId
    ? { themes: { some: { themeId } } }
    : {};

  const trainers = await db.trainer.findMany({
    where: { active: true, ...themeFilter },
    include: {
      themes: { include: { theme: true } },
      rates: { orderBy: { validFrom: "desc" }, take: 1 },
      sessions: {
        where: {
          status: { in: ["PROVISOIRE", "CONFIRMEE"] },
          startDate: {
            gte: pipeline.parsedDateFrom ?? new Date(),
            lte: pipeline.parsedDateTo ?? new Date(Date.now() + 30 * 24 * 3600 * 1000),
          },
        },
      },
      distanceCache: pipeline.parsedSiteCity
        ? { where: { site: { city: pipeline.parsedSiteCity } } }
        : undefined,
    },
  });

  // Scorer chaque formateur
  const scored = trainers
    .map((t) => {
      let score = 50;
      // Bonus INTERNE
      if (t.type === "INTERNE") score += 20;
      // Pas de sessions qui chevauchent
      if (t.sessions.length === 0) score += 20;
      else score -= t.sessions.length * 10;
      // Distance (si connue)
      const dc = t.distanceCache[0];
      if (dc) {
        if (dc.distanceKm < 50) score += 10;
        else if (dc.distanceKm > 150) score -= 10;
      }
      return { trainer: t, score };
    })
    .sort((a, b) => b.score - a.score);

  // Créer les candidats ordonnés
  await db.trainerCandidate.deleteMany({ where: { pipelineId } });
  await db.trainerCandidate.createMany({
    data: scored.map((s, i) => ({
      pipelineId,
      trainerId: s.trainer.id,
      rank: i + 1,
      score: s.score,
      status: "pending",
    })),
  });

  await db.demandePipeline.update({
    where: { id: pipelineId },
    data: { status: "TRAINER_SELECTION" },
  });

  return { candidatesCount: scored.length };
}

// ── 3. CONTACTER LE FORMATEUR (WA) ────────────────────────────────

async function handleContactTrainer(pipelineId: string) {
  const pipeline = await db.demandePipeline.findUniqueOrThrow({
    where: { id: pipelineId },
    include: { candidates: { include: { trainer: true }, orderBy: { rank: "asc" } } },
  });

  const candidate = pipeline.candidates.find(
    (c, i) => i === pipeline.currentTrainerIndex && c.status === "pending"
  );

  if (!candidate) {
    // Plus de formateurs disponibles
    await db.demandePipeline.update({
      where: { id: pipelineId },
      data: { status: "FAILED", errorReason: "Aucun formateur disponible" },
    });
    return { error: "no_more_trainers" };
  }

  const trainer = candidate.trainer;
  const theme = pipeline.parsedThemeLabel ?? pipeline.parsedThemeCode ?? "la formation demandée";
  const dateHint = pipeline.parsedDateFrom
    ? `autour du ${new Date(pipeline.parsedDateFrom).toLocaleDateString("fr-FR")}`
    : "à une date à convenir";

  const waMessage = buildTrainerWAMessage(trainer.fullName, theme, dateHint);

  // Envoyer via WhatsApp Cloud API
  let waMessageId: string | undefined;
  try {
    waMessageId = await sendWhatsAppMessage(trainer.phone, waMessage);
  } catch (err) {
    console.error("[pipeline] Erreur WA:", err);
  }

  // Enregistrer le message
  await db.pipelineMessage.create({
    data: {
      pipelineId,
      direction: "SORTANT",
      channel: "WHATSAPP",
      fromAddr: process.env.WA_PHONE_NUMBER_ID ?? "ccelog",
      toAddr: trainer.phone,
      body: waMessage,
    },
  });

  await db.trainerCandidate.update({
    where: { id: candidate.id },
    data: {
      status: "contacted",
      waMessageId,
      contactedAt: new Date(),
    },
  });

  await db.demandePipeline.update({
    where: { id: pipelineId },
    data: { status: "CONTACTING_TRAINER", trainerContactedAt: new Date() },
  });

  return { trainerName: trainer.fullName, phone: trainer.phone };
}

// ── 4. RÉPONSE DU FORMATEUR ────────────────────────────────────────

async function handleTrainerReply(
  pipelineId: string,
  trainerPhone: string,
  messageBody: string,
  waMessageId?: string
) {
  const pipeline = await db.demandePipeline.findUniqueOrThrow({
    where: { id: pipelineId },
    include: { candidates: { include: { trainer: true }, orderBy: { rank: "asc" } } },
  });

  const candidate = pipeline.candidates.find(
    (c) => c.trainer.phone === trainerPhone && c.status === "contacted"
  );
  if (!candidate) return { error: "candidate_not_found" };

  // Parser les dates proposées par le formateur
  const proposedDates = await extractDatesFromMessage(messageBody);
  const declined = isDeclineMessage(messageBody);

  // Enregistrer le message entrant
  await db.pipelineMessage.create({
    data: {
      pipelineId,
      direction: "ENTRANT",
      channel: "WHATSAPP",
      fromAddr: trainerPhone,
      toAddr: process.env.WA_PHONE_NUMBER_ID ?? "ccelog",
      body: messageBody,
      parsedData: { proposedDates, declined },
    },
  });

  if (declined || proposedDates.length === 0) {
    // Formateur non disponible
    await db.trainerCandidate.update({
      where: { id: candidate.id },
      data: { status: "declined", respondedAt: new Date() },
    });
    // Passer au suivant
    return handleMoveNextTrainer(pipelineId, "trainer_declined");
  }

  // Formateur disponible avec des dates
  await db.trainerCandidate.update({
    where: { id: candidate.id },
    data: {
      status: "proposed_dates",
      proposedDates,
      respondedAt: new Date(),
    },
  });

  await db.demandePipeline.update({
    where: { id: pipelineId },
    data: { status: "WAITING_PLANNER" },
  });

  // Notifier le planner
  await db.notification.create({
    data: {
      type: "AUTRE",
      status: "EN_ATTENTE",
      scheduledAt: new Date(),
      channel: "inapp",
      recipient: "planner",
      payload: {
        pipelineId,
        action: "confirm_dates",
        trainerName: candidate.trainer.fullName,
        proposedDates,
      },
    },
  });

  return { proposedDates };
}

// ── 5. NOTIFIER LE CLIENT ──────────────────────────────────────────

async function handleNotifyClient(pipelineId: string) {
  const pipeline = await db.demandePipeline.findUniqueOrThrow({
    where: { id: pipelineId },
    include: {
      candidates: {
        where: { status: "proposed_dates" },
        include: { trainer: true },
      },
    },
  });

  const candidate = pipeline.candidates[0];
  if (!candidate) return { error: "no_proposed_dates" };

  const dates = (candidate.proposedDates as string[]) ?? [];
  const theme = pipeline.parsedThemeLabel ?? pipeline.parsedThemeCode ?? "formation";

  const clientMessage = buildClientConfirmationMessage(
    pipeline.parsedClientName ?? "Madame/Monsieur",
    theme,
    dates
  );

  // Envoyer via le canal d'origine
  let sent = false;
  try {
    switch (pipeline.channel) {
      case "WHATSAPP":
        await sendWhatsAppMessage(pipeline.fromAddress, clientMessage);
        sent = true;
        break;
      case "EMAIL": {
        const clientName = pipeline.parsedClientName ?? "Madame/Monsieur";
        await sendMail({
          to: [pipeline.fromAddress],
          subject: `CCE LOG — Confirmation de disponibilité : ${theme}`,
          bodyHtml: buildClientConfirmationEmailHtml(clientName, theme, dates),
        });
        sent = true;
        break;
      }
      case "TELEGRAM":
        await sendTelegramMessage(pipeline.fromAddress, clientMessage);
        sent = true;
        break;
      case "SMS":
        await sendSMS(pipeline.fromAddress, clientMessage);
        sent = true;
        break;
    }
  } catch (err) {
    console.error("[pipeline] Erreur envoi client:", err);
  }

  await db.pipelineMessage.create({
    data: {
      pipelineId,
      direction: "SORTANT",
      channel: pipeline.channel,
      fromAddr: "ccelog",
      toAddr: pipeline.fromAddress,
      body: clientMessage,
    },
  });

  await db.demandePipeline.update({
    where: { id: pipelineId },
    data: { status: "WAITING_CLIENT", clientNotifiedAt: new Date() },
  });

  return { sent, channel: pipeline.channel };
}

// ── 6. RÉPONSE DU CLIENT ───────────────────────────────────────────

async function handleClientReply(
  pipelineId: string,
  confirmed: boolean,
  proposedDates?: string[]
) {
  if (confirmed && proposedDates?.length) {
    // Créer la session
    return handleCreateSession(pipelineId, proposedDates[0]);
  }

  // Client refuse / propose d'autres dates → passer au formateur suivant
  return handleMoveNextTrainer(pipelineId, "client_rejected");
}

// ── 7. CRÉER LA SESSION ────────────────────────────────────────────

async function handleCreateSession(pipelineId: string, confirmedDate: string) {
  const pipeline = await db.demandePipeline.findUniqueOrThrow({
    where: { id: pipelineId },
    include: {
      candidates: {
        where: { status: "proposed_dates" },
        include: { trainer: true },
        orderBy: { rank: "asc" },
      },
    },
  });

  const candidate = pipeline.candidates[0];
  if (!candidate) throw new Error("Aucun candidat avec dates proposées");

  const startDate = new Date(confirmedDate);
  const theme = pipeline.parsedThemeCode
    ? await db.theme.findUnique({ where: { code: pipeline.parsedThemeCode } })
    : null;

  if (!theme) {
    await db.demandePipeline.update({
      where: { id: pipelineId },
      data: { status: "FAILED", errorReason: "Thème non identifié, création session manuelle requise" },
    });
    return { error: "theme_not_found" };
  }

  // Créer ou récupérer la TrainingRequest
  let requestId = pipeline.requestId;
  if (!requestId) {
    // Trouver ou créer le client
    let client = pipeline.parsedClientName
      ? await db.client.findFirst({ where: { normalizedName: { contains: pipeline.parsedClientName.toLowerCase() } } })
      : null;

    if (!client) {
      client = await db.client.create({
        data: {
          name: pipeline.parsedClientName ?? `Client pipeline ${pipelineId.slice(-6)}`,
          normalizedName: (pipeline.parsedClientName ?? pipelineId).toLowerCase(),
        },
      });
    }

    // Trouver ou créer le site
    let site = await db.clientSite.findFirst({ where: { clientId: client.id } });
    if (!site) {
      site = await db.clientSite.create({
        data: {
          clientId: client.id,
          label: pipeline.parsedSiteCity ?? "Site principal",
          address: pipeline.parsedSiteCity ?? "À préciser",
          city: pipeline.parsedSiteCity ?? "Casablanca",
        },
      });
    }

    const request = await db.trainingRequest.create({
      data: {
        clientId: client.id,
        siteId: site.id,
        participants: pipeline.parsedParticipants ?? 10,
        desiredDateFrom: pipeline.parsedDateFrom,
        desiredDateTo: pipeline.parsedDateTo,
        status: "CONFIRMEE",
        urgency: pipeline.parsedUrgency ?? 0,
        notes: `Créé automatiquement via pipeline ${pipelineId}`,
        themes: { create: { themeId: theme.id } },
      },
    });
    requestId = request.id;
  }

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + (theme.durationDays - 1));

  const session = await db.trainingSession.create({
    data: {
      requestId,
      trainerId: candidate.trainerId,
      themeId: theme.id,
      startDate,
      endDate,
      status: "CONFIRMEE",
      trainerConfirmed: true,
      clientConfirmed: true,
      notes: `Créé automatiquement via pipeline ${pipelineId}`,
    },
  });

  // Confirmer le candidat
  await db.trainerCandidate.update({
    where: { id: candidate.id },
    data: { status: "accepted" },
  });

  await db.demandePipeline.update({
    where: { id: pipelineId },
    data: {
      status: "COMPLETED",
      requestId,
      sessionId: session.id,
      confirmedAt: new Date(),
    },
  });

  // Envoyer confirmation au formateur via WA
  const confirmMsg = `✅ Bonjour ${candidate.trainer.fullName}, la session *${theme.label}* est confirmée pour le ${startDate.toLocaleDateString("fr-FR")}. Merci !`;
  try { await sendWhatsAppMessage(candidate.trainer.phone, confirmMsg); } catch {}

  return { sessionId: session.id, requestId };
}

// ── 8. PASSER AU FORMATEUR SUIVANT ────────────────────────────────

async function handleMoveNextTrainer(pipelineId: string, reason: string) {
  const pipeline = await db.demandePipeline.findUniqueOrThrow({
    where: { id: pipelineId },
    include: { candidates: { orderBy: { rank: "asc" } } },
  });

  const nextIndex = pipeline.currentTrainerIndex + 1;
  const nextCandidate = pipeline.candidates.find((_, i) => i === nextIndex);

  if (!nextCandidate) {
    await db.demandePipeline.update({
      where: { id: pipelineId },
      data: {
        status: "FAILED",
        errorReason: `Tous les formateurs épuisés. Dernier motif: ${reason}`,
      },
    });
    // Notifier le planner
    await db.notification.create({
      data: {
        type: "AUTRE",
        status: "EN_ATTENTE",
        scheduledAt: new Date(),
        channel: "inapp",
        recipient: "planner",
        payload: { pipelineId, action: "pipeline_failed", reason },
      },
    });
    return { status: "failed" };
  }

  await db.demandePipeline.update({
    where: { id: pipelineId },
    data: {
      currentTrainerIndex: nextIndex,
      status: "CONTACTING_TRAINER",
    },
  });

  // Contacter le prochain formateur (tail-call via BullMQ sera ajouté dans le processor)
  await handleContactTrainer(pipelineId);
  return { nextIndex, reason };
}

// ── Helpers de messaging ───────────────────────────────────────────

function buildTrainerWAMessage(trainerName: string, theme: string, dateHint: string): string {
  return `Bonjour ${trainerName} 👋

CCE LOG vous contacte pour une mission de formation.

📚 *Thème* : ${theme}
📅 *Dates souhaitées* : ${dateHint}

Êtes-vous disponible ? Si oui, merci de nous confirmer vos disponibilités précises (jj/mm/aaaa).

Si vous n'êtes pas disponible, répondez simplement *NON*.

Merci 🙏`;
}

function buildClientConfirmationMessage(clientName: string, theme: string, dates: string[]): string {
  const datesFormatted = dates
    .map((d) => new Date(d).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }))
    .join("\n  • ");

  return `Bonjour ${clientName} 👋

Suite à votre demande de formation *${theme}*, nous avons un formateur disponible aux dates suivantes :

  • ${datesFormatted}

Ces dates vous conviennent-elles ?
  ✅ Répondez *OUI* pour confirmer
  ❌ Répondez *NON* ou proposez d'autres dates

CCE LOG — Formation professionnelle`;
}

export function buildClientConfirmationEmailHtml(clientName: string, theme: string, dates: string[]): string {
  const datesFormatted = dates
    .map((d) => `<li>${new Date(d).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</li>`)
    .join("\n");

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto;padding:24px">
  <div style="background:#1e3a5f;padding:16px 24px;border-radius:8px 8px 0 0;text-align:center">
    <img src="${process.env.APP_URL ?? "https://app.ccelog.ma"}/logo.png" alt="CCE LOG" height="48" style="margin-bottom:8px">
    <p style="color:#ffffff;margin:0;font-size:14px">Formation professionnelle</p>
  </div>

  <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:32px 24px">
    <p style="font-size:16px">Bonjour <strong>${clientName}</strong>,</p>
    <p>Suite à votre demande de formation <strong>${theme}</strong>, nous avons un formateur disponible aux dates suivantes&nbsp;:</p>

    <ul style="background:#f0f7ff;border-left:4px solid #1e3a5f;padding:16px 16px 16px 32px;border-radius:4px;line-height:2">
      ${datesFormatted}
    </ul>

    <p>Ces dates vous conviennent-elles&nbsp;? Merci de nous répondre directement à cet email :</p>

    <div style="text-align:center;margin:32px 0">
      <a href="mailto:${process.env.CONTACT_EMAIL ?? "formation@ccelog.ma"}?subject=Confirmation%20formation%20${encodeURIComponent(theme)}&body=OUI%2C%20je%20confirme."
         style="background:#16a34a;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;margin-right:12px">
        ✅ Confirmer
      </a>
      <a href="mailto:${process.env.CONTACT_EMAIL ?? "formation@ccelog.ma"}?subject=Confirmation%20formation%20${encodeURIComponent(theme)}&body=NON%2C%20ces%20dates%20ne%20me%20conviennent%20pas."
         style="background:#dc2626;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold">
        ❌ Refuser
      </a>
    </div>

    <p style="font-size:13px;color:#6b7280">
      Vous pouvez également nous joindre par téléphone ou WhatsApp.<br>
      Cet email est envoyé automatiquement — merci de répondre directement.
    </p>
  </div>

  <p style="text-align:center;font-size:12px;color:#9ca3af;margin-top:16px">
    © ${new Date().getFullYear()} CCE LOG — Organisme de formation professionnelle
  </p>
</body>
</html>`;
}

function isDeclineMessage(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return (
    lower.startsWith("non") ||
    lower.startsWith("no") ||
    lower.includes("pas disponible") ||
    lower.includes("indisponible") ||
    lower.includes("occupé") ||
    lower === "n"
  );
}

async function extractDatesFromMessage(text: string): Promise<string[]> {
  // Extraction simple par regex — complété par IA si besoin
  const datePatterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/g,   // dd/mm/yyyy ou dd-mm-yyyy
    /(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4})/gi,
  ];

  const dates: string[] = [];
  const monthMap: Record<string, number> = {
    janvier: 1, février: 2, mars: 3, avril: 4, mai: 5, juin: 6,
    juillet: 7, août: 8, septembre: 9, octobre: 10, novembre: 11, décembre: 12,
  };

  let match;
  const re1 = datePatterns[0];
  while ((match = re1.exec(text)) !== null) {
    const day = parseInt(match[1]), month = parseInt(match[2]);
    let year = parseInt(match[3]);
    if (year < 100) year += 2000;
    const d = new Date(year, month - 1, day);
    if (!isNaN(d.getTime())) dates.push(d.toISOString());
  }

  const re2 = datePatterns[1];
  while ((match = re2.exec(text)) !== null) {
    const day = parseInt(match[1]);
    const month = monthMap[match[2].toLowerCase()] ?? 0;
    const year = parseInt(match[3]);
    const d = new Date(year, month - 1, day);
    if (!isNaN(d.getTime())) dates.push(d.toISOString());
  }

  return [...new Set(dates)];
}

// ── Stubs d'envoi (implémentations complètes dans packages/integrations) ──

async function sendWhatsAppMessage(phone: string, message: string): Promise<string> {
  const waToken = process.env.WA_API_TOKEN;
  const phoneNumberId = process.env.WA_PHONE_NUMBER_ID;
  if (!waToken || !phoneNumberId) throw new Error("WA non configuré");

  const res = await fetch(
    `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${waToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone.replace(/\D/g, ""),
        type: "text",
        text: { body: message },
      }),
    }
  );
  if (!res.ok) throw new Error(`WA API error: ${res.status}`);
  const data = (await res.json()) as { messages?: { id: string }[] };
  return data.messages?.[0]?.id ?? "";
}

async function sendTelegramMessage(chatId: string, message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Telegram non configuré");

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "Markdown" }),
  });
}

async function sendSMS(phone: string, message: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!accountSid || !authToken || !from) throw new Error("Twilio non configuré");

  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: phone, From: from, Body: message }).toString(),
  });
}
