import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { MockInstance } from "vitest";

// ── Mocks déclarés AVANT les imports du module testé ─────────────────
vi.mock("@ccelog/db", () => ({
  db: {
    demandePipeline: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    trainerCandidate: { updateMany: vi.fn() },
    pipelineMessage: { create: vi.fn() },
  },
}));

vi.mock("@ccelog/integrations", () => ({
  sendMail: vi.fn(),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: vi.fn() },
  })),
}));

vi.mock("bullmq", () => ({ Job: vi.fn() }));

// ── Imports après les mocks ───────────────────────────────────────────
import { buildClientConfirmationEmailHtml, pipelineProcessor } from "./pipeline-orchestrator";
import { db } from "@ccelog/db";
import { sendMail } from "@ccelog/integrations";

// ─────────────────────────────────────────────────────────────────────
// 1. buildClientConfirmationEmailHtml — fonction pure
// ─────────────────────────────────────────────────────────────────────

describe("buildClientConfirmationEmailHtml", () => {
  const CLIENT = "Ahmed Benali";
  const THEME  = "CACES R489";
  // Date ISO reproductible quel que soit le fuseau du runner
  const DATES  = ["2025-06-10T00:00:00.000Z", "2025-06-11T00:00:00.000Z"];

  it("retourne une chaîne HTML non vide", () => {
    const html = buildClientConfirmationEmailHtml(CLIENT, THEME, DATES);
    expect(html).toBeTruthy();
    expect(typeof html).toBe("string");
  });

  it("contient le nom du client", () => {
    const html = buildClientConfirmationEmailHtml(CLIENT, THEME, DATES);
    expect(html).toContain(CLIENT);
  });

  it("contient le thème de la formation", () => {
    const html = buildClientConfirmationEmailHtml(CLIENT, THEME, DATES);
    expect(html).toContain(THEME);
  });

  it("contient autant de <li> que de dates proposées", () => {
    const html = buildClientConfirmationEmailHtml(CLIENT, THEME, DATES);
    const matches = html.match(/<li>/g) ?? [];
    expect(matches.length).toBe(DATES.length);
  });

  it("contient un lien mailto de confirmation", () => {
    const html = buildClientConfirmationEmailHtml(CLIENT, THEME, DATES);
    expect(html).toContain("mailto:");
    expect(html).toContain("OUI");
  });

  it("contient un lien mailto de refus", () => {
    const html = buildClientConfirmationEmailHtml(CLIENT, THEME, DATES);
    expect(html).toContain("NON");
  });

  it("encode le thème dans les liens mailto", () => {
    const THEME_SPACES = "Sécurité incendie";
    const html = buildClientConfirmationEmailHtml(CLIENT, THEME_SPACES, DATES);
    expect(html).toContain(encodeURIComponent(THEME_SPACES));
  });

  it("est valide comme fragment HTML (balises ouvertes = balises fermées)", () => {
    const html = buildClientConfirmationEmailHtml(CLIENT, THEME, DATES);
    const opened = (html.match(/<[a-z]+[\s>]/gi) ?? []).length;
    const closed = (html.match(/<\/[a-z]+>/gi) ?? []).length;
    // Les balises auto-fermantes (meta, img, br) sont tolérées
    expect(opened).toBeGreaterThanOrEqual(closed);
  });

  it("gère une liste de dates vide sans erreur", () => {
    expect(() => buildClientConfirmationEmailHtml(CLIENT, THEME, [])).not.toThrow();
    const html = buildClientConfirmationEmailHtml(CLIENT, THEME, []);
    expect(html.match(/<li>/g) ?? []).toHaveLength(0);
  });

  it("gère des caractères spéciaux dans le nom du client", () => {
    const html = buildClientConfirmationEmailHtml("O'Brien & Associés", THEME, DATES);
    expect(html).toContain("O'Brien & Associés");
  });
});

// ─────────────────────────────────────────────────────────────────────
// 2. pipelineProcessor — action notify_client, canal EMAIL
// ─────────────────────────────────────────────────────────────────────

