/**
 * Génération de documents .docx à partir des trames CCE LOG
 * + conversion PDF via LibreOffice headless (sur worker Render)
 *
 * Dépendances : docxtemplater, pizzip (runtime), libre office (sur worker)
 * Les trames .docx doivent être placées dans /templates/ sur le stockage S3/Supabase
 */

export interface SessionDocumentData {
  client: {
    name: string;
    address?: string;
    contactName?: string;
    contactEmail?: string;
  };
  site: {
    label: string;
    city: string;
    address: string;
  };
  trainer: {
    fullName: string;
    phone: string;
  };
  theme: {
    code: string;
    label: string;
    durationDays: number;
  };
  session: {
    id: string;
    startDate: Date;
    endDate: Date;
    participants: number;
    location?: string;
  };
  participantsList?: Array<{ name: string; matricule?: string }>;
}

export type DocumentTemplateType =
  | "CONVOCATION"
  | "LISTE_PRESENCE"
  | "EVALUATION"
  | "TEST"
  | "RAPPORT"
  | "CERTIFICAT"
  | "BON_SORTIE_MATERIEL";

const TEMPLATE_MAP: Record<DocumentTemplateType, string> = {
  CONVOCATION: "templates/convocation.docx",
  LISTE_PRESENCE: "templates/liste-presence.docx",
  EVALUATION: "templates/fiche-evaluation.docx",
  TEST: "templates/grille-test.docx",
  RAPPORT: "templates/rapport.docx",
  CERTIFICAT: "templates/attestation.docx",
  BON_SORTIE_MATERIEL: "templates/bon-sortie-materiel.docx",
};

export async function generateDocument(
  type: DocumentTemplateType,
  data: SessionDocumentData
): Promise<Buffer> {
  // Import dynamique pour éviter le bundle côté client
  const { default: Docxtemplater } = await import("docxtemplater");
  const { default: PizZip } = await import("pizzip");

  const templatePath = TEMPLATE_MAP[type];
  const templateBuffer = await fetchTemplate(templatePath);

  const zip = new PizZip(templateBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  const formatDate = (d: Date) =>
    d.toLocaleDateString("fr-MA", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Africa/Casablanca" });

  doc.render({
    // Client
    CLIENT_NOM: data.client.name,
    CLIENT_ADRESSE: data.client.address ?? "",
    CLIENT_CONTACT_NOM: data.client.contactName ?? "",
    CLIENT_CONTACT_EMAIL: data.client.contactEmail ?? "",
    // Site
    SITE_LABEL: data.site.label,
    SITE_VILLE: data.site.city,
    SITE_ADRESSE: data.site.address,
    // Formateur
    FORMATEUR_NOM: data.trainer.fullName,
    FORMATEUR_TELEPHONE: data.trainer.phone,
    // Thème
    THEME_CODE: data.theme.code,
    THEME_LABEL: data.theme.label,
    THEME_DUREE: `${data.theme.durationDays} jour(s)`,
    // Session
    SESSION_DATE_DEBUT: formatDate(data.session.startDate),
    SESSION_DATE_FIN: formatDate(data.session.endDate),
    SESSION_LIEU: data.session.location ?? data.site.label,
    SESSION_PARTICIPANTS: data.session.participants,
    SESSION_ID: data.session.id,
    // Participants
    PARTICIPANTS_LISTE: data.participantsList ?? [],
    // Date génération
    DATE_GENERATION: formatDate(new Date()),
    ANNEE: new Date().getFullYear(),
  });

  const output = doc.getZip().generate({ type: "nodebuffer" });
  return output;
}

async function fetchTemplate(path: string): Promise<Buffer> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase non configuré — impossible de récupérer la trame");
  }

  const url = `${supabaseUrl}/storage/v1/object/public/ccelog-templates/${path}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${supabaseKey}` },
  });

  if (!res.ok) {
    throw new Error(`Template introuvable : ${path} (${res.status})`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function uploadDocument(
  fileName: string,
  buffer: Buffer,
  mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
): Promise<string> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase non configuré");
  }

  const path = `sessions/${fileName}`;
  const url = `${supabaseUrl}/storage/v1/object/ccelog-documents/${path}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": mimeType,
    },
    body: buffer,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Upload échoué : ${err}`);
  }

  return `${supabaseUrl}/storage/v1/object/public/ccelog-documents/${path}`;
}
