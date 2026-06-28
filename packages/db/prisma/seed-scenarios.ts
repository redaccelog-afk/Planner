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
  // SCÉNARIOS PRÉPARATEUR (10-14) — File de dossiers à constituer
  // ══════════════════════════════════════════════════════════════════

  // Récupérer les consommables pour les lier aux thèmes
  const consoStylo    = await prisma.consumable.findFirst({ where: { label: "Stylo CCE LOG" } });
  const consoSupport  = await prisma.consumable.findFirst({ where: { label: "Support de cours CACES" } });
  const consoAttest   = await prisma.consumable.findFirst({ where: { label: "Attestation vierge CCE LOG" } });
  const consoListe    = await prisma.consumable.findFirst({ where: { label: "Liste de présence" } });
  const consoBadge    = await prisma.consumable.findFirst({ where: { label: "Badge participant" } });

  // Lier les consommables au thème CACES R489
  if (themeCAC && consoStylo && consoSupport && consoAttest && consoListe && consoBadge) {
    for (const [consumableId, quantity] of [
      [consoStylo.id,   12],
      [consoSupport.id, 12],
      [consoAttest.id,  12],
      [consoListe.id,    2],
      [consoBadge.id,   12],
    ] as [string, number][]) {
      await prisma.themeConsumable.upsert({
        where: { themeId_consumableId: { themeId: themeCAC.id, consumableId } },
        update: { quantity },
        create: { themeId: themeCAC.id, consumableId, quantity },
      });
    }
  }

  // Lier consommables au thème SST
  if (themeSST && consoStylo && consoAttest && consoListe && consoBadge) {
    for (const [consumableId, quantity] of [
      [consoStylo.id,  8],
      [consoAttest.id, 8],
      [consoListe.id,  2],
      [consoBadge.id,  8],
    ] as [string, number][]) {
      await prisma.themeConsumable.upsert({
        where: { themeId_consumableId: { themeId: themeSST.id, consumableId } },
        update: { quantity },
        create: { themeId: themeSST.id, consumableId, quantity },
      });
    }
  }
  console.log("  ✓ Consommables liés aux thèmes CACES R489 et SST");

  // Remettre stock support cours CACES à 3 pour forcer le scénario stock insuffisant
  await prisma.consumable.updateMany({
    where: { label: "Support de cours CACES" },
    data: { stockQty: 3, minStock: 5 },
  });

  // Compte préparateur demo
  const prepUser = await prisma.user.upsert({
    where: { email: "preparateur@ccelog.demo" },
    update: {},
    create: { email: "preparateur@ccelog.demo", name: "Préparateur Demo", role: "PREPARATEUR" },
  });

  // SCÉNARIO 10 — Dossier EN_ATTENTE, stock OK, J-7
  const req10 = await prisma.trainingRequest.upsert({
    where: { id: "sc10-req" },
    update: {},
    create: {
      id: "sc10-req",
      clientId: hutchinson.id,
      siteId: siteBouskoura.id,
      participants: 8,
      status: "CONFIRMEE",
      themes: { create: { themeId: themeSST.id } },
    },
  });
  await prisma.trainingSession.upsert({
    where: { id: "sc10-session" },
    update: {},
    create: {
      id: "sc10-session",
      requestId: req10.id,
      trainerId: trainer.id,
      themeId: themeSST.id,
      startDate: addDays(now, 7),
      endDate: addDays(now, 8),
      status: "CONFIRMEE",
      trainerConfirmed: true,
      clientConfirmed: true,
      totalCost: 3200,
      costBreakdown: { honoraires: 2400, transport: 400, hotel: 0, perDiem: 400, consommables: 0, total: 3200 },
    },
  });
  console.log("  ✓ Scénario 10 — PRÉPARATEUR : dossier EN_ATTENTE (stock OK) · HUTCHINSON SST dans 7j");

  // SCÉNARIO 11 — Dossier EN_ATTENTE, stock INSUFFISANT (support cours CACES = 3, besoin 12), J-5
  const req11 = await prisma.trainingRequest.upsert({
    where: { id: "sc11-req" },
    update: {},
    create: {
      id: "sc11-req",
      clientId: cimentMaroc.id,
      siteId: siteSafi.id,
      participants: 12,
      status: "CONFIRMEE",
      themes: { create: { themeId: themeCAC.id } },
    },
  });
  await prisma.trainingSession.upsert({
    where: { id: "sc11-session" },
    update: {},
    create: {
      id: "sc11-session",
      requestId: req11.id,
      trainerId: trainer.id,
      themeId: themeCAC.id,
      startDate: addDays(now, 5),
      endDate: addDays(now, 7),
      status: "CONFIRMEE",
      trainerConfirmed: true,
      clientConfirmed: true,
      totalCost: 6800,
      costBreakdown: { honoraires: 5400, transport: 600, hotel: 0, perDiem: 800, consommables: 0, total: 6800 },
    },
  });
  console.log("  ✓ Scénario 11 — PRÉPARATEUR : dossier EN_ATTENTE (stock INSUFFISANT 🔴) · CIMENT DU MAROC CACES R489 dans 5j");

  // SCÉNARIO 12 — Dossier EN_PREPARATION (déjà commencé), J-3
  const req12 = await prisma.trainingRequest.upsert({
    where: { id: "sc12-req" },
    update: {},
    create: {
      id: "sc12-req",
      clientId: casatram.id,
      siteId: siteCasatram.id,
      participants: 6,
      status: "CONFIRMEE",
      themes: { create: { themeId: themeSST.id } },
    },
  });
  const session12 = await prisma.trainingSession.upsert({
    where: { id: "sc12-session" },
    update: {},
    create: {
      id: "sc12-session",
      requestId: req12.id,
      trainerId: trainer.id,
      themeId: themeSST.id,
      startDate: addDays(now, 3),
      endDate: addDays(now, 4),
      status: "CONFIRMEE",
      trainerConfirmed: true,
      clientConfirmed: true,
      totalCost: 2400,
      costBreakdown: { honoraires: 1800, transport: 300, hotel: 0, perDiem: 300, consommables: 0, total: 2400 },
    },
  });
  await prisma.dossierFormation.upsert({
    where: { sessionId: "sc12-session" },
    update: {},
    create: {
      sessionId: session12.id,
      status: "EN_PREPARATION",
      preparerId: prepUser.id,
    },
  });
  console.log("  ✓ Scénario 12 — PRÉPARATEUR : dossier EN_PREPARATION · CASATRAM SST dans 3j");

  // SCÉNARIO 13 — Dossier PRÊT (remise armoire), J-1
  const req13 = await prisma.trainingRequest.upsert({
    where: { id: "sc13-req" },
    update: {},
    create: {
      id: "sc13-req",
      clientId: tata.id,
      siteId: siteTata.id,
      participants: 10,
      status: "CONFIRMEE",
      themes: { create: { themeId: themeSST.id } },
    },
  });
  const session13 = await prisma.trainingSession.upsert({
    where: { id: "sc13-session" },
    update: {},
    create: {
      id: "sc13-session",
      requestId: req13.id,
      trainerId: trainer.id,
      themeId: themeSST.id,
      startDate: addDays(now, 1),
      endDate: addDays(now, 2),
      status: "CONFIRMEE",
      trainerConfirmed: true,
      clientConfirmed: true,
      totalCost: 4000,
      costBreakdown: { honoraires: 3000, transport: 500, hotel: 0, perDiem: 500, consommables: 0, total: 4000 },
    },
  });
  await prisma.dossierFormation.upsert({
    where: { sessionId: "sc13-session" },
    update: {},
    create: {
      sessionId: session13.id,
      status: "PRET",
      preparerId: prepUser.id,
      pickupType: "ARMOIRE",
      pickupDetail: "Casier B3 — couloir stock",
      preparedAt: new Date(),
    },
  });
  console.log("  ✓ Scénario 13 — PRÉPARATEUR : dossier PRÊT (armoire casier B3) · TATA SST demain");

  // SCÉNARIO 14 — Session dans 15j, dossier EN_ATTENTE (délai confortable)
  const req14 = await prisma.trainingRequest.upsert({
    where: { id: "sc14-req" },
    update: {},
    create: {
      id: "sc14-req",
      clientId: vivoEnergy.id,
      siteId: siteVivoRabat.id,
      participants: 8,
      status: "CONFIRMEE",
      themes: { create: { themeId: themeCAC.id } },
    },
  });
  await prisma.trainingSession.upsert({
    where: { id: "sc14-session" },
    update: {},
    create: {
      id: "sc14-session",
      requestId: req14.id,
      trainerId: trainer.id,
      themeId: themeCAC.id,
      startDate: addDays(now, 15),
      endDate: addDays(now, 17),
      status: "CONFIRMEE",
      trainerConfirmed: true,
      clientConfirmed: true,
      totalCost: 5800,
      costBreakdown: { honoraires: 5400, transport: 0, hotel: 0, perDiem: 400, consommables: 0, total: 5800 },
    },
  });
  console.log("  ✓ Scénario 14 — PRÉPARATEUR : dossier EN_ATTENTE · VIVO ENERGY CACES R489 dans 15j");

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

  // ══════════════════════════════════════════════════════════════════
  // MODULE FORMATEURS — 4 formateurs supplémentaires
  // ══════════════════════════════════════════════════════════════════
  const themeSST_inst  = await prisma.theme.findUnique({ where: { code: "SST" } });
  const themeIncendie  = await prisma.theme.findUnique({ where: { code: "SECURITE_INCENDIE" } });
  const themeHauteir   = await prisma.theme.findUnique({ where: { code: "TRAVAIL_HAUTEUR" } });
  const themeHabilElec = await prisma.theme.findUnique({ where: { code: "HABILITATION_ELEC" } });
  const themeR482      = await prisma.theme.findUnique({ where: { code: "CACES_R482" } });
  const themeR484      = await prisma.theme.findUnique({ where: { code: "CACES_R484" } });

  const trainer2 = await prisma.trainer.upsert({
    where: { id: "+212600000002" },
    update: {},
    create: {
      id: "+212600000002",
      type: "INTERNE",
      fullName: "Omar Benali",
      phone: "+212600000002",
      email: "o.benali@ccelog.com",
      city: "Casablanca",
      latitude: 33.5731,
      longitude: -7.5898,
    },
  });
  const trainer3 = await prisma.trainer.upsert({
    where: { id: "+212600000003" },
    update: {},
    create: {
      id: "+212600000003",
      type: "INTERNE",
      fullName: "Fatima Ouali",
      phone: "+212600000003",
      email: "f.ouali@ccelog.com",
      city: "Rabat",
      latitude: 34.0209,
      longitude: -6.8416,
    },
  });
  const trainer4 = await prisma.trainer.upsert({
    where: { id: "+212600000004" },
    update: {},
    create: {
      id: "+212600000004",
      type: "INTERNE",
      fullName: "Youssef Alami",
      phone: "+212600000004",
      email: "y.alami@ccelog.com",
      city: "Casablanca",
      latitude: 33.5731,
      longitude: -7.5898,
    },
  });
  // Formateur EXTERNE pour Achats & Présélection
  const trainer5 = await prisma.trainer.upsert({
    where: { id: "+212600000005" },
    update: {},
    create: {
      id: "+212600000005",
      type: "EXTERNE",
      fullName: "Khalid Nader",
      phone: "+212600000005",
      email: "k.nader@formation-caces.ma",
      city: "Casablanca",
      latitude: 33.5731,
      longitude: -7.5898,
      legalStatus: "auto-entrepreneur",
      ice: "002345678000012",
      iban: "MA64011519000001205000534921",
      bankName: "Attijariwafa Bank",
      defaultDayRate: 2200,
      paymentTerms: 30,
    },
  });

  // Liens thèmes-formateurs
  for (const [trId, thCode] of [
    [trainer2.id, "SST"], [trainer2.id, "SECURITE_INCENDIE"],
    [trainer3.id, "HABILITATION_ELEC"], [trainer3.id, "TRAVAIL_HAUTEUR"],
    [trainer4.id, "CACES_R482"], [trainer4.id, "CACES_R484"],
    [trainer5.id, "CACES_R489"], [trainer5.id, "CACES_R486"],
  ] as [string, string][]) {
    const th = await prisma.theme.findUnique({ where: { code: thCode } });
    if (th) {
      await prisma.trainerTheme.upsert({
        where: { trainerId_themeId: { trainerId: trId, themeId: th.id } },
        update: {},
        create: { trainerId: trId, themeId: th.id },
      });
    }
  }
  console.log("  ✓ Formateurs — 4 formateurs ajoutés (3 INTERNE + 1 EXTERNE)");

  // ══════════════════════════════════════════════════════════════════
  // MODULE PRÉSÉLECTION — 5 candidatures
  // ══════════════════════════════════════════════════════════════════
  // Créer 2 formateurs candidats sans compte
  const candidat1 = await prisma.trainer.upsert({
    where: { id: "+212611000001" },
    update: {},
    create: {
      id: "+212611000001",
      type: "EXTERNE",
      fullName: "Rachid Zaoui",
      phone: "+212611000001",
      email: "r.zaoui@gmail.com",
      city: "Casablanca",
      active: false,
    },
  });
  const candidat2 = await prisma.trainer.upsert({
    where: { id: "+212611000002" },
    update: {},
    create: {
      id: "+212611000002",
      type: "EXTERNE",
      fullName: "Nadia Benkirane",
      phone: "+212611000002",
      email: "nadia.bk@outlook.com",
      city: "Fès",
      active: false,
    },
  });
  const candidat3 = await prisma.trainer.upsert({
    where: { id: "+212611000003" },
    update: {},
    create: {
      id: "+212611000003",
      type: "EXTERNE",
      fullName: "Amine El Fassi",
      phone: "+212611000003",
      email: "a.elfassi@gmail.com",
      city: "Rabat",
      active: false,
    },
  });

  await prisma.preselection.upsert({
    where: { id: "pres-1" },
    update: {},
    create: {
      id: "pres-1",
      trainerId: candidat1.id,
      status: "CANDIDAT",
      source: "candidature",
      cvUrl: null,
    },
  });
  await prisma.preselection.upsert({
    where: { id: "pres-2" },
    update: {},
    create: {
      id: "pres-2",
      trainerId: candidat2.id,
      status: "CANDIDAT",
      source: "recommandation",
    },
  });
  await prisma.preselection.upsert({
    where: { id: "pres-3" },
    update: {},
    create: {
      id: "pres-3",
      trainerId: candidat3.id,
      status: "EN_EVALUATION",
      source: "prospection",
      evaluationScore: 72,
      evaluationNotes: "Bonne maîtrise technique CACES. Manque d'expérience en animation pédagogique. Prévoir un test pratique.",
    },
  });
  // Khalid Nader (trainer5) est ACCEPTÉ avec convention cadre
  await prisma.preselection.upsert({
    where: { id: "pres-4" },
    update: {},
    create: {
      id: "pres-4",
      trainerId: trainer5.id,
      status: "ACCEPTE",
      source: "recommandation",
      evaluationScore: 91,
      evaluationNotes: "Excellent formateur CACES, 12 ans d'expérience, certifié CACES R489/R486.",
      acceptedAt: addDays(now, -90),
    },
  });
  // Candidat refusé
  const candidat4 = await prisma.trainer.upsert({
    where: { id: "+212611000004" },
    update: {},
    create: {
      id: "+212611000004",
      type: "EXTERNE",
      fullName: "Houda Tazi",
      phone: "+212611000004",
      email: "h.tazi@gmail.com",
      city: "Marrakech",
      active: false,
    },
  });
  await prisma.preselection.upsert({
    where: { id: "pres-5" },
    update: {},
    create: {
      id: "pres-5",
      trainerId: candidat4.id,
      status: "REFUSE",
      source: "candidature",
      evaluationScore: 48,
      rejectionReason: "Dossier incomplet — pas de certification CACES valide. CV non conforme aux exigences de l'organisme.",
    },
  });
  console.log("  ✓ Présélection — 5 candidatures (2 CANDIDAT · 1 EN_EVALUATION · 1 ACCEPTE · 1 REFUSE)");

  // ══════════════════════════════════════════════════════════════════
  // MODULE ACHATS — Convention cadre + négociation + prestations
  // ══════════════════════════════════════════════════════════════════
  const framework1 = await prisma.framework.upsert({
    where: { id: "fw-khalid-001" },
    update: {},
    create: {
      id: "fw-khalid-001",
      trainerId: trainer5.id,
      reference: "CC-2025-001",
      signedAt: addDays(now, -90),
      validUntil: addDays(now, 275),
      status: "ACTIF",
      notes: "Convention cadre annuelle — CACES R489 & R486. Renouvellement automatique si pas de résiliation.",
    },
  });
  await prisma.negotiationStep.upsert({
    where: { id: "negot-khalid-001" },
    update: {},
    create: {
      id: "negot-khalid-001",
      trainerId: trainer5.id,
      frameworkId: framework1.id,
      themeId: themeCAC!.id,
      status: "ACCEPTEE",
      proposedRate: 2500,
      counterRate: 2300,
      agreedRate: 2200,
      closedAt: addDays(now, -85),
      notes: "Tarif convenu 2 200 MAD/jour pour CACES R489 et R486.",
    },
  });
  console.log("  ✓ Achats — Convention cadre CC-2025-001 + négociation acceptée (2200 MAD/j)");

  // ══════════════════════════════════════════════════════════════════
  // MODULE ANALYTIQUES — 15 sessions sur 12 mois (historique)
  // ══════════════════════════════════════════════════════════════════
  const maghrebSteel = await prisma.client.findFirst({ where: { name: { contains: "MAGHREB" } } });
  const ingelec      = await prisma.client.findFirst({ where: { name: { contains: "INGELEC" } } });
  const lesaffre     = await prisma.client.findFirst({ where: { name: { contains: "LESAFFRE" } } });
  const salamGaz     = await prisma.client.findFirst({ where: { name: { contains: "SALAM" } } });
  const ayaGold      = await prisma.client.findFirst({ where: { name: { contains: "AYA" } } });

  const siteMaghreb = maghrebSteel ? await prisma.clientSite.findFirst({ where: { clientId: maghrebSteel.id } }) : null;
  const siteIngelec = ingelec      ? await prisma.clientSite.findFirst({ where: { clientId: ingelec.id } })      : null;
  const siteLesaffre = lesaffre    ? await prisma.clientSite.findFirst({ where: { clientId: lesaffre.id } })     : null;
  const siteSalamGaz = salamGaz    ? await prisma.clientSite.findFirst({ where: { clientId: salamGaz.id } })     : null;
  const siteAya      = ayaGold     ? await prisma.clientSite.findFirst({ where: { clientId: ayaGold.id } })      : null;

  type HistEntry = { id: string; clientId: string; siteId: string; trainerId: string; themeId: string; daysAgo: number; duration: number; participants: number; cost: number; honoraires: number };
  const histSessions: HistEntry[] = [
    { id: "hist-1",  clientId: hutchinson.id,  siteId: siteBouskoura!.id, trainerId: trainer.id,  themeId: themeCAC!.id,     daysAgo: 45,  duration: 3, participants: 12, cost: 8400,  honoraires: 5400 },
    { id: "hist-2",  clientId: cimentMaroc.id, siteId: siteSafi!.id,      trainerId: trainer5.id, themeId: themeCAC!.id,     daysAgo: 60,  duration: 3, participants: 15, cost: 9800,  honoraires: 6600 },
    { id: "hist-3",  clientId: casatram.id,    siteId: siteCasatram!.id,  trainerId: trainer2.id, themeId: themeSST!.id,     daysAgo: 75,  duration: 2, participants: 10, cost: 5200,  honoraires: 3600 },
    { id: "hist-4",  clientId: tata.id,        siteId: siteTata!.id,      trainerId: trainer3.id, themeId: themeHabilElec!.id, daysAgo: 90, duration: 2, participants: 8, cost: 4800,  honoraires: 3600 },
    { id: "hist-5",  clientId: vivoEnergy.id,  siteId: siteVivoRabat!.id, trainerId: trainer4.id, themeId: themeR482!.id,    daysAgo: 110, duration: 3, participants: 6,  cost: 6200,  honoraires: 5400 },
    ...(maghrebSteel && siteMaghreb ? [
    { id: "hist-6",  clientId: maghrebSteel.id, siteId: siteMaghreb.id,   trainerId: trainer.id,  themeId: themePEMP!.id,    daysAgo: 130, duration: 2, participants: 10, cost: 5600,  honoraires: 3600 },
    ] : []),
    ...(ingelec && siteIngelec ? [
    { id: "hist-7",  clientId: ingelec.id,      siteId: siteIngelec.id,   trainerId: trainer2.id, themeId: themeIncendie!.id, daysAgo: 150, duration: 1, participants: 20, cost: 3800,  honoraires: 1800 },
    ] : []),
    ...(lesaffre && siteLesaffre ? [
    { id: "hist-8",  clientId: lesaffre.id,      siteId: siteLesaffre.id, trainerId: trainer3.id, themeId: themeHauteir!.id, daysAgo: 170, duration: 1, participants: 15, cost: 3400,  honoraires: 1800 },
    ] : []),
    { id: "hist-9",  clientId: hutchinson.id,  siteId: siteBouskoura!.id, trainerId: trainer5.id, themeId: themeCAC!.id,     daysAgo: 195, duration: 3, participants: 18, cost: 12600, honoraires: 6600 },
    { id: "hist-10", clientId: casatram.id,    siteId: siteCasatram!.id,  trainerId: trainer.id,  themeId: themeVR!.id,      daysAgo: 220, duration: 1, participants: 8,  cost: 3200,  honoraires: 1800 },
    { id: "hist-11", clientId: tata.id,        siteId: siteTata!.id,      trainerId: trainer2.id, themeId: themeSST!.id,     daysAgo: 245, duration: 2, participants: 12, cost: 6000,  honoraires: 3600 },
    { id: "hist-12", clientId: cimentMaroc.id, siteId: siteSafi!.id,      trainerId: trainer4.id, themeId: themeR484!.id,    daysAgo: 270, duration: 2, participants: 10, cost: 5800,  honoraires: 3600 },
    ...(salamGaz && siteSalamGaz ? [
    { id: "hist-13", clientId: salamGaz.id,    siteId: siteSalamGaz.id,   trainerId: trainer3.id, themeId: themeHabilElec!.id, daysAgo: 300, duration: 2, participants: 8, cost: 4600, honoraires: 3600 },
    ] : []),
    { id: "hist-14", clientId: vivoEnergy.id,  siteId: siteVivoRabat!.id, trainerId: trainer5.id, themeId: themeCAC!.id,     daysAgo: 330, duration: 3, participants: 14, cost: 9200,  honoraires: 6600 },
    ...(ayaGold && siteAya ? [
    { id: "hist-15", clientId: ayaGold.id,     siteId: siteAya.id,        trainerId: trainer2.id, themeId: themeSST!.id,     daysAgo: 355, duration: 2, participants: 20, cost: 7800,  honoraires: 3600 },
    ] : []),
  ];

  for (const h of histSessions) {
    const hReq = await prisma.trainingRequest.upsert({
      where: { id: `${h.id}-req` },
      update: {},
      create: {
        id: `${h.id}-req`,
        clientId: h.clientId,
        siteId: h.siteId,
        participants: h.participants,
        status: "CONFIRMEE",
        themes: { create: { themeId: h.themeId } },
      },
    });
    await prisma.trainingSession.upsert({
      where: { id: `${h.id}-session` },
      update: {},
      create: {
        id: `${h.id}-session`,
        requestId: hReq.id,
        trainerId: h.trainerId,
        themeId: h.themeId,
        startDate: addDays(now, -h.daysAgo),
        endDate: addDays(now, -(h.daysAgo - h.duration + 1)),
        status: "CONFIRMEE",
        trainerConfirmed: true,
        clientConfirmed: true,
        totalCost: h.cost,
        costBreakdown: { honoraires: h.honoraires, transport: Math.round((h.cost - h.honoraires) * 0.4), hotel: 0, perDiem: Math.round((h.cost - h.honoraires) * 0.6), consommables: 0, total: h.cost },
      },
    });
  }
  console.log(`  ✓ Analytiques — ${histSessions.length} sessions historiques sur 12 mois`);

  // ══════════════════════════════════════════════════════════════════
  // MODULE ACHATS — Prestations formateur EXTERNE
  // ══════════════════════════════════════════════════════════════════
  // Prestation sur hist-2 (CIMENT, CACES R489, 3j, trainer5)
  await prisma.prestation.upsert({
    where: { sessionId: "hist-2-session" },
    update: {},
    create: {
      sessionId: "hist-2-session",
      trainerId: trainer5.id,
      frameworkId: framework1.id,
      agreedRate: 2200,
      daysCount: 3,
      totalAmount: 6600,
      status: "FACTURE_RECUE",
      poReference: "BDC-2025-001",
      poEmittedAt: addDays(now, -65),
      trainerAcceptedAt: addDays(now, -63),
      invoiceReference: "FACT-K-2025-012",
      invoiceReceivedAt: addDays(now, -55),
      invoiceAmount: 6600,
      coherenceCheck: true,
      coherenceNotes: "Montant facture = BdC. Cohérence vérifiée.",
    },
  });
  // Prestation sur hist-9 (HUTCHINSON, CACES R489, 3j, trainer5) — BdC émis, facture pas encore reçue
  await prisma.prestation.upsert({
    where: { sessionId: "hist-9-session" },
    update: {},
    create: {
      sessionId: "hist-9-session",
      trainerId: trainer5.id,
      frameworkId: framework1.id,
      agreedRate: 2200,
      daysCount: 3,
      totalAmount: 6600,
      status: "BON_COMMANDE_ACCEPTE",
      poReference: "BDC-2025-008",
      poEmittedAt: addDays(now, -200),
      trainerAcceptedAt: addDays(now, -198),
    },
  });
  // Prestation sur hist-14 (VIVO, CACES R489, 3j, trainer5) — payée
  await prisma.prestation.upsert({
    where: { sessionId: "hist-14-session" },
    update: {},
    create: {
      sessionId: "hist-14-session",
      trainerId: trainer5.id,
      frameworkId: framework1.id,
      agreedRate: 2200,
      daysCount: 3,
      totalAmount: 6600,
      status: "PAYE",
      poReference: "BDC-2024-032",
      poEmittedAt: addDays(now, -335),
      trainerAcceptedAt: addDays(now, -333),
      invoiceReference: "FACT-K-2024-041",
      invoiceReceivedAt: addDays(now, -320),
      invoiceAmount: 6600,
      coherenceCheck: true,
      paidAt: addDays(now, -300),
      paymentRef: "VIR-2024-00892",
    },
  });
  console.log("  ✓ Achats — 3 prestations Khalid Nader (FACTURE_RECUE · BON_COMMANDE_ACCEPTE · PAYE)");

  // ══════════════════════════════════════════════════════════════════
  // MODULE FACTURATION — 4 factures clients
  // ══════════════════════════════════════════════════════════════════
  // Facture BROUILLON — HUTCHINSON, basée sur hist-1
  const inv1 = await prisma.invoice.upsert({
    where: { id: "inv-001" },
    update: {},
    create: {
      id: "inv-001",
      clientId: hutchinson.id,
      reference: "FACT-2025-001",
      issueDate: addDays(now, -40),
      dueDate: addDays(now, -10),
      status: "BROUILLON",
      subtotal: 7000,
      taxRate: 0.20,
      taxAmount: 1400,
      total: 8400,
      notes: "Formation CACES R489 · 12 participants · Bouskoura",
    },
  });
  await prisma.invoiceLine.upsert({
    where: { id: "inv-001-line-1" },
    update: {},
    create: {
      id: "inv-001-line-1",
      invoiceId: inv1.id,
      sessionId: "hist-1-session",
      description: "Formation CACES R489 — 3 jours — 12 participants",
      quantity: 1,
      unitPrice: 7000,
      amount: 7000,
    },
  });

  // Facture ENVOYEE — CASATRAM, basée sur hist-3, échéance dans 15j
  const inv2 = await prisma.invoice.upsert({
    where: { id: "inv-002" },
    update: {},
    create: {
      id: "inv-002",
      clientId: casatram.id,
      reference: "FACT-2025-002",
      issueDate: addDays(now, -30),
      dueDate: addDays(now, 15),
      status: "ENVOYEE_CLIENT",
      subtotal: 4333,
      taxRate: 0.20,
      taxAmount: 867,
      total: 5200,
      notes: "Formation SST — 10 participants — Casablanca",
    },
  });
  await prisma.invoiceLine.upsert({
    where: { id: "inv-002-line-1" },
    update: {},
    create: {
      id: "inv-002-line-1",
      invoiceId: inv2.id,
      sessionId: "hist-3-session",
      description: "Formation SST — 2 jours — 10 participants",
      quantity: 1,
      unitPrice: 4333,
      amount: 4333,
    },
  });

  // Facture PAYEE — TATA, basée sur hist-4
  const inv3 = await prisma.invoice.upsert({
    where: { id: "inv-003" },
    update: {},
    create: {
      id: "inv-003",
      clientId: tata.id,
      reference: "FACT-2025-003",
      issueDate: addDays(now, -80),
      dueDate: addDays(now, -50),
      status: "PAYEE",
      subtotal: 4000,
      taxRate: 0.20,
      taxAmount: 800,
      total: 4800,
      paidAt: addDays(now, -52),
      paidAmount: 4800,
      paymentRef: "VIR-2025-00123",
    },
  });
  await prisma.invoiceLine.upsert({
    where: { id: "inv-003-line-1" },
    update: {},
    create: {
      id: "inv-003-line-1",
      invoiceId: inv3.id,
      sessionId: "hist-4-session",
      description: "Formation Habilitation électrique — 2 jours — 8 participants",
      quantity: 1,
      unitPrice: 4000,
      amount: 4000,
    },
  });

  // Facture EN_RETARD — VIVO ENERGY, échéance dépassée, relances envoyées
  const inv4 = await prisma.invoice.upsert({
    where: { id: "inv-004" },
    update: {},
    create: {
      id: "inv-004",
      clientId: vivoEnergy.id,
      reference: "FACT-2024-041",
      issueDate: addDays(now, -320),
      dueDate: addDays(now, -290),
      status: "EN_RETARD",
      subtotal: 7667,
      taxRate: 0.20,
      taxAmount: 1533,
      total: 9200,
      reminderSentJ30: true,
      reminderSentJ45: true,
      reminderSentJ60: true,
      notes: "3 relances envoyées sans réponse. À escalader.",
    },
  });
  await prisma.invoiceLine.upsert({
    where: { id: "inv-004-line-1" },
    update: {},
    create: {
      id: "inv-004-line-1",
      invoiceId: inv4.id,
      sessionId: "hist-14-session",
      description: "Formation CACES R489 — 3 jours — 14 participants",
      quantity: 1,
      unitPrice: 7667,
      amount: 7667,
    },
  });
  console.log("  ✓ Facturation — 4 factures (BROUILLON · ENVOYEE · PAYEE · EN_RETARD)");

  // ══════════════════════════════════════════════════════════════════
  // MODULE PARTICIPANTS — session sc4 (HUTCHINSON PEMP, 10 participants)
  // ══════════════════════════════════════════════════════════════════
  const participantsData = [
    { nom: "BENCHEKROUN", prenom: "Khalid",   cin: "BE123456", noteTheo: 17, notePrat: 16, present: true,  appr: "Très bien" },
    { nom: "AMRANI",      prenom: "Fatima",   cin: "AB234567", noteTheo: 15, notePrat: 14, present: true,  appr: "Bien" },
    { nom: "TAZI",        prenom: "Youssef",  cin: "TZ345678", noteTheo: 18, notePrat: 18, present: true,  appr: "Excellent" },
    { nom: "BENBRAHIM",   prenom: "Sara",     cin: "BB456789", noteTheo: 12, notePrat: 11, present: true,  appr: "Passable" },
    { nom: "CHERKAOUI",   prenom: "Rachid",   cin: "CB567890", noteTheo: 16, notePrat: 15, present: true,  appr: "Bien" },
    { nom: "EL MANSOURI", prenom: "Nadia",    cin: "EM678901", noteTheo: 14, notePrat: 13, present: true,  appr: "Bien" },
    { nom: "HAJJI",       prenom: "Mohamed",  cin: "HM789012", noteTheo: 19, notePrat: 18, present: true,  appr: "Excellent" },
    { nom: "OUALI",       prenom: "Houda",    cin: "OH890123", noteTheo: 13, notePrat: 12, present: true,  appr: "Passable" },
    { nom: "SLIMANI",     prenom: "Ahmed",    cin: "SA901234", noteTheo: 0,  notePrat: 0,  present: false, appr: "Absent" },
    { nom: "ZEROUAL",     prenom: "Layla",    cin: "ZL012345", noteTheo: 15, notePrat: 16, present: true,  appr: "Bien" },
  ];
  for (const p of participantsData) {
    await prisma.participant.upsert({
      where: { id: `sc4-part-${p.cin}` },
      update: {},
      create: {
        id: `sc4-part-${p.cin}`,
        sessionId: "sc4-session",
        nom: p.nom,
        prenom: p.prenom,
        cin: p.cin,
        present: p.present,
        noteTheorique: p.noteTheo > 0 ? p.noteTheo : null,
        notePratique: p.notePrat > 0 ? p.notePrat : null,
        appreciation: p.appr,
        remarque: p.present ? null : "Absent justifié — congé maladie",
      },
    });
  }
  console.log(`  ✓ Participants — ${participantsData.length} participants sur session sc4 (9 présents · 1 absent)`);

  // ══════════════════════════════════════════════════════════════════
  // MODULE STOCK — Historique de mouvements
  // ══════════════════════════════════════════════════════════════════
  const consoStyloM  = await prisma.consumable.findFirst({ where: { label: "Stylo CCE LOG" } });
  const consoBadgeM  = await prisma.consumable.findFirst({ where: { label: "Badge participant" } });
  const consoAttestM = await prisma.consumable.findFirst({ where: { label: "Attestation vierge CCE LOG" } });

  if (consoStyloM) {
    await prisma.stockMovement.createMany({
      skipDuplicates: true,
      data: [
        { id: "sm-1", consumableId: consoStyloM.id, quantity: 100, reason: "reapprovisionnement", balanceAfter: 300, createdAt: addDays(now, -120) },
        { id: "sm-2", consumableId: consoStyloM.id, quantity: -12, reason: "session:hist-1-session", balanceAfter: 288, createdAt: addDays(now, -45) },
        { id: "sm-3", consumableId: consoStyloM.id, quantity: -15, reason: "session:hist-2-session", balanceAfter: 273, createdAt: addDays(now, -60) },
        { id: "sm-4", consumableId: consoStyloM.id, quantity: -10, reason: "session:hist-3-session", balanceAfter: 263, createdAt: addDays(now, -75) },
      ],
    });
  }
  if (consoBadgeM) {
    await prisma.stockMovement.createMany({
      skipDuplicates: true,
      data: [
        { id: "sm-5", consumableId: consoBadgeM.id, quantity: 50,  reason: "reapprovisionnement", balanceAfter: 200, createdAt: addDays(now, -150) },
        { id: "sm-6", consumableId: consoBadgeM.id, quantity: -12, reason: "session:hist-1-session", balanceAfter: 188, createdAt: addDays(now, -45) },
        { id: "sm-7", consumableId: consoBadgeM.id, quantity: -8,  reason: "session:hist-3-session", balanceAfter: 180, createdAt: addDays(now, -75) },
      ],
    });
  }
  if (consoAttestM) {
    await prisma.stockMovement.createMany({
      skipDuplicates: true,
      data: [
        { id: "sm-8",  consumableId: consoAttestM.id, quantity: 100, reason: "reapprovisionnement", balanceAfter: 330, createdAt: addDays(now, -180) },
        { id: "sm-9",  consumableId: consoAttestM.id, quantity: -12, reason: "session:hist-1-session", balanceAfter: 318, createdAt: addDays(now, -45) },
        { id: "sm-10", consumableId: consoAttestM.id, quantity: -15, reason: "session:hist-2-session", balanceAfter: 303, createdAt: addDays(now, -60) },
        { id: "sm-11", consumableId: consoAttestM.id, quantity: -18, reason: "session:hist-9-session", balanceAfter: 285, createdAt: addDays(now, -195) },
        { id: "sm-12", consumableId: consoAttestM.id, quantity: -14, reason: "session:hist-14-session", balanceAfter: 271, createdAt: addDays(now, -330) },
      ],
    });
  }
  console.log("  ✓ Stock — 12 mouvements historiques (entrées réapprovisionnement + sorties sessions)");

  // ══════════════════════════════════════════════════════════════════
  // MODULE PIPELINE — 3 demandes en cours de traitement
  // ══════════════════════════════════════════════════════════════════
  await prisma.demandePipeline.upsert({
    where: { id: "pipe-001" },
    update: {},
    create: {
      id: "pipe-001",
      channel: "EMAIL",
      rawMessage: "Bonjour, nous souhaitons organiser une formation CACES R489 pour nos caristes (environ 10 personnes) au mois de juillet. Pouvez-vous nous faire une proposition ? Cordialement, Direction HSE SALAM GAZ.",
      fromAddress: "hse@salamgaz.ma",
      fromName: "Direction HSE SALAM GAZ",
      status: "PARSED",
      parsedThemeCode: "CACES_R489",
      parsedThemeLabel: "CACES R489",
      parsedParticipants: 10,
      parsedClientName: "SALAM GAZ",
      parsedSiteCity: "Casablanca",
      parsedUrgency: 1,
      aiConfidence: 0.87,
      parsedAt: addDays(now, -1),
      notes: "Demande reçue par email. IA a extrait CACES R489, 10 participants. En attente validation planificateur.",
    },
  });
  await prisma.demandePipeline.upsert({
    where: { id: "pipe-002" },
    update: {},
    create: {
      id: "pipe-002",
      channel: "WHATSAPP",
      rawMessage: "Salam, on a besoin d'une formation SST pour 8 personnes. Urgence car audit début du mois. INGELEC Casablanca. Merci",
      fromAddress: "+212661009000",
      fromName: "INGELEC HSE",
      status: "CONTACTING_TRAINER",
      parsedThemeCode: "SST",
      parsedThemeLabel: "Sauveteur-Secouriste du Travail",
      parsedParticipants: 8,
      parsedClientName: "INGELEC",
      parsedSiteCity: "Casablanca",
      parsedUrgency: 3,
      aiConfidence: 0.92,
      parsedAt: addDays(now, -2),
      trainerContactedAt: addDays(now, -1),
      notes: "Urgence 3 — audit imminent. Formateur Omar Benali contacté via WhatsApp, attente réponse.",
    },
  });
  await prisma.demandePipeline.upsert({
    where: { id: "pipe-003" },
    update: {},
    create: {
      id: "pipe-003",
      channel: "EMAIL",
      rawMessage: "Veuillez prendre note de notre demande de formation habilitation électrique pour 6 techniciens. Site de Berrechid. Planning souhaité : semaine 28.",
      fromAddress: "formation@maghrebsteel.ma",
      fromName: "Formation MAGHREB STEEL",
      status: "COMPLETED",
      parsedThemeCode: "HABILITATION_ELEC",
      parsedThemeLabel: "Habilitation électrique",
      parsedParticipants: 6,
      parsedClientName: "MAGHREB STEEL",
      parsedSiteCity: "Berrechid",
      parsedUrgency: 1,
      aiConfidence: 0.95,
      parsedAt: addDays(now, -30),
      trainerContactedAt: addDays(now, -28),
      clientNotifiedAt: addDays(now, -25),
      confirmedAt: addDays(now, -20),
      requestId: "hist-13-req",
    },
  });
  console.log("  ✓ Pipeline — 3 demandes (PARSED · CONTACTING_TRAINER · COMPLETED)");

  // ══════════════════════════════════════════════════════════════════
  // MODULE NOTIFICATIONS — 5 notifications in-app
  // ══════════════════════════════════════════════════════════════════
  const planifUser = await prisma.user.upsert({
    where: { email: "planificateur@ccelog.demo" },
    update: {},
    create: { email: "planificateur@ccelog.demo", name: "Planificateur Demo", role: "PLANIFICATEUR" },
  });

  await prisma.notification.createMany({
    skipDuplicates: true,
    data: [
      {
        id: "notif-1",
        sessionId: "sc4-session",
        type: "RAPPEL_J7_CLIENT",
        status: "EN_ATTENTE",
        scheduledAt: now,
        channel: "inapp",
        recipient: "client@ccelog.demo",
        payload: { ref: "notif-1-ref", title: "Rappel formation dans 5 jours", body: "Formation CACES R486 HUTCHINSON prévue dans 5 jours." },
      },
      {
        id: "notif-2",
        sessionId: "sc4-session",
        type: "RAPPEL_FORMATEUR",
        status: "EN_ATTENTE",
        scheduledAt: now,
        channel: "inapp",
        recipient: "medrida@ccelog.com",
        payload: { ref: "notif-2-ref", title: "Formation dans 5 jours — CACES R486", body: "Rappel : vous animez CACES R486 HUTCHINSON dans 5 jours." },
      },
      {
        id: "notif-3",
        sessionId: "sc11-session",
        type: "ALERTE_STOCK",
        status: "EN_ATTENTE",
        scheduledAt: now,
        channel: "inapp",
        recipient: planifUser.email,
        payload: { ref: "notif-3-ref", title: "Stock insuffisant — CACES R489 J-5", body: "Support de cours CACES insuffisant pour la session CIMENT DU MAROC dans 5 jours." },
      },
      {
        id: "notif-4",
        sessionId: "sc11-session",
        type: "DOCUMENTS_PRETS",
        status: "EN_ATTENTE",
        scheduledAt: now,
        channel: "inapp",
        recipient: planifUser.email,
        payload: { ref: "notif-4-ref", title: "Dossier à préparer — CACES R489 J-5", body: "La formation CACES R489 CIMENT DU MAROC a lieu dans 5 jours. Dossier à préparer." },
      },
      {
        id: "notif-5",
        type: "RELANCE_PAIEMENT_J60",
        status: "ENVOYEE",
        scheduledAt: addDays(now, -30),
        sentAt: addDays(now, -30),
        channel: "inapp",
        recipient: planifUser.email,
        payload: { ref: "notif-5-ref", invoiceId: "inv-004", title: "Facture impayée J+60 — VIVO ENERGY", body: "La facture FACT-2024-041 (9 200 MAD) est impayée depuis 60 jours." },
      },
    ],
  });
  console.log("  ✓ Notifications — 5 notifications in-app (rappels · alertes stock · relance paiement)");

  // ══════════════════════════════════════════════════════════════════
  // MODULE MES VALIDATIONS — Session en attente de confirmation formateur
  // ══════════════════════════════════════════════════════════════════
  const ingelecClient = ingelec ?? await prisma.client.findFirst({ where: { name: { contains: "INGELEC" } } });
  if (ingelecClient && siteIngelec) {
    const reqVal = await prisma.trainingRequest.upsert({
      where: { id: "scval-req" },
      update: {},
      create: {
        id: "scval-req",
        clientId: ingelecClient.id,
        siteId: siteIngelec.id,
        participants: 8,
        status: "CONFIRMEE",
        themes: { create: { themeId: themeSST!.id } },
      },
    });
    await prisma.trainingSession.upsert({
      where: { id: "scval-session" },
      update: {},
      create: {
        id: "scval-session",
        requestId: reqVal.id,
        trainerId: trainer2.id,
        themeId: themeSST!.id,
        startDate: addDays(now, 12),
        endDate: addDays(now, 13),
        status: "PROVISOIRE",
        trainerConfirmed: false,
        clientConfirmed: true,
        totalCost: 3200,
        costBreakdown: { honoraires: 2400, transport: 400, hotel: 0, perDiem: 400, consommables: 0, total: 3200 },
        notes: "En attente confirmation formateur Omar Benali.",
      },
    });
    console.log("  ✓ Mes validations — 1 session PROVISOIRE en attente validation formateur (Omar Benali · INGELEC SST · J+12)");
  }

  console.log("\n✅ Scénarios complets — tous modules couverts !\n");
  console.log("📋 Modules disponibles dans l'app :");
  console.log("   /dashboard       : KPIs · sessions aujourd'hui/7j · workflow demandes");
  console.log("   /pipeline        : 3 demandes (PARSED · CONTACTING · COMPLETED)");
  console.log("   /demandes        : 1 NOUVELLE urgente · 1 EN_RECHERCHE");
  console.log("   /sessions        : J+5 CONFIRMÉE · J+10 PROVISOIRE · passées (historique)");
  console.log("   /formateurs      : 5 formateurs (4 INTERNE + 1 EXTERNE avec CC active)");
  console.log("   /formateurs/preselection : 5 candidatures (CANDIDAT · EN_EVALUATION · ACCEPTE · REFUSE)");
  console.log("   /stock           : alertes seuil · 12 mouvements historiques");
  console.log("   /dossiers        : 5 dossiers préparateur (EN_ATTENTE · EN_PREP · PRET)");
  console.log("   /facturation     : 4 factures (BROUILLON · ENVOYEE · PAYEE · EN_RETARD)");
  console.log("   /achats          : 3 prestations Khalid Nader + BdC");
  console.log("   /analytiques     : 15 sessions sur 12 mois · courbes CA visibles");
  console.log("   /mes-validations : 1 session PROVISOIRE (formateur non encore confirmé)");
  console.log("   /notifications   : 5 notifications in-app actives");
}

main()
  .catch((e) => { console.error("❌", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
