import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks AVANT les imports du module testé ───────────────────────────
vi.mock("@ccelog/db", () => ({
  db: {
    trainingRequest: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// ── Imports après les mocks ───────────────────────────────────────────
import { updateRequestStatusAction } from "./actions";
import { db } from "@ccelog/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// Réinitialise tous les mocks avant chaque test (évite les appels accumulés)
beforeEach(() => vi.clearAllMocks());

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockFindUnique = db.trainingRequest.findUnique as ReturnType<typeof vi.fn>;
const mockUpdate = db.trainingRequest.update as ReturnType<typeof vi.fn>;
const mockAuditCreate = db.auditLog.create as ReturnType<typeof vi.fn>;
const mockRevalidate = revalidatePath as ReturnType<typeof vi.fn>;

function setupAuth(userId = "user-123") {
  mockAuth.mockResolvedValue({ user: { id: userId, name: "Test Admin" } });
}

function setupRequest(id = "req-1", status = "NOUVELLE") {
  mockFindUnique.mockResolvedValue({ id, status });
  mockUpdate.mockResolvedValue({ id, status });
  mockAuditCreate.mockResolvedValue({});
}

// ─────────────────────────────────────────────────────────────────────
// 1. Authentification
// ─────────────────────────────────────────────────────────────────────

describe("updateRequestStatusAction — authentification", () => {
  it("lève une erreur si non authentifié", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(
      updateRequestStatusAction("req-1", "EN_ATTENTE_VALIDATION_FORMATEUR")
    ).rejects.toThrow("Non authentifié");
  });

  it("lève une erreur si la demande n'existe pas", async () => {
    setupAuth();
    mockFindUnique.mockResolvedValue(null);

    await expect(
      updateRequestStatusAction("req-inexistant", "CONFIRMEE")
    ).rejects.toThrow("Demande introuvable");
  });
});

// ─────────────────────────────────────────────────────────────────────
// 2. Workflow CDC — transitions autorisées
// ─────────────────────────────────────────────────────────────────────

describe("updateRequestStatusAction — transitions autorisées (workflow CDC)", () => {
  beforeEach(() => {
    setupAuth();
    mockUpdate.mockResolvedValue({});
    mockAuditCreate.mockResolvedValue({});
    mockRevalidate.mockReturnValue(undefined);
  });

  const transitionsAutorisees: [string, string][] = [
    // Workflow CDC principal
    ["NOUVELLE",                        "EN_ATTENTE_VALIDATION_FORMATEUR"],
    ["EN_ATTENTE_VALIDATION_FORMATEUR", "VALIDEE_FORMATEUR"],
    ["VALIDEE_FORMATEUR",               "EN_ATTENTE_VALIDATION_BO"],
    ["EN_ATTENTE_VALIDATION_BO",        "CONFIRMEE"],
    ["CONFIRMEE",                       "TERMINEE"],
    // Workflow legacy (rétro-compatibilité)
    ["NOUVELLE",                        "EN_RECHERCHE"],
    ["EN_RECHERCHE",                    "PROPOSEE"],
    ["PROPOSEE",                        "CONFIRMEE"],
    // Annulations depuis tous les états actifs
    ["NOUVELLE",                        "ANNULEE"],
    ["EN_ATTENTE_VALIDATION_FORMATEUR", "ANNULEE"],
    ["VALIDEE_FORMATEUR",               "ANNULEE"],
    ["EN_ATTENTE_VALIDATION_BO",        "ANNULEE"],
    ["CONFIRMEE",                       "ANNULEE"],
  ];

  it.each(transitionsAutorisees)(
    "autorise %s → %s",
    async (from, to) => {
      setupRequest("req-1", from);
      await expect(
        updateRequestStatusAction("req-1", to as Parameters<typeof updateRequestStatusAction>[1])
      ).resolves.not.toThrow();
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "req-1" },
        data: { status: to },
      });
    }
  );
});

// ─────────────────────────────────────────────────────────────────────
// 3. Workflow CDC — transitions interdites
// ─────────────────────────────────────────────────────────────────────

describe("updateRequestStatusAction — transitions interdites", () => {
  beforeEach(() => setupAuth());

  const transitionsInterdites: [string, string][] = [
    // Retour arrière interdit
    ["CONFIRMEE",                       "NOUVELLE"],
    ["VALIDEE_FORMATEUR",               "NOUVELLE"],
    ["EN_ATTENTE_VALIDATION_BO",        "VALIDEE_FORMATEUR"],
    // Sauter des étapes interdit
    ["NOUVELLE",                        "CONFIRMEE"],
    ["NOUVELLE",                        "TERMINEE"],
    ["EN_ATTENTE_VALIDATION_FORMATEUR", "CONFIRMEE"],
    // États terminaux non modifiables
    ["TERMINEE",                        "CONFIRMEE"],
    ["ANNULEE",                         "NOUVELLE"],
    ["CLOTUREE",                        "CONFIRMEE"],
  ];

  it.each(transitionsInterdites)(
    "interdit %s → %s",
    async (from, to) => {
      setupRequest("req-1", from);
      await expect(
        updateRequestStatusAction("req-1", to as Parameters<typeof updateRequestStatusAction>[1])
      ).rejects.toThrow(/non autorisée/);
      expect(mockUpdate).not.toHaveBeenCalled();
    }
  );
});

