/**
 * "My Courses" page tests for komp/frontend-canvas.
 *
 * Tests the user's personal course list:
 *  - Pending invitation cards show accept/decline buttons
 *  - Enrolled cards navigate to the course
 */
import { test, expect } from "@playwright/test";
import { loginWithBasicAuth, hasCredentials } from "./auth.js";
import { routeToMyCourses } from "./routes.js";
import { useLocalTheme } from "./helpers.js";

test.use({ viewport: { width: 1920, height: 1080 } });

test.describe("My Courses | Canvas", () => {
  test.describe.configure({ timeout: 48_000 });
  useLocalTheme();

  test.beforeEach(() => {
    test.skip(
      !hasCredentials(),
      "KOMP_CANVAS_*_USERNAME not set — skipping auth tests",
    );
  });

  test("invite card shows accept and decline buttons", async ({ page }) => {
    await loginWithBasicAuth(page);
    await routeToMyCourses(page);

    const inviteContainer = page.locator(".my-courses-invites");
    const inviteItem = inviteContainer.locator(".course-invite").first();

    await inviteItem
      .locator('button:has-text("Godta invitasjonen")')
      .waitFor({ state: "visible" });
    await inviteItem
      .locator('button:has-text("Avslå invitasjonen")')
      .waitFor({ state: "visible" });
  });

  test("enrolled card navigates to course", async ({ page }) => {
    await loginWithBasicAuth(page);
    await routeToMyCourses(page);

    const cardInstances = page
      .locator(".my-courses-page--layout .card-container")
      .locator(`.card-instance button p:has-text("Gå til kompetansepakke")`)
      .locator('xpath=ancestor::div[contains(@class, "card-instance")]');

    const count = await cardInstances.count();
    expect(count).toBeGreaterThan(0);

    await cardInstances
      .first()
      .locator(".circular-progress-bar")
      .waitFor({ state: "visible" });
    await cardInstances
      .first()
      .locator('button.btn:has-text("Gå til kompetansepakke")')
      .click();
    await page.waitForURL(/\/courses\//, { timeout: 30_000 });
    await page
      .locator('.course-page__banner__actions button:has-text("Meld deg av")')
      .waitFor({ state: "visible" });
    expect(page.url()).toContain("/courses/");
  });
});
