import { Page } from "@playwright/test";

/**
 * Sets a minimal session cookie so e2e tests bypass the SSO flow.
 * Requires TEST_SESSION_TOKEN env var set to a valid session token
 * seeded in the test database.
 */
export async function loginAsAdmin(page: Page) {
  const token = process.env.TEST_SESSION_TOKEN;
  if (!token) throw new Error("TEST_SESSION_TOKEN env var not set");

  await page.context().addCookies([
    {
      name: "authjs.session-token",
      value: token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}
