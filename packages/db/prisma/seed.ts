import { PrismaClient, Category, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Démarrage du seeding CCE LOG...");

  // ── Config app ──────────────────────────────────────────────────
  await prisma.appConfig.upsert({
    where: { key: "hotel_distance_threshold_km" },
    update: {},
    create: { key: "hotel_distance_threshold_km", value: "150" },
  });

  await prisma.appConfig.upsert({
    where: { key: "max_consecutive_sessions" },
    update: {},
    create: { key: "max_consecutive_sessions", value: "3" },
  });

  await prisma.appConfig.upsert({
    where: { key: "distance_cache_days" },
    update: {},
    create: { key: "distance_cache_days", value: "30" },
  });

  // ── Thèmes ──────────────────────────────────────────────────────
  const themes = [
    { code: "CACES_R482", label: "CACES R482 — Engins de chantier", category: Category.CACES, durationDays: 3 },
    { code: "CACES_R484", label: "CACES R484 — Ponts roulants et portiques", category: Category.CACES, durationDays: 2 },
    { code: "CACES_R485", label: "CACES R485 — Chariots de manutention tout terrain", category: Category.CACES, durationDays: 2 },
    { code: "CACES_R486", label: "CACES R486 — Plateformes élévatrices mobiles de personnel", category: Category.CACES, durationDays: 2 },
    { code: "CACES_R489", label: "CACES R489 — Chariots élévateurs à conducteur porté", category: Category.CACES, durationDays: 3 },
    { code: "VR_SECURITE", label: "Sécurité industrielle en Réalité Virtuelle", category: Category.VR, durationDays: 1 },
    { code: "VR_RISQUES", label: "Gestion des risques en Réalité Virtuelle", category: Category.VR, durationDays: 1 },
    { code: "SST", label: "Sauveteur-Secouriste du Travail (SST)", category: Category.SECOURISME, durationDays: 2 },
    { code: "SECURITE_INCENDIE", label: "Sécurité incendie — Équipier de première intervention", category: Category.SECURITE, durationDays: 1 },
    { code: "TRAVAIL_HAUTEUR", label: "Travail en hauteur — Prévention des chutes", category: Category.SECURITE, durationDays: 1 },
    { code: "HABILITATION_ELEC", label: "Habilitation électrique — Exécutant et chargé de travaux", category: Category.SECURITE, durationDays: 2 },
  ];

  for (const theme of themes) {
    await prisma.theme.upsert({
      where: { code: theme.code },
      update: theme,
      create: theme,
    });
  }
  console.log(`  ✓ ${themes.length} thèmes créés`);

  // ── Consommables ─────────────────────────────────────────────────
  const consumables = [
    { label: "Stylo CCE LOG", unit: "pièce", stockQty: 200, reorderAt: 50, unitCost: 3 },
    { label: "Bloc-notes A4 CCE LOG", unit: "pièce", stockQty: 100, reorderAt: 20, unitCost: 15 },
    { label: "Support de cours CACES", unit: "exemplaire", stockQty: 50, reorderAt: 10, unitCost: 25 },
    { label: "Fiche d'évaluation", unit: "feuille", stockQty: 500, reorderAt: 100, unitCost: 0.5 },
    { label: "Liste de présence", unit: "feuille", stockQty: 200, reorderAt: 50, unitCost: 0.5 },
    { label: "Stylo rouge (correction)", unit: "pièce", stockQty: 50, reorderAt: 10, unitCost: 4 },
    { label: "Chemise cartonnée", unit: "pièce", stockQty: 100, reorderAt: 20, unitCost: 5 },
    { label: "Attestation vierge CCE LOG", unit: "feuille", stockQty: 300, reorderAt: 50, unitCost: 8 },
    { label: "Badge participant", unit: "pièce", stockQty: 150, reorderAt: 30, unitCost: 6 },
    { label: "Café/thé (collation)", unit: "set", stockQty: 50, reorderAt: 10, unitCost: 30 },
  ];

  for (const consumable of consumables) {
    await prisma.consumable.upsert({
      where: { id: consumable.label },
      update: consumable,
      create: consumable,
    });
  }
  console.log(`  ✓ ${consumables.length} consommables créés`);

  // ── Matériels ────────────────────────────────────────────────────
  const materials = [
    { label: "Casque VR Oculus Quest 2 — #001", category: "VR", serial: "VR-001" },
    { label: "Casque VR Oculus Quest 2 — #002", category: "VR", serial: "VR-002" },
    { label: "Casque VR Oculus Quest 2 — #003", category: "VR", serial: "VR-003" },
    { label: "Casque VR Oculus Quest 2 — #004", category: "VR", serial: "VR-004" },
    { label: "Vidéoprojecteur Epson — #001", category: "Projecteur", serial: "PROJ-001" },
    { label: "Vidéoprojecteur Epson — #002", category: "Projecteur", serial: "PROJ-002" },
    { label: "Écran de projection portable", category: "Projecteur", serial: "ECRAN-001" },
    { label: "Extincteur de démonstration CO2", category: "Extincteur", serial: "EXT-CO2-001" },
    { label: "Extincteur de démonstration poudre", category: "Extincteur", serial: "EXT-POUD-001" },
    { label: "Harnais sécurité — #001", category: "EPI", serial: "HARN-001" },
    { label: "Harnais sécurité — #002", category: "EPI", serial: "HARN-002" },
    { label: "Chariot élévateur formation (simulateur)", category: "Simulation", serial: "SIM-CACES-001" },
    { label: "PC portable formateur", category: "Informatique", serial: "PC-FORM-001" },
    { label: "Tableau blanc portable", category: "Enseignement", serial: "TBL-001" },
  ];

  for (const material of materials) {
    await prisma.material.upsert({
      where: { id: material.serial ?? material.label },
      update: material,
      create: material,
    });
  }
  console.log(`  ✓ ${materials.length} matériels créés`);

  // ── Clients ──────────────────────────────────────────────────────
  const clients = [
    {
      name: "HUTCHINSON BOUSKOURA",
      sites: [{ label: "Hutchinson Bouskoura", address: "Zone Industrielle, Bouskoura", city: "Bouskoura", latitude: 33.3719, longitude: -7.6497 }],
    },
    {
      name: "CIMENT DU MAROC",
      sites: [
        { label: "Ciment du Maroc — Aït Baha", address: "Route d'Agadir, Aït Baha", city: "Aït Baha", latitude: 29.9723, longitude: -9.1623 },
        { label: "Ciment du Maroc — Safi", address: "Zone Industrielle, Safi", city: "Safi", latitude: 32.2994, longitude: -9.2372 },
      ],
    },
    {
      name: "CASATRAM",
      sites: [{ label: "Casatram — Casablanca", address: "Boulevard Zerktouni, Casablanca", city: "Casablanca", latitude: 33.5731, longitude: -7.5898 }],
    },
    {
      name: "TATA",
      sites: [{ label: "TATA Groupe — Casablanca", address: "Zone Industrielle Ain Sebaâ, Casablanca", city: "Casablanca", latitude: 33.6063, longitude: -7.5189 }],
    },
    {
      name: "LESAFFRE",
      sites: [{ label: "Lesaffre Maroc — Casablanca", address: "Bd Mohammed Zerktouni, Casablanca", city: "Casablanca", latitude: 33.5856, longitude: -7.6188 }],
    },
    {
      name: "INGELEC",
      sites: [{ label: "INGELEC — Casablanca", address: "Quartier Industriel, Casablanca", city: "Casablanca", latitude: 33.5731, longitude: -7.5898 }],
    },
    {
      name: "SALAM GAZ",
      sites: [{ label: "Salam Gaz — Casablanca", address: "Zone Industrielle, Casablanca", city: "Casablanca", latitude: 33.5731, longitude: -7.5898 }],
    },
    {
      name: "AEOLON",
      sites: [{ label: "Aeolon — Tanger", address: "Zone Franche Tanger Med", city: "Tanger", latitude: 35.7580, longitude: -5.8339 }],
    },
    {
      name: "AYA GOLD & SILVER",
      sites: [
        { label: "Aya Gold — Zgounder", address: "Mine Zgounder, Aït Baha", city: "Aït Baha", latitude: 30.3667, longitude: -8.6167 },
        { label: "Aya Gold — Nador", address: "Mine Boumadine, Nador", city: "Nador", latitude: 35.1687, longitude: -2.9280 },
      ],
    },
    {
      name: "MAGHREB STEEL",
      sites: [{ label: "Maghreb Steel — Berrechid", address: "Zone Industrielle, Berrechid", city: "Berrechid", latitude: 33.2651, longitude: -7.5860 }],
    },
    {
      name: "VIVO ENERGY",
      sites: [
        { label: "Vivo Energy — Casablanca", address: "Route d'El Jadida, Casablanca", city: "Casablanca", latitude: 33.5731, longitude: -7.5898 },
        { label: "Vivo Energy — Rabat", address: "Zone Industrielle, Rabat", city: "Rabat", latitude: 34.0209, longitude: -6.8416 },
      ],
    },
  ];

  for (const clientData of clients) {
    const client = await prisma.client.upsert({
      where: { id: clientData.name },
      update: { name: clientData.name, normalizedName: clientData.name.toLowerCase() },
      create: { name: clientData.name, normalizedName: clientData.name.toLowerCase() },
    });

    for (const site of clientData.sites) {
      await prisma.clientSite.upsert({
        where: { id: `${client.id}-${site.label}` },
        update: site,
        create: { ...site, clientId: client.id },
      });
    }
  }
  console.log(`  ✓ ${clients.length} clients avec leurs sites créés`);

  // ── Formateurs ───────────────────────────────────────────────────
  const trainers = [
    {
      fullName: "Med Rida",
      phone: "+212600000001",
      email: "medrida@ccelog.com",
      city: "Casablanca",
      latitude: 33.5731,
      longitude: -7.5898,
      themes: ["CACES_R489", "CACES_R486", "CACES_R485", "VR_SECURITE"],
    },
  ];

  for (const trainerData of trainers) {
    const { themes: trainerThemes, ...rest } = trainerData;
    const trainer = await prisma.trainer.upsert({
      where: { id: rest.phone },
      update: rest,
      create: rest,
    });

    for (const themeCode of trainerThemes) {
      const theme = await prisma.theme.findUnique({ where: { code: themeCode } });
      if (theme) {
        await prisma.trainerTheme.upsert({
          where: { trainerId_themeId: { trainerId: trainer.id, themeId: theme.id } },
          update: {},
          create: { trainerId: trainer.id, themeId: theme.id },
        });
      }
    }
  }
  console.log(`  ✓ ${trainers.length} formateurs créés`);

  // ── Hôtels partenaires ───────────────────────────────────────────
  const hotels = [
    { name: "Ibis Casablanca Centre", city: "Casablanca", priceMin: 400, priceMax: 600 },
    { name: "Ibis Safi", city: "Safi", priceMin: 350, priceMax: 500 },
    { name: "Hotel Farah Rabat", city: "Rabat", priceMin: 500, priceMax: 800 },
    { name: "Ibis Fès", city: "Fès", priceMin: 380, priceMax: 550 },
    { name: "Hotel Kenzi Farah Marrakech", city: "Marrakech", priceMin: 600, priceMax: 1000 },
    { name: "Ibis Tanger City Center", city: "Tanger", priceMin: 400, priceMax: 650 },
    { name: "Ibis Agadir", city: "Agadir", priceMin: 450, priceMax: 700 },
    { name: "Hotel Tafilalet Errachidia", city: "Errachidia", priceMin: 300, priceMax: 450 },
  ];

  for (const hotel of hotels) {
    await prisma.hotel.upsert({
      where: { id: hotel.name },
      update: hotel,
      create: hotel,
    });
  }
  console.log(`  ✓ ${hotels.length} hôtels partenaires créés`);

  console.log("✅ Seeding terminé avec succès !");
}

main()
  .catch((e) => {
    console.error("❌ Erreur seeding :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
