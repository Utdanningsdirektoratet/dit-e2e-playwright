/**
 * Smoke tests for komp/frontend-react (Next.js headless frontend).
 *
 * Fast baseline checks that the React frontend is alive:
 *  - Homepage loads with a title
 *  - Homepage has visible main content
 *  - Both language variants (bokmål / nynorsk) load
 *
 * These run first so a broken deploy is caught before heavier
 * sitemap or interaction tests consume time.
 */
import { test, expect } from "@playwright/test";

test.describe("Smoke", () => {
  test("homepage has a title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/.+/);
  });

  test("homepage has visible main content", async ({ page }) => {
    await page.goto("/");
    const main = page.locator('main, [role="main"]');
    await expect(main.first()).toBeVisible();
  });

  test("nynorsk homepage loads with correct lang attribute", async ({
    page,
  }) => {
    await page.goto("/nn/");
    await expect(page).toHaveTitle(/.+/);
    await expect(page.locator("html")).toHaveAttribute("lang", "nn");
  });

  test("bokmål homepage has correct lang attribute", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "nb");
  });
});