// ─────────────────────────────────────────────────────────────────────
// 4. Audit log
// ─────────────────────────────────────────────────────────────────────

describe("updateRequestStatusAction — audit log", () => {
  beforeEach(() => {
    setupAuth("admin-99");
    mockUpdate.mockResolvedValue({});
    mockRevalidate.mockReturnValue(undefined);
  });

  it("crée un AuditLog avec before/after corrects", async () => {
    setupRequest("req-audit", "NOUVELLE");

    await updateRequestStatusAction("req-audit", "EN_ATTENTE_VALIDATION_FORMATEUR");

    expect(mockAuditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "admin-99",
        action: "UPDATE",
        entityType: "TrainingRequest",
        entityId: "req-audit",
        before: { status: "NOUVELLE" },
        after: { status: "EN_ATTENTE_VALIDATION_FORMATEUR" },
      }),
    });
  });

  it("crée un AuditLog même si userId est null (session sans user.id)", async () => {
    mockAuth.mockResolvedValue({ user: {} }); // pas d'id
    setupRequest("req-no-user", "NOUVELLE");
    mockUpdate.mockResolvedValue({});

    await updateRequestStatusAction("req-no-user", "EN_ATTENTE_VALIDATION_FORMATEUR");

    expect(mockAuditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: null }),
    });
  });
});

// ─────────────────────────────────────────────────────────────────────
// 5. revalidatePath
// ─────────────────────────────────────────────────────────────────────

describe("updateRequestStatusAction — revalidation", () => {
  beforeEach(() => {
    setupAuth();
    mockUpdate.mockResolvedValue({});
    mockAuditCreate.mockResolvedValue({});
    mockRevalidate.mockReturnValue(undefined);
  });

  it("revalide /demandes et /demandes/[id] après une transition", async () => {
    setupRequest("req-rv", "NOUVELLE");
    await updateRequestStatusAction("req-rv", "EN_ATTENTE_VALIDATION_FORMATEUR");

    expect(mockRevalidate).toHaveBeenCalledWith("/demandes");
    expect(mockRevalidate).toHaveBeenCalledWith("/demandes/req-rv");
    expect(mockRevalidate).toHaveBeenCalledTimes(2);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 6. Cohérence du graphe VALID_TRANSITIONS
// ─────────────────────────────────────────────────────────────────────

describe("VALID_TRANSITIONS — cohérence du graphe d'état", () => {
  // Tous les statuts valides définis dans le CDC + legacy
  const ALL_STATUSES = [
    "NOUVELLE",
    "EN_ATTENTE_VALIDATION_FORMATEUR",
    "VALIDEE_FORMATEUR",
    "EN_ATTENTE_VALIDATION_BO",
    "EN_RECHERCHE",
    "PROPOSEE",
    "CONFIRMEE",
    "TERMINEE",
    "ANNULEE",
    "CLOTUREE",
  ] as const;

  it("TERMINEE, ANNULEE, CLOTUREE sont des états terminaux (aucune transition sortante)", async () => {
    setupAuth();
    const terminaux = ["TERMINEE", "ANNULEE", "CLOTUREE"] as const;

    for (const etat of terminaux) {
      setupRequest("req-x", etat);
      // Toute transition depuis un état terminal doit échouer
      await expect(
        updateRequestStatusAction("req-x", "NOUVELLE")
      ).rejects.toThrow(/non autorisée/);
    }
  });

  it("CONFIRMEE ne peut revenir à NOUVELLE (pas de régression)", async () => {
    setupAuth();
    setupRequest("req-back", "CONFIRMEE");

    await expect(
      updateRequestStatusAction("req-back", "NOUVELLE")
    ).rejects.toThrow(/non autorisée/);
  });

  it("le workflow CDC complet s'exécute sans erreur du début à la fin", async () => {
    setupAuth();
    mockUpdate.mockResolvedValue({});
    mockAuditCreate.mockResolvedValue({});
    mockRevalidate.mockReturnValue(undefined);

    const cheminCDC: Array<Parameters<typeof updateRequestStatusAction>[1]> = [
      "EN_ATTENTE_VALIDATION_FORMATEUR",
      "VALIDEE_FORMATEUR",
      "EN_ATTENTE_VALIDATION_BO",
      "CONFIRMEE",
      "TERMINEE",
    ];

    let statutCourant: string = "NOUVELLE";

    for (const prochainStatut of cheminCDC) {
      mockFindUnique.mockResolvedValue({ id: "req-cdc", status: statutCourant });
      await expect(
        updateRequestStatusAction("req-cdc", prochainStatut)
      ).resolves.not.toThrow();
      statutCourant = prochainStatut;
    }
  });
});
