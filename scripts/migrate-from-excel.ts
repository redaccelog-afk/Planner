/**
 * Script de migration — importe les données historiques depuis Excel/CSV
 *
 * Usage:
 *   npx ts-node scripts/migrate-from-excel.ts --file ./data/sessions_historiques.csv
 *
 * Format CSV attendu (séparateur point-virgule) :
 *   client_nom;client_ville;theme_code;formateur_nom;date_debut;date_fin;participants;statut;cout_total
 *
 * Modes:
 *   --dry-run  : affiche les enregistrements sans écrire en base
 *   --file     : chemin vers le fichier CSV
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { db } from "@ccelog/db";
import { addDays, parse as parseDate, isValid } from "date-fns";

interface CsvRow {
  client_nom: string;
  client_ville: string;
  theme_code: string;
  formateur_nom: string;
  date_debut: string;
  date_fin: string;
  participants: string;
  statut: string;
  cout_total: string;
}

const args = process.argv.slice(2);
const fileArg = args[findArg("--file")];
const dryRun = args.includes("--dry-run");

function findArg(flag: string): number {
  const i = args.indexOf(flag);
  return i === -1 ? -1 : i + 1;
}

async function main() {
  if (!fileArg || !fs.existsSync(fileArg)) {
    console.error("❌ Fichier non trouvé. Usage: --file <chemin>");
    process.exit(1);
  }

  console.log(`📂 Lecture de ${path.resolve(fileArg)} ${dryRun ? "(DRY RUN)" : ""}`);

  const content = fs.readFileSync(fileArg, "utf-8");
  const rows: CsvRow[] = parse(content, {
    columns: true,
    delimiter: ";",
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`📊 ${rows.length} ligne(s) trouvée(s)`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const [i, row] of rows.entries()) {
    try {
      // Parse dates (format DD/MM/YYYY ou YYYY-MM-DD)
      const startDate = parseFlexDate(row.date_debut);
      const endDate = row.date_fin ? parseFlexDate(row.date_fin) : startDate;

      if (!startDate || !isValid(startDate)) {
        console.warn(`  ⚠ Ligne ${i + 2} : date invalide "${row.date_debut}" — ignorée`);
        skipped++;
        continue;
      }

      // Résoudre les entités
      const [client, theme, trainer] = await Promise.all([
        db.client.findFirst({ where: { name: { contains: row.client_nom.trim(), mode: "insensitive" } } }),
        db.theme.findFirst({ where: { code: row.theme_code.trim() } }),
        db.trainer.findFirst({ where: { fullName: { contains: row.formateur_nom.trim(), mode: "insensitive" } } }),
      ]);

      if (!client || !theme || !trainer) {
        const missing = [!client && `client "${row.client_nom}"`, !theme && `thème "${row.theme_code}"`, !trainer && `formateur "${row.formateur_nom}"`]
          .filter(Boolean)
          .join(", ");
        console.warn(`  ⚠ Ligne ${i + 2} : introuvable en base — ${missing}`);
        skipped++;
        continue;
      }

      // Trouver ou créer le site
      const site = await db.clientSite.findFirst({
        where: { clientId: client.id, city: { contains: row.client_ville.trim(), mode: "insensitive" } },
      }) ?? await (dryRun ? null : db.clientSite.create({
        data: {
          clientId: client.id,
          label: row.client_ville.trim(),
          city: row.client_ville.trim(),
          address: "",
        },
      }));

      if (!site) {
        if (!dryRun) {
          console.warn(`  ⚠ Ligne ${i + 2} : impossible de créer le site — ignorée`);
          skipped++;
          continue;
        }
      }

      const participants = parseInt(row.participants, 10) || 1;
      const totalCost = parseFloat(row.cout_total.replace(",", ".")) || null;
      const status = normalizeStatus(row.statut);

      if (dryRun) {
        console.log(
          `  → [DRY] ${client.name} | ${theme.label} | ${trainer.fullName} | ${row.date_debut} — ${participants} part. | ${status}`
        );
        created++;
        continue;
      }

      // Créer la demande d'import
      const request = await db.trainingRequest.upsert({
        where: {
          id: `import-${client.id}-${theme.id}-${startDate.toISOString().slice(0, 10)}`,
        },
        update: {},
        create: {
          id: `import-${client.id}-${theme.id}-${startDate.toISOString().slice(0, 10)}`,
          clientId: client.id,
          siteId: site!.id,
          participants,
          status: "CONFIRMEE",
          source: "IMPORT",
          themes: { create: { themeId: theme.id } },
        },
      });

      // Créer la session
      await db.trainingSession.upsert({
        where: {
          id: `import-session-${request.id}`,
        },
        update: {},
        create: {
          id: `import-session-${request.id}`,
          requestId: request.id,
          trainerId: trainer.id,
          themeId: theme.id,
          startDate,
          endDate: endDate ?? startDate,
          status,
          totalCost,
          trainerConfirmed: true,
          clientConfirmed: true,
        },
      });

      console.log(`  ✓ Ligne ${i + 2} : ${client.name} — ${theme.label} (${row.date_debut})`);
      created++;
    } catch (err) {
      console.error(`  ✗ Ligne ${i + 2} : erreur —`, err);
      errors++;
    }
  }

  console.log(`\n📋 Résultat : ${created} importé(s), ${skipped} ignoré(s), ${errors} erreur(s)`);

  if (!dryRun && created > 0) {
    console.log("✅ Migration terminée.");
  } else if (dryRun) {
    console.log("ℹ Dry run — aucun enregistrement créé. Relancez sans --dry-run pour valider.");
  }

  await db.$disconnect();
}

function parseFlexDate(s: string): Date | null {
  if (!s) return null;
  // Try DD/MM/YYYY
  const d1 = parseDate(s.trim(), "dd/MM/yyyy", new Date());
  if (isValid(d1)) return d1;
  // Try YYYY-MM-DD
  const d2 = parseDate(s.trim(), "yyyy-MM-dd", new Date());
  if (isValid(d2)) return d2;
  return null;
}

function normalizeStatus(raw: string): "CONFIRMEE" | "PROVISOIRE" | "ANNULEE" {
  const s = raw.trim().toLowerCase();
  if (s.includes("annul")) return "ANNULEE";
  if (s.includes("provisoire") || s.includes("prov")) return "PROVISOIRE";
  return "CONFIRMEE";
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