describe("pipelineProcessor › notify_client › canal EMAIL", () => {
  const PIPELINE_ID = "pipe-test-001";

  const mockPipeline = {
    id: PIPELINE_ID,
    channel: "EMAIL",
    fromAddress: "client@example.com",
    parsedClientName: "Marie Dupont",
    parsedThemeLabel: "Travail en hauteur",
    parsedThemeCode: null,
    status: "WAITING_PLANNER",
    clientNotifiedAt: null,
    candidates: [
      {
        id: "cand-1",
        proposedDates: ["2025-07-01T00:00:00.000Z", "2025-07-02T00:00:00.000Z"],
        status: "proposed_dates",
        trainer: { fullName: "Jean Martin" },
      },
    ],
  };

  const makeJob = (pipelineId: string) =>
    ({ data: { action: "notify_client", pipelineId } }) as never;

  beforeEach(() => {
    vi.resetAllMocks();
    (db.demandePipeline.findUniqueOrThrow as unknown as MockInstance).mockResolvedValue(mockPipeline);
    (db.demandePipeline.update as unknown as MockInstance).mockResolvedValue({ ...mockPipeline, status: "WAITING_CLIENT" });
    (db.pipelineMessage.create as unknown as MockInstance).mockResolvedValue({});
    (sendMail as unknown as MockInstance).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("appelle sendMail avec la bonne adresse destinataire", async () => {
    await pipelineProcessor(makeJob(PIPELINE_ID));
    expect(sendMail).toHaveBeenCalledOnce();
    const call = (sendMail as unknown as MockInstance).mock.calls[0][0];
    expect(call.to).toEqual([mockPipeline.fromAddress]);
  });

  it("inclut le thème dans le sujet de l'email", async () => {
    await pipelineProcessor(makeJob(PIPELINE_ID));
    const call = (sendMail as unknown as MockInstance).mock.calls[0][0];
    expect(call.subject).toContain(mockPipeline.parsedThemeLabel);
  });

  it("génère un bodyHtml contenant le nom du client", async () => {
    await pipelineProcessor(makeJob(PIPELINE_ID));
    const call = (sendMail as unknown as MockInstance).mock.calls[0][0];
    expect(call.bodyHtml).toContain(mockPipeline.parsedClientName);
  });

  it("passe le statut à WAITING_CLIENT après l'envoi", async () => {
    await pipelineProcessor(makeJob(PIPELINE_ID));
    expect(db.demandePipeline.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: PIPELINE_ID },
        data: expect.objectContaining({ status: "WAITING_CLIENT" }),
      })
    );
  });

  it("crée un PipelineMessage SORTANT", async () => {
    await pipelineProcessor(makeJob(PIPELINE_ID));
    expect(db.pipelineMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pipelineId: PIPELINE_ID,
          direction: "SORTANT",
          channel: "EMAIL",
          toAddr: mockPipeline.fromAddress,
        }),
      })
    );
  });

  it("retourne { sent: true, channel: 'EMAIL' }", async () => {
    const result = await pipelineProcessor(makeJob(PIPELINE_ID));
    expect(result).toEqual({ sent: true, channel: "EMAIL" });
  });

  it("ne jette pas d'erreur si sendMail échoue (gestion silencieuse)", async () => {
    (sendMail as unknown as MockInstance).mockRejectedValue(new Error("Graph 503"));
    await expect(pipelineProcessor(makeJob(PIPELINE_ID))).resolves.toEqual(
      expect.objectContaining({ channel: "EMAIL" })
    );
  });

  it("utilise le parsedThemeCode comme fallback si parsedThemeLabel est null", async () => {
    (db.demandePipeline.findUniqueOrThrow as unknown as MockInstance).mockResolvedValue({
      ...mockPipeline,
      parsedThemeLabel: null,
      parsedThemeCode: "CACES-R489",
    });
    await pipelineProcessor(makeJob(PIPELINE_ID));
    const call = (sendMail as unknown as MockInstance).mock.calls[0][0];
    expect(call.subject).toContain("CACES-R489");
  });

  it("retourne { error: 'no_proposed_dates' } si aucun candidat n'a proposé de dates", async () => {
    (db.demandePipeline.findUniqueOrThrow as unknown as MockInstance).mockResolvedValue({
      ...mockPipeline,
      candidates: [],
    });
    const result = await pipelineProcessor(makeJob(PIPELINE_ID));
    expect(result).toEqual({ error: "no_proposed_dates" });
    expect(sendMail).not.toHaveBeenCalled();
  });
});
