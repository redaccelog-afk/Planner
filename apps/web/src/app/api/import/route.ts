import { NextRequest, NextResponse } from "next/server";
import { db } from "@ccelog/db";
import { requireRole, isAuthErr } from "@/lib/api-auth";

type ImportEntity =
  | "clients"
  | "formateurs"
  | "themes"
  | "consumables"
  | "materials"
  | "hotels"
  | "sessions"
  | "demandes"
  | "participants"
  | "preselections"
  | "templates";

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(";").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const values = line.split(";").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
    return row;
  });
}

function str(v: string | undefined): string | null {
  return v?.trim() || null;
}
function float(v: string | undefined): number | null {
  return v?.trim() ? parseFloat(v.trim()) : null;
}
function int(v: string | undefined, fallback?: number): number | null {
  return v?.trim() ? parseInt(v.trim(), 10) : fallback ?? null;
}
function bool(v: string | undefined, fallback = true): boolean {
  if (!v?.trim()) return fallback;
  return !["non", "false", "0", "no"].includes(v.trim().toLowerCase());
}

const VALID_SESSION_STATUSES = ["PROVISOIRE", "CONFIRMEE", "ANNULEE", "EN_COURS", "TERMINEE"] as const;

export async function POST(req: NextRequest) {
  const check = await requireRole(["ADMIN", "PLANIFICATEUR"]);
  if (isAuthErr(check)) return check;

  const formData = await req.formData();
  const entity = formData.get("entity") as ImportEntity;
  const file = formData.get("file") as File | null;

  if (!file || !entity) return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });

  const text = await file.text();
  const rows = parseCSV(text);
  if (rows.length === 0) return NextResponse.json({ error: "Fichier vide ou mal formaté" }, { status: 400 });

  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  // ── Clients ───────────────────────────────────────────────────────────────
  if (entity === "clients") {
    for (const row of rows) {
      const name = row["nom"]?.trim();
      if (!name) { errors.push("Ligne ignorée : nom manquant"); continue; }
      try {
        await db.client.upsert({
          where: { id: name },
          update: { name, normalizedName: name.toLowerCase() },
          create: { name, normalizedName: name.toLowerCase() },
        });
        if (row["site_label"]?.trim()) {
          const siteLabel = row["site_label"].trim();
          await db.clientSite.upsert({
            where: { id: `${name}-${siteLabel}` },
            update: { label: siteLabel, address: row["site_adresse"] ?? "", city: row["site_ville"] ?? "", latitude: float(row["latitude"]), longitude: float(row["longitude"]) },
            create: { id: `${name}-${siteLabel}`, label: siteLabel, address: row["site_adresse"] ?? "", city: row["site_ville"] ?? "", latitude: float(row["latitude"]), longitude: float(row["longitude"]), client: { connect: { id: name } } },
          });
        }
        created++;
      } catch (e) { errors.push(`Client "${name}" : ${e instanceof Error ? e.message : String(e)}`); }
    }

  // ── Formateurs ────────────────────────────────────────────────────────────
  } else if (entity === "formateurs") {
    for (const row of rows) {
      const phone = row["telephone"]?.trim();
      const fullName = row["nom_complet"]?.trim();
      const type = (row["type"]?.trim().toUpperCase() === "INTERNE" ? "INTERNE" : "EXTERNE") as "INTERNE" | "EXTERNE";
      if (!phone || !fullName) { errors.push("Ligne ignorée : téléphone ou nom manquant"); continue; }
      try {
        const existing = await db.trainer.findFirst({ where: { phone } });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any = { type, fullName, phone, email: str(row["email"]), city: row["ville"]?.trim() ?? "", address: str(row["adresse"]), notes: str(row["notes"]), legalStatus: str(row["statut_juridique"]), ice: str(row["ice"]), rc: str(row["rc"]), ifFiscal: str(row["if_fiscal"]), cnss: str(row["cnss"]), iban: str(row["iban"]), bankName: str(row["banque"]), defaultDayRate: float(row["tarif_journalier"]), paymentTerms: int(row["delai_paiement"], 30), employeeId: str(row["matricule"]), employerCost: float(row["cout_employeur"]) };
        if (existing) { await db.trainer.update({ where: { id: existing.id }, data }); updated++; }
        else { await db.trainer.create({ data: { ...data, active: true } }); created++; }
      } catch (e) { errors.push(`Formateur "${fullName}" : ${e instanceof Error ? e.message : String(e)}`); }
    }

  // ── Thèmes ────────────────────────────────────────────────────────────────
  } else if (entity === "themes") {
    const validCats = ["CACES", "VR", "SECURITE", "SECOURISME", "AUTRE"];
    for (const row of rows) {
      const code = row["code"]?.trim().toUpperCase();
      const label = row["label"]?.trim();
      const category = row["categorie"]?.trim().toUpperCase();
      if (!code || !label) { errors.push("Ligne ignorée : code ou label manquant"); continue; }
      if (!validCats.includes(category)) { errors.push(`Thème "${code}" : catégorie "${category}" invalide (${validCats.join(", ")})`); continue; }
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = { code, label, category: category as any, durationDays: int(row["duree_jours"], 1) ?? 1, active: bool(row["actif"]) };
        const existing = await db.theme.findUnique({ where: { code } });
        if (existing) { await db.theme.update({ where: { code }, data }); updated++; }
        else { await db.theme.create({ data }); created++; }
      } catch (e) { errors.push(`Thème "${code}" : ${e instanceof Error ? e.message : String(e)}`); }
    }

  // ── Consommables ──────────────────────────────────────────────────────────
  } else if (entity === "consumables") {
    for (const row of rows) {
      const label = row["label"]?.trim();
      if (!label) { errors.push("Ligne ignorée : label manquant"); continue; }
      try {
        const existing = await db.consumable.findFirst({ where: { label } });
        const data = { label, unit: row["unite"]?.trim() || "pièce", stockQty: int(row["stock_qt"]) ?? 0, reorderAt: int(row["seuil_alerte"]) ?? 10, unitCost: float(row["cout_unitaire"]) };
        if (existing) { await db.consumable.update({ where: { id: existing.id }, data }); updated++; }
        else { await db.consumable.create({ data }); created++; }
      } catch (e) { errors.push(`Consommable "${label}" : ${e instanceof Error ? e.message : String(e)}`); }
    }

  // ── Matériels ─────────────────────────────────────────────────────────────
  } else if (entity === "materials") {
    for (const row of rows) {
      const label = row["label"]?.trim();
      const category = row["categorie"]?.trim();
      if (!label || !category) { errors.push("Ligne ignorée : label ou catégorie manquant"); continue; }
      try {
        const serial = str(row["numero_serie"]);
        const existing = serial ? await db.material.findFirst({ where: { serial } }) : null;
        const data = { label, category, serial, notes: str(row["notes"]) };
        if (existing) { await db.material.update({ where: { id: existing.id }, data }); updated++; }
        else { await db.material.create({ data }); created++; }
      } catch (e) { errors.push(`Matériel "${label}" : ${e instanceof Error ? e.message : String(e)}`); }
    }

  // ── Hôtels ────────────────────────────────────────────────────────────────
  } else if (entity === "hotels") {
    for (const row of rows) {
      const name = row["nom"]?.trim();
      const city = row["ville"]?.trim();
      if (!name || !city) { errors.push("Ligne ignorée : nom ou ville manquant"); continue; }
      try {
        const existing = await db.hotel.findFirst({ where: { name } });
        const data = { name, city, address: str(row["adresse"]), phone: str(row["telephone"]), email: str(row["email"]), priceMin: float(row["prix_min"]), priceMax: float(row["prix_max"]) };
        if (existing) { await db.hotel.update({ where: { id: existing.id }, data }); updated++; }
        else { await db.hotel.create({ data }); created++; }
      } catch (e) { errors.push(`Hôtel "${name}" : ${e instanceof Error ? e.message : String(e)}`); }
    }

  // ── Demandes ──────────────────────────────────────────────────────────────
  } else if (entity === "demandes") {
    for (const row of rows) {
      const clientName = row["client_nom"]?.trim();
      const siteCity = row["site_ville"]?.trim();
      const themeCodes = row["themes"]?.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean) ?? [];
      if (!clientName || !siteCity) { errors.push("Ligne ignorée : client_nom ou site_ville manquant"); continue; }
      try {
        const client = await db.client.findFirst({ where: { normalizedName: { contains: clientName.toLowerCase() } } });
        if (!client) { errors.push(`Demande : client "${clientName}" introuvable`); continue; }
        const site = await db.clientSite.findFirst({ where: { clientId: client.id, city: { contains: siteCity } } });
        if (!site) { errors.push(`Demande : site "${siteCity}" introuvable pour "${clientName}"`); continue; }
        const themeRecords = await db.theme.findMany({ where: { code: { in: themeCodes } } });
        const request = await db.trainingRequest.create({
          data: {
            clientId: client.id, siteId: site.id, participants: int(row["participants"]) ?? 1,
            urgency: int(row["urgence"]) ?? 0,
            desiredDateFrom: row["date_debut"] ? new Date(row["date_debut"]) : null,
            desiredDateTo: row["date_fin"] ? new Date(row["date_fin"]) : null,
            notes: str(row["notes"]),
          },
        });
        if (themeRecords.length > 0) {
          await db.requestTheme.createMany({ data: themeRecords.map((t) => ({ requestId: request.id, themeId: t.id })), skipDuplicates: true });
        }
        created++;
      } catch (e) { errors.push(`Demande "${clientName}" : ${e instanceof Error ? e.message : String(e)}`); }
    }

  // ── Sessions ──────────────────────────────────────────────────────────────
  } else if (entity === "sessions") {
    for (const row of rows) {
      const clientName = row["client_nom"]?.trim();
      const themeCode = row["theme_code"]?.trim().toUpperCase();
      const dateDebut = row["date_debut"]?.trim();
      if (!clientName || !themeCode || !dateDebut) { errors.push("Ligne ignorée : client_nom, theme_code ou date_debut manquant"); continue; }
      try {
        const client = await db.client.findFirst({ where: { normalizedName: { contains: clientName.toLowerCase() } } });
        if (!client) { errors.push(`Session : client "${clientName}" introuvable`); continue; }
        const theme = await db.theme.findUnique({ where: { code: themeCode } });
        if (!theme) { errors.push(`Session : thème "${themeCode}" introuvable`); continue; }
        const siteCity = row["site_ville"]?.trim();
        const site = siteCity
          ? await db.clientSite.findFirst({ where: { clientId: client.id, city: { contains: siteCity } } })
          : await db.clientSite.findFirst({ where: { clientId: client.id } });
        if (!site) { errors.push(`Session : aucun site trouvé pour "${clientName}"`); continue; }
        const trainerPhone = row["formateur_telephone"]?.trim();
        const trainer = trainerPhone ? await db.trainer.findFirst({ where: { phone: trainerPhone } }) : null;
        if (trainerPhone && !trainer) { errors.push(`Session : formateur "${trainerPhone}" introuvable`); continue; }
        let request = await db.trainingRequest.findFirst({ where: { clientId: client.id, siteId: site.id, status: { in: ["NOUVELLE", "EN_RECHERCHE", "CONFIRMEE"] } } });
        if (!request) {
          request = await db.trainingRequest.create({ data: { clientId: client.id, siteId: site.id, participants: int(row["participants"]) ?? 1, urgency: 0 } });
          await db.requestTheme.create({ data: { requestId: request.id, themeId: theme.id } });
        }
        if (!trainer) { errors.push(`Session ligne "${clientName}/${themeCode}" : formateur requis`); continue; }
        const startDate = new Date(dateDebut);
        const durDays = theme.durationDays ?? 1;
        const endDate = row["date_fin"] ? new Date(row["date_fin"]) : new Date(startDate.getTime() + (durDays - 1) * 86400000);
        const rawStatus = row["statut"]?.trim().toUpperCase();
        const sessionStatus = VALID_SESSION_STATUSES.includes(rawStatus as (typeof VALID_SESSION_STATUSES)[number])
          ? (rawStatus as (typeof VALID_SESSION_STATUSES)[number])
          : "PROVISOIRE";
        await db.trainingSession.create({
          data: {
            requestId: request.id, trainerId: trainer.id, themeId: theme.id,
            startDate, endDate,
            status: sessionStatus,
            trainerConfirmed: bool(row["formateur_confirme"], false),
            clientConfirmed: bool(row["client_confirme"], false),
            location: str(row["lieu"]),
            notes: str(row["notes"]),
          },
        });
        created++;
      } catch (e) { errors.push(`Session "${clientName}/${themeCode}" : ${e instanceof Error ? e.message : String(e)}`); }
    }

  // ── Participants ──────────────────────────────────────────────────────────
  } else if (entity === "participants") {
    const extraSessionId = formData.get("sessionId") as string | null;
    for (const row of rows) {
      const nom = row["nom"]?.trim();
      const prenom = row["prenom"]?.trim();
      const sessionId = row["session_id"]?.trim() || extraSessionId;
      if (!nom || !prenom || !sessionId) { errors.push(`Ligne ignorée : nom, prenom ou session_id manquant`); continue; }
      try {
        await db.participant.create({
          data: { sessionId, nom, prenom, cin: str(row["cin"]), fonction: str(row["fonction"]), present: bool(row["present"]), dateNaissance: row["date_naissance"] ? new Date(row["date_naissance"]) : null },
        });
        created++;
      } catch (e) { errors.push(`Participant "${prenom} ${nom}" : ${e instanceof Error ? e.message : String(e)}`); }
    }

  // ── Présélections ─────────────────────────────────────────────────────────
  } else if (entity === "preselections") {
    const validStatuses = ["CANDIDAT", "EN_EVALUATION", "ACCEPTE", "REFUSE"];
    for (const row of rows) {
      const phone = row["formateur_telephone"]?.trim();
      if (!phone) { errors.push("Ligne ignorée : formateur_telephone manquant"); continue; }
      try {
        const trainer = await db.trainer.findFirst({ where: { phone } });
        if (!trainer) { errors.push(`Présélection : formateur "${phone}" introuvable`); continue; }
        const statusRaw = row["statut"]?.trim().toUpperCase();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const status: any = validStatuses.includes(statusRaw) ? statusRaw : "CANDIDAT";
        const existing = await db.preselection.findFirst({ where: { trainerId: trainer.id } });
        const data = { trainerId: trainer.id, status, source: str(row["source"]), cvUrl: str(row["cv_url"]), evaluationScore: int(row["score"]), evaluationNotes: str(row["notes"]) };
        if (existing) { await db.preselection.update({ where: { id: existing.id }, data }); updated++; }
        else { await db.preselection.create({ data }); created++; }
      } catch (e) { errors.push(`Présélection "${phone}" : ${e instanceof Error ? e.message : String(e)}`); }
    }

  // ── Templates d'attestations ──────────────────────────────────────────────
  } else if (entity === "templates") {
    for (const row of rows) {
      const code = row["code"]?.trim().toUpperCase();
      const name = row["nom"]?.trim();
      const nomenclature = row["nomenclature"]?.trim();
      if (!code || !name || !nomenclature) { errors.push("Ligne ignorée : code, nom ou nomenclature manquant"); continue; }
      try {
        const existing = await db.attestationTemplate.findUnique({ where: { code } });
        const data = { name, code, nomenclature, active: bool(row["actif"]) };
        if (existing) { await db.attestationTemplate.update({ where: { code }, data }); updated++; }
        else { await db.attestationTemplate.create({ data }); created++; }
      } catch (e) { errors.push(`Template "${code}" : ${e instanceof Error ? e.message : String(e)}`); }
    }
  }

  return NextResponse.json({ created, updated, errors, total: rows.length });
}
