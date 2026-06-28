import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const mockUpdate = vi.fn();
const mockFindUnique = vi.fn();

vi.mock("@ccelog/db", () => ({
  db: {
    trainingSession: { update: mockUpdate, findUnique: mockFindUnique },
    trainingRequest: { update: mockUpdate },
  },
}));

// Import AFTER mocks are registered
const { validateSessionAction } = await import("./actions");
const { revalidatePath } = await import("next/cache");

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("validateSessionAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passe le statut à VALIDEE_FORMATEUR quand le client n'a pas encore confirmé", async () => {
    mockUpdate.mockResolvedValue({});
    mockFindUnique.mockResolvedValue({ requestId: "req-1", clientConfirmed: false });

    await validateSessionAction("sess-1");

    // 1. Marque trainerConfirmed
    expect(mockUpdate).toHaveBeenNthCalledWith(1, {
      where: { id: "sess-1" },
      data: { trainerConfirmed: true },
    });

    // 2. Avance vers VALIDEE_FORMATEUR (client pas encore confirmé)
    expect(mockUpdate).toHaveBeenNthCalledWith(2, {
      where: { id: "req-1" },
      data: { status: "VALIDEE_FORMATEUR" },
    });

    expect(revalidatePath).toHaveBeenCalledWith("/mes-validations");
  });

  it("passe le statut à EN_ATTENTE_VALIDATION_BO quand les deux parties ont confirmé", async () => {
    mockUpdate.mockResolvedValue({});
    mockFindUnique.mockResolvedValue({ requestId: "req-2", clientConfirmed: true });

    await validateSessionAction("sess-2");

    expect(mockUpdate).toHaveBeenNthCalledWith(2, {
      where: { id: "req-2" },
      data: { status: "EN_ATTENTE_VALIDATION_BO" },
    });
  });

  it("ne plante pas si la session est introuvable", async () => {
    mockUpdate.mockResolvedValue({});
    mockFindUnique.mockResolvedValue(null);

    await expect(validateSessionAction("inexistant")).resolves.toBeUndefined();

    // Seul le premier update (trainerConfirmed) doit avoir été appelé
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
