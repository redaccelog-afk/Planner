/**
 * Scénarios de test CCE LOG
 * npx ts-node --skip-project -e "require('ts-node').register({transpileOnly:true}); require('./prisma/seed-scenarios.ts')"
 * ou plus simplement via : pnpm --filter @ccelog/db exec npx ts-node prisma/seed-scenarios.ts
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

async function main() {
  console.log("🎭 Création des scénarios de test...\n");

  const trainer = await prisma.trainer.findFirst();
  if (!trainer) throw new Error("Lance d'abord `pnpm db:seed`");

  const themeCAC  = await prisma.theme.findUnique({ where: { code: "CACES_R489" } });
  const themeVR   = await prisma.theme.findUnique({ where: { code: "VR_SECURITE" } });
  const themeSST  = await prisma.theme.findUnique({ where: { code: "SST" } });
  const themePEMP = await prisma.theme.findUnique({ where: { code: "CACES_R486" } });

  const hutchinson  = await prisma.client.findFirst({ where: { name: { contains: "HUTCHINSON" } } });
  const cimentMaroc = await prisma.client.findFirst({ where: { name: { contains: "CIMENT" } } });
  const casatram    = await prisma.client.findFirst({ where: { name: { contains: "CASATRAM" } } });
  const tata        = await prisma.client.findFirst({ where: { name: { contains: "TATA" } } });
  const vivoEnergy  = await prisma.client.findFirst({ where: { name: { contains: "VIVO" } } });

  if (!themeCAC || !themeVR || !themeSST || !themePEMP) throw new Error("Thèmes manquants — relance pnpm db:seed");
  if (!hutchinson || !cimentMaroc || !casatram || !tata || !vivoEnergy) throw new Error("Clients manquants — relance pnpm db:seed");

  const siteBouskoura = await prisma.clientSite.findFirst({ where: { clientId: hutchinson.id } });
  const siteSafi      = await prisma.clientSite.findFirst({ where: { clientId: cimentMaroc.id, city: "Safi" } });
  const siteCasatram  = await prisma.clientSite.findFirst({ where: { clientId: casatram.id } });
  const siteTata      = await prisma.clientSite.findFirst({ where: { clientId: tata.id } });
  const siteVivoRabat = await prisma.clientSite.findFirst({ where: { clientId: vivoEnergy.id, city: "Rabat" } });

  if (!siteBouskoura || !siteSafi || !siteCasatram || !siteTata || !siteVivoRabat) throw new Error("Sites manquants");

  // Contacts clients
  for (const [clientId, name, email, phone] of [
    [hutchinson.id,  "Karim Benjelloun",      "k.benjelloun@hutchinson.ma",   "+212661001001"],
    [casatram.id,    "Fatima Ezzahra Alaoui", "f.alaoui@casatram.ma",         "+212661002002"],
    [cimentMaroc.id, "Hassan Ouali",          "h.ouali@cimentdumaroc.ma",     "+212661003003"],
    [vivoEnergy.id,  "Youssef Tahiri",        "y.tahiri@vivoenergy.ma",       "+212661004004"],
    [tata.id,        "Sara Bennani",          "s.bennani@tatagroupe.ma",      "+212661005005"],
  ] as [string, string, string, string][]) {
    await prisma.clientContact.upsert({
      where: { id: `contact-${clientId}` },
      update: {},
      create: { id: `contact-${clientId}`, clientId, name, email, phone, primary: true },
    });
  }

  // Tarif formateur
  const existingRate = await prisma.trainerRate.findFirst({ where: { trainerId: trainer.id } });
  if (!existingRate) {
    await prisma.trainerRate.create({
      data: { trainerId: trainer.id, ratePerDay: 1800, validFrom: new Date("2024-01-01") },
    });
  }

  const now = new Date();

  // ══════════════════════════════════════════════════════════════════
  // SCÉNARIO 1 — Nouvelle demande urgente (à traiter)
  // ══════════════════════════════════════════════════════════════════
  await prisma.trainingRequest.upsert({
    where: { id: "sc1-req" },
    update: {},
    create: {
      id: "sc1-req",
      clientId: hutchinson.id,
      siteId: siteBouskoura.id,
      participants: 12,
      status: "NOUVELLE",
      urgency: 3,
      notes: "Client souhaite une formation CACES R489 pour ses caristes. Demande urgente — audit sécurité prévu fin du mois.",
      themes: { create: { themeId: themeCAC.id } },
    },
  });
  console.log("  ✓ Scénario 1 — Demande NOUVELLE urgente : HUTCHINSON CACES R489 (12 participants)");

  // ══════════════════════════════════════════════════════════════════
  // SCÉNARIO 2 — Demande en recherche de formateur
  // ══════════════════════════════════════════════════════════════════
  await prisma.trainingRequest.upsert({
    where: { id: "sc2-req" },
    update: {},
    create: {
      id: "sc2-req",
      clientId: casatram.id,
      siteId: siteCasatram.id,
      participants: 8,
      status: "EN_RECHERCHE",
      urgency: 1,
      themes: { create: { themeId: themeVR.id } },
    },
  });
  console.log("  ✓ Scénario 2 — Demande EN_RECHERCHE : CASATRAM VR Sécurité (8 participants)");

  // ══════════════════════════════════════════════════════════════════
  // SCÉNARIO 3 — Session provisoire dans 10 jours (client pas encore confirmé)
  // ══════════════════════════════════════════════════════════════════
  const req3 = await prisma.trainingRequest.upsert({
    where: { id: "sc3-req" },
    update: {},
    create: {
      id: "sc3-req",
      clientId: tata.id,
      siteId: siteTata.id,
      participants: 15,
      status: "CONFIRMEE",
      themes: { create: { themeId: themeSST.id } },
    },
  });

  await prisma.trainingSession.upsert({
    where: { id: "sc3-session" },
    update: {},
    create: {
      id: "sc3-session",
      requestId: req3.id,
      trainerId: trainer.id,
      themeId: themeSST.id,
      startDate: addDays(now, 10),
      endDate: addDays(now, 11),
      status: "PROVISOIRE",
      trainerConfirmed: true,
      clientConfirmed: false,
      totalCost: 4800,
      costBreakdown: { honoraires: 3600, transport: 600, hotel: 0, perDiem: 600, consommables: 0, total: 4800 },
    },
  });
  console.log("  ✓ Scénario 3 — Session PROVISOIRE : TATA SST dans 10 jours (formateur ✓, client ✗)");

  // ══════════════════════════════════════════════════════════════════
  // SCÉNARIO 4 — Session confirmée dans 5 jours
  // ══════════════════════════════════════════════════════════════════
  const req4 = await prisma.trainingRequest.upsert({
    where: { id: "sc4-req" },
    update: {},
    create: {
      id: "sc4-req",
      clientId: hutchinson.id,
      siteId: siteBouskoura.id,
      participants: 10,
      status: "CONFIRMEE",
      themes: { create: { themeId: themePEMP.id } },
    },
  });

  await prisma.trainingSession.upsert({
    where: { id: "sc4-session" },
    update: {},
    create: {
      id: "sc4-session",
      requestId: req4.id,
      trainerId: trainer.id,
      themeId: themePEMP.id,
      startDate: addDays(now, 5),
      endDate: addDays(now, 6),
      status: "CONFIRMEE",
      trainerConfirmed: true,
      clientConfirmed: true,
      totalCost: 4200,
      costBreakdown: { honoraires: 3600, transport: 300, hotel: 0, perDiem: 300, consommables: 0, total: 4200 },
    },
  });
  console.log("  ✓ Scénario 4 — Session CONFIRMÉE : HUTCHINSON PEMP dans 5 jours (les deux ✓)");

  // ══════════════════════════════════════════════════════════════════
  // SCÉNARIO 5 — Session terminée il y a 3 jours, rapport attendu + hôtel
  // ══════════════════════════════════════════════════════════════════
  const req5 = await prisma.trainingRequest.upsert({
    where: { id: "sc5-req" },
    update: {},
    create: {
      id: "sc5-req",
      clientId: cimentMaroc.id,
      siteId: siteSafi.id,
      participants: 20,
      status: "CONFIRMEE",
      themes: { create: { themeId: themeCAC.id } },
    },
  });

  const session5 = await prisma.trainingSession.upsert({
    where: { id: "sc5-session" },
    update: {},
    create: {
      id: "sc5-session",
      requestId: req5.id,
      trainerId: trainer.id,
      themeId: themeCAC.id,
      startDate: addDays(now, -3),
      endDate: addDays(now, -1),
      status: "CONFIRMEE",
      trainerConfirmed: true,
      clientConfirmed: true,
      totalCost: 8500,
      costBreakdown: { honoraires: 5400, transport: 0, hotel: 1350, perDiem: 900, consommables: 850, total: 8500 },
    },
  });

  await prisma.hotelBooking.upsert({
    where: { id: "sc5-hotel" },
    update: {},
    create: {
      id: "sc5-hotel",
      sessionId: session5.id,
      hotelName: "Ibis Safi",
      city: "Safi",
      checkIn: addDays(now, -3),
      checkOut: addDays(now, -1),
      cost: 900,
      status: "CONFIRME",
    },
  });

  await prisma.trainingReport.upsert({
    where: { id: "sc5-report" },
    update: {},
    create: {
      id: "sc5-report",
      sessionId: session5.id,
      status: "ATTENDU",
    },
  });
  console.log("  ✓ Scénario 5 — Session terminée + hôtel : CIMENT DU MAROC Safi — rapport ATTENDU");

  // ══════════════════════════════════════════════════════════════════
  // SCÉNARIO 6 — Rapport reçu du formateur, à corriger
  // ══════════════════════════════════════════════════════════════════
  const req6 = await prisma.trainingRequest.upsert({
    where: { id: "sc6-req" },
    update: {},
    create: {
      id: "sc6-req",
      clientId: casatram.id,
      siteId: siteCasatram.id,
      participants: 6,
      status: "CONFIRMEE",
      themes: { create: { themeId: themeVR.id } },
    },
  });

  const session6 = await prisma.trainingSession.upsert({
    where: { id: "sc6-session" },
    update: {},
    create: {
      id: "sc6-session",
      requestId: req6.id,
      trainerId: trainer.id,
      themeId: themeVR.id,
      startDate: addDays(now, -8),
      endDate: addDays(now, -8),
      status: "CONFIRMEE",
      trainerConfirmed: true,
      clientConfirmed: true,
      totalCost: 2800,
      costBreakdown: { honoraires: 1800, transport: 600, hotel: 0, perDiem: 300, consommables: 100, total: 2800 },
    },
  });

  await prisma.trainingReport.upsert({
    where: { id: "sc6-report" },
    update: {},
    create: {
      id: "sc6-report",
      sessionId: session6.id,
      status: "RECU",
      rawFromTrainer:
        "Formation VR Sécurité — CASATRAM — Casablanca\n" +
        "Date : " + addDays(now, -8).toLocaleDateString("fr-MA") + "\n" +
        "Participants présents : 6/6\n\n" +
        "Déroulement : Accueil 8h30. Théorie 9h-11h. Exercices VR 11h-13h (simulation incendie, chute de hauteur).\n" +
        "Évaluation finale 14h-16h.\n\n" +
        "Résultats :\n" +
        "- Ahmed K. : 17/20 — Admis\n- Fatima L. : 15/20 — Admis\n- Youssef M. : 18/20 — Admis\n" +
        "- Sara B. : 12/20 — Admis\n- Rachid A. : 16/20 — Admis\n- Nadia H. : 14/20 — Admis\n\n" +
        "Observations : Très bonne participation. Matériel VR en bon état. Recommande recyclage dans 12 mois.",
    },
  });
  console.log("  ✓ Scénario 6 — Rapport REÇU : CASATRAM VR — prêt à corriger");

  // ══════════════════════════════════════════════════════════════════
  // SCÉNARIO 7 — Session annulée
  // ══════════════════════════════════════════════════════════════════
  const req7 = await prisma.trainingRequest.upsert({
    where: { id: "sc7-req" },
    update: {},
    create: {
      id: "sc7-req",
      clientId: vivoEnergy.id,
      siteId: siteVivoRabat.id,
      participants: 5,
      status: "ANNULEE",
      themes: { create: { themeId: themeSST.id } },
    },
  });

  await prisma.trainingSession.upsert({
    where: { id: "sc7-session" },
    update: {},
    create: {
      id: "sc7-session",
      requestId: req7.id,
      trainerId: trainer.id,
      themeId: themeSST.id,
      startDate: addDays(now, 20),
      endDate: addDays(now, 21),
      status: "ANNULEE",
      trainerConfirmed: false,
      clientConfirmed: false,
      notes: "Annulée — client a reporté pour cause d'audit interne.",
    },
  });
  console.log("  ✓ Scénario 7 — Session ANNULÉE : VIVO ENERGY Rabat");

  // ══════════════════════════════════════════════════════════════════
  // SCÉNARIO 8 — Alertes stock
  // ══════════════════════════════════════════════════════════════════
  await prisma.consumable.updateMany({
    where: { label: "Support de cours CACES" },
    data: { stockQty: 5 },
  });
  await prisma.consumable.updateMany({
    where: { label: "Attestation vierge CCE LOG" },
    data: { stockQty: 30 },
  });
  console.log("  ✓ Scénario 8 — 2 consommables sous le seuil (alertes stock)");

  // ══════════════════════════════════════════════════════════════════
  // SCÉNARIO 9 — Historique : session passée, rapport corrigé prêt à envoyer
  // ══════════════════════════════════════════════════════════════════
  const req9 = await prisma.trainingRequest.upsert({
    where: { id: "sc9-req" },
    update: {},
    create: {
      id: "sc9-req",
      clientId: hutchinson.id,
      siteId: siteBouskoura.id,
      participants: 8,
      status: "CONFIRMEE",
      themes: { create: { themeId: themeCAC.id } },
    },
  });

  const session9 = await prisma.trainingSession.upsert({
    where: { id: "sc9-session" },
    update: {},
    create: {
      id: "sc9-session",
      requestId: req9.id,
      trainerId: trainer.id,
      themeId: themeCAC.id,
      startDate: addDays(now, -30),
      endDate: addDays(now, -28),
      status: "CONFIRMEE",
      trainerConfirmed: true,
      clientConfirmed: true,
      totalCost: 6200,
      costBreakdown: { honoraires: 5400, transport: 300, hotel: 0, perDiem: 300, consommables: 200, total: 6200 },
    },
  });

  await prisma.trainingReport.upsert({
    where: { id: "sc9-report" },
    update: {},
    create: {
      id: "sc9-report",
      sessionId: session9.id,
      status: "CORRIGE",
      rawFromTrainer: "Rapport brut HUTCHINSON CACES R489 — 8 participants, tous admis.",
      finalFileUrl: null,
    },
  });
  console.log("  ✓ Scénario 9 — Rapport CORRIGÉ : HUTCHINSON CACES (prêt à envoyer au client)");

  console.log("\n✅ 9 scénarios créés !\n");
  console.log("📋 Ce que tu vas voir dans l'app :");
  console.log("   Tableau de bord : 2 alertes stock · 2 rapports en attente · 1 session provisoire");
  console.log("   Demandes        : 1 NOUVELLE (urgence 3) · 1 EN_RECHERCHE");
  console.log("   Sessions        : 1 CONFIRMÉE (J+5) · 1 PROVISOIRE (J+10) · 1 ANNULÉE");
  console.log("   Rapports        : 1 ATTENDU · 1 REÇU (avec texte formateur) · 1 CORRIGÉ");
}

main()
  .catch((e) => { console.error("❌", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
