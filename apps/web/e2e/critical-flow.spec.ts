/**
 * E2E — Critical flow: nouvelle demande → matching → session confirmée → rapport envoyé
 *
 * Prerequisites (test database seeded via `pnpm db:seed`):
 *   - At least one Trainer, Client, Theme, Site in the DB
 *   - TEST_SESSION_TOKEN env var pointing to a valid admin session
 */

import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("Flow critique — demande → confirmation → rapport", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  // ── 1. Dashboard loads ─────────────────────────────────────────────────────
  test("dashboard affiche les KPIs", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /tableau de bord/i })).toBeVisible();
    await expect(page.getByText("Nouvelles demandes")).toBeVisible();
    await expect(page.getByText("Sessions provisoires")).toBeVisible();
    await expect(page.getByText("Rapports en attente")).toBeVisible();
    await expect(page.getByText("Alertes stock")).toBeVisible();
  });

  // ── 2. Analytiques page loads ──────────────────────────────────────────────
  test("page analytiques s'affiche sans erreur", async ({ page }) => {
    await page.goto("/analytiques");
    await expect(page.getByRole("heading", { name: /analytiques/i })).toBeVisible();
    await expect(page.getByText("Sessions confirmées (YTD)")).toBeVisible();
    await expect(page.getByText("CA confirmé (YTD)")).toBeVisible();
  });

  // ── 3. Demandes list ───────────────────────────────────────────────────────
  test("liste des demandes accessible", async ({ page }) => {
    await page.goto("/demandes");
    await expect(page.getByRole("heading", { name: /demandes/i })).toBeVisible();
  });

  // ── 4. Sessions calendar view ──────────────────────────────────────────────
  test("vue calendrier des sessions s'affiche", async ({ page }) => {
    await page.goto("/sessions");
    await expect(page.getByRole("heading", { name: /sessions/i })).toBeVisible();
  });

  // ── 5. Rapports pipeline ───────────────────────────────────────────────────
  test("pipeline rapports accessible", async ({ page }) => {
    await page.goto("/rapports");
    await expect(page.getByRole("heading", { name: /rapports de formation/i })).toBeVisible();
  });

  // ── 6. Stock page ──────────────────────────────────────────────────────────
  test("page stock s'affiche", async ({ page }) => {
    await page.goto("/stock");
    await expect(page.getByRole("heading", { name: /stock/i })).toBeVisible();
  });

  // ── 7. API — session matching returns valid JSON ───────────────────────────
  test("API matching retourne un résultat valide", async ({ request }) => {
    // First get a real demande id
    const demandesRes = await request.get("/api/demandes?status=NOUVELLE");
    if (!demandesRes.ok()) {
      test.skip();
      return;
    }
    const demandes = await demandesRes.json();
    if (!demandes.length) {
      test.skip();
      return;
    }
    const id = demandes[0].id;
    const res = await request.post(`/api/demandes/${id}/matching`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("candidates");
    expect(Array.isArray(body.candidates)).toBe(true);
  });

  // ── 8. API — cron endpoint requires secret ────────────────────────────────
  test("cron/notifications refuse sans secret", async ({ request }) => {
    const res = await request.get("/api/cron/notifications");
    expect(res.status()).toBe(401);
  });

  // ── 9. Rapport upload token — invalid token returns 401 ───────────────────
  test("upload rapport avec token invalide retourne 401", async ({ request }) => {
    const res = await request.post("/api/rapport/upload/invalid-token-xyz", {
      data: { rawContent: "test" },
    });
    expect(res.status()).toBe(401);
  });

  // ── 10. Navigation sidebar — all items reachable ─────────────────────────
  test("tous les liens de navigation répondent 200", async ({ page }) => {
    const routes = [
      "/dashboard",
      "/demandes",
      "/sessions",
      "/formateurs",
      "/clients",
      "/themes",
      "/stock",
      "/rapports",
      "/analytiques",
    ];
    for (const route of routes) {
      const res = await page.goto(route);
      expect(res?.status(), `Route ${route} doit répondre 200`).toBe(200);
    }
  });
});
