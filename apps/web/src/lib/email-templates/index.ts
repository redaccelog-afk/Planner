import { formatMaroc, formatCurrency } from "@ccelog/shared";

interface SessionEmailData {
  clientName: string;
  clientContactName?: string;
  themeName: string;
  startDate: Date;
  endDate: Date;
  city: string;
  participants: number;
  trainerName?: string;
  estimatedCost?: number;
  notes?: string;
}

export function buildAvisFavorableEmail(data: SessionEmailData): { subject: string; bodyHtml: string } {
  const subject = `CCE LOG — Votre demande de formation ${data.themeName}`;

  const bodyHtml = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width" /></head>
<body style="font-family: Arial, sans-serif; color: #222; max-width: 600px; margin: 0 auto; padding: 24px;">
  <div style="background: #1B4F8A; padding: 16px 24px; border-radius: 8px 8px 0 0;">
    <p style="color: #fff; font-size: 18px; font-weight: bold; margin: 0;">CCE LOG</p>
    <p style="color: #9cc4f0; font-size: 12px; margin: 4px 0 0;">Organisme de formation & certification — Maroc</p>
  </div>

  <div style="border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px; padding: 24px;">
    <p>Bonjour${data.clientContactName ? ` ${data.clientContactName}` : ""},</p>

    <p>Nous avons bien pris note de votre demande de formation et avons le plaisir de vous proposer la date suivante :</p>

    <table style="width: 100%; border-collapse: collapse; margin: 16px 0; background: #f8f9fa; border-radius: 6px;">
      <tr>
        <td style="padding: 10px 16px; font-weight: bold; width: 40%;">Formation</td>
        <td style="padding: 10px 16px;">${data.themeName}</td>
      </tr>
      <tr style="background: #fff;">
        <td style="padding: 10px 16px; font-weight: bold;">Date</td>
        <td style="padding: 10px 16px;">
          ${formatMaroc(data.startDate)}
          ${data.endDate.getTime() !== data.startDate.getTime() ? ` au ${formatMaroc(data.endDate)}` : ""}
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; font-weight: bold;">Lieu</td>
        <td style="padding: 10px 16px;">${data.city}</td>
      </tr>
      <tr style="background: #fff;">
        <td style="padding: 10px 16px; font-weight: bold;">Participants</td>
        <td style="padding: 10px 16px;">${data.participants} personne(s)</td>
      </tr>
      ${data.estimatedCost ? `
      <tr>
        <td style="padding: 10px 16px; font-weight: bold;">Devis estimé</td>
        <td style="padding: 10px 16px; color: #1B4F8A; font-weight: bold;">${formatCurrency(data.estimatedCost)} MAD HT</td>
      </tr>` : ""}
    </table>

    <p>Merci de bien vouloir <strong>confirmer ou décliner cette proposition</strong> dans les meilleurs délais, afin que nous puissions bloquer la date dans le planning du formateur.</p>

    ${data.notes ? `<p style="color: #555; font-size: 13px;"><em>${data.notes}</em></p>` : ""}

    <p style="margin-top: 24px;">Cordialement,</p>
    <p style="font-weight: bold; color: #1B4F8A;">L'équipe CCE LOG</p>

    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
    <p style="font-size: 11px; color: #999;">
      CCE LOG · Organisme de formation & certification · Maroc<br />
      Cette réponse ne constitue pas un accord contractuel tant qu'elle n'est pas confirmée par écrit.
    </p>
  </div>
</body>
</html>
`.trim();

  return { subject, bodyHtml };
}

export function buildConfirmationEmail(data: SessionEmailData): { subject: string; bodyHtml: string } {
  const subject = `CCE LOG — Confirmation de votre formation ${data.themeName} du ${formatMaroc(data.startDate)}`;

  const bodyHtml = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /></head>
<body style="font-family: Arial, sans-serif; color: #222; max-width: 600px; margin: 0 auto; padding: 24px;">
  <div style="background: #1B4F8A; padding: 16px 24px; border-radius: 8px 8px 0 0;">
    <p style="color: #fff; font-size: 18px; font-weight: bold; margin: 0;">CCE LOG</p>
  </div>
  <div style="border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px; padding: 24px;">
    <p>Bonjour${data.clientContactName ? ` ${data.clientContactName}` : ""},</p>
    <p>Nous avons le plaisir de vous confirmer votre formation :</p>
    <div style="background: #f0f7ff; border-left: 4px solid #1B4F8A; padding: 12px 16px; margin: 16px 0; border-radius: 0 6px 6px 0;">
      <strong>${data.themeName}</strong><br />
      📅 ${formatMaroc(data.startDate)}${data.endDate.getTime() !== data.startDate.getTime() ? ` — ${formatMaroc(data.endDate)}` : ""}<br />
      📍 ${data.city}<br />
      👥 ${data.participants} participant(s)
    </div>
    <p>Les convocations vous seront transmises prochainement. En cas de besoin, n'hésitez pas à nous contacter.</p>
    <p style="margin-top: 24px;">Cordialement,</p>
    <p style="font-weight: bold; color: #1B4F8A;">L'équipe CCE LOG</p>
  </div>
</body>
</html>
`.trim();

  return { subject, bodyHtml };
}

export function buildEnvoiRapportEmail(data: {
  clientName: string;
  clientContactName?: string;
  themeName: string;
  sessionDate: Date;
  reportUrl?: string;
}): { subject: string; bodyHtml: string } {
  const subject = `CCE LOG — Rapport de formation ${data.themeName} du ${formatMaroc(data.sessionDate)}`;

  const bodyHtml = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /></head>
<body style="font-family: Arial, sans-serif; color: #222; max-width: 600px; margin: 0 auto; padding: 24px;">
  <div style="background: #1B4F8A; padding: 16px 24px; border-radius: 8px 8px 0 0;">
    <p style="color: #fff; font-size: 18px; font-weight: bold; margin: 0;">CCE LOG</p>
  </div>
  <div style="border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px; padding: 24px;">
    <p>Bonjour${data.clientContactName ? ` ${data.clientContactName}` : ""},</p>
    <p>Veuillez trouver ci-joint le rapport de formation <strong>${data.themeName}</strong> du ${formatMaroc(data.sessionDate)}.</p>
    <p>Ce document comprend la liste de présence, les résultats des évaluations et les observations du formateur.</p>
    ${data.reportUrl ? `<p><a href="${data.reportUrl}" style="color: #1B4F8A;">Télécharger le rapport →</a></p>` : ""}
    <p style="margin-top: 24px;">Cordialement,</p>
    <p style="font-weight: bold; color: #1B4F8A;">L'équipe CCE LOG</p>
  </div>
</body>
</html>
`.trim();

  return { subject, bodyHtml };
}
