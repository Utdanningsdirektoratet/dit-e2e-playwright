/**
 * Course LTI (KPAS) integration tests for komp/frontend-canvas.
 *
 * Tests the KPAS LTI integration rendered inside a Canvas LMS iframe:
 *  - Rolle og grupper (role and group selection) — two rounds:
 *      1. Skoleleder / Naturfag 1-7 / Akershus / Asker / Asker videregående skole
 *      2. Deltager  / Matematikk 8-10 / Oslo / Oslo / Bjerke videregående skole
 *    Each round submits and verifies persistence after reload. The second round
 *    also confirms that leader-only content is hidden for deltager.
 *  - Undersøkelse (survey) — submit and verify confirmation
 *  - Dashboard — heading is visible
 *
 * Runs in serial mode since KPAS state mutations affect subsequent tests.
 */
import { test } from "@playwright/test";
import { loginWithBasicAuth, hasCredentials } from "./auth.js";
import { routeToTestCourse } from "./routes.js";
import {
  openModuleItem,
  getLtiModuleName,
  getLtiModuleIndex,
  useLocalTheme,
} from "./helpers.js";
import { fillRoleAndGroups } from "./lti-helpers.js";

test.use({ viewport: { width: 1920, height: 1080 } });
test.describe.configure({ mode: "serial" });

test.describe("Course LTI | Canvas", () => {
  // Suite default 90s: covers login (~10s) + navigation (~5s) + 60s iframe waits + buffer.
  test.describe.configure({ timeout: 90_000 });
  useLocalTheme();

  test.beforeEach(() => {
    test.skip(
      !hasCredentials(),
      "KOMP_CANVAS_*_USERNAME not set — skipping auth tests",
    );
  });

  test("Rolle og grupper — persists selection after reload", async ({
    page,
  }) => {
    // Two rounds: ~45s each on success. With iframe retry fallback, cap at 300s.
    test.setTimeout(300_000);
    await loginWithBasicAuth(page);
    await routeToTestCourse(page);
    await openModuleItem(
      page,
      getLtiModuleName(),
      `${getLtiModuleIndex()}.1.1 Rolle og grupper`,
    );

    const iframeElement = page.frameLocator('iframe[title="KPAS"]');

    // Round 1: Skoleleder
    await fillRoleAndGroups(page, iframeElement, {
      roleId: "radioSkoleleder",
      faculty: "Naturfag 1-7",
      state: "Akershus",
      county: "Asker",
      institution: "Asker videregående skole",
      expectLeaderContent: true,
    });

    // Round 2: Deltager — different role, different selections
    await openModuleItem(
      page,
      getLtiModuleName(),
      `${getLtiModuleIndex()}.1.1 Rolle og grupper`,
    );

    await fillRoleAndGroups(page, iframeElement, {
      roleId: "deltager",
      faculty: "Matematikk 8-10",
      state: "Oslo",
      county: "Oslo",
      institution: "Bjerke videregående skole",
      expectLeaderContent: false,
    });
  });

  test("Undersøkelse — survey submits successfully", async ({ page }) => {
    await loginWithBasicAuth(page);
    await routeToTestCourse(page);
    await openModuleItem(
      page,
      getLtiModuleName(),
      `${getLtiModuleIndex()}.1.2 Undersøkelse`,
    );

    page.on("dialog", async (dialog) => {
      await dialog.accept();
    });

    const iframeElement = page.frameLocator('iframe[title="KPAS"]');
    const appContainer = iframeElement.locator("#app");
    await appContainer.waitFor({ state: "visible", timeout: 30_000 });

    // Reset survey if already submitted
    const surveyFormVisible = await appContainer
      .locator("form.survey-form")
      .isVisible();
    if (!surveyFormVisible) {
      await iframeElement
        .locator('h2:has-text("Takk for din tilbakemelding!")')
        .first()
        .waitFor({ state: "visible", timeout: 60_000 });
      await iframeElement
        .locator('button.btn:has-text("Fjern svar")')
        .click({ timeout: 15_000 });
    }
    await appContainer
      .locator("form.survey-form")
      .waitFor({ state: "visible", timeout: 15_000 });

    // Fill in survey answers
    await iframeElement
      .locator(".survey-form > .survey-question")
      .nth(0)
      .locator('input[type="radio"][value="likert_scale_5pt_1"]')
      .click({ timeout: 10_000 });
    await iframeElement
      .locator(".survey-form > .survey-question")
      .nth(1)
      .locator('input[type="radio"][value="likert_scale_5pt_2"]')
      .click({ timeout: 10_000 });
    await iframeElement
      .locator(".survey-form > .survey-question")
      .nth(2)
      .locator('input[type="radio"][value="likert_scale_5pt_3"]')
      .click({ timeout: 10_000 });
    await iframeElement
      .locator(".survey-form > .survey-question")
      .nth(3)
      .locator('input[type="radio"][value="likert_scale_5pt_4"]')
      .click({ timeout: 10_000 });
    await iframeElement
      .locator(".survey-form > .survey-question")
      .nth(4)
      .locator("textarea.form-control")
      .fill("Test", { timeout: 10_000 });

    await iframeElement
      .locator('.survey-form button.btn:has-text("Send inn")')
      .click({ timeout: 15_000 });
    await iframeElement
      .locator('h2:has-text("Takk for din tilbakemelding!")')
      .first()
      .waitFor({ state: "visible", timeout: 60_000 });
  });

  test("Dashboard — results heading is visible", async ({ page }) => {
    await loginWithBasicAuth(page);
    await routeToTestCourse(page);
    await openModuleItem(
      page,
      getLtiModuleName(),
      `${getLtiModuleIndex()}.1.3 Dashboard`,
    );

    const iframeElement = page.frameLocator('iframe[title="KPAS"]');
    await iframeElement
      .locator('h3:has-text("Resultater fra gruppe:")')
      .first()
      .waitFor({ state: "visible", timeout: 60_000 });
  });
});
