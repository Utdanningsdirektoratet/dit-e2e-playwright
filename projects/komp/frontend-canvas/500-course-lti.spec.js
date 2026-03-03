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
import { test, expect } from "@playwright/test";
import { loginWithBasicAuth, hasCredentials } from "./auth.js";
import { routeToTestCourse } from "./routes.js";
import {
  openModuleItem,
  getLtiModuleName,
  getLtiModuleIndex,
  useLocalTheme,
} from "./helpers.js";

test.use({ viewport: { width: 1920, height: 1080 } });
test.describe.configure({ mode: "serial" });

test.describe("Course LTI | Canvas", () => {
  useLocalTheme();

  test.beforeEach(() => {
    test.skip(
      !hasCredentials(),
      "KOMP_CANVAS_*_USERNAME not set — skipping auth tests",
    );
  });

  // Fill and submit Rolle og grupper, reload and verify persistence, check leader-only visibility.
  async function fillRoleAndGroups(
    page,
    iframeElement,
    { roleId, faculty, state, county, institution, expectLeaderContent },
  ) {
    const iframeScroll = page.locator('iframe[title="KPAS"]');

    await iframeElement
      .locator('h2:has-text("1. Velg rolle")')
      .first()
      .waitFor({ state: "visible", timeout: 60_000 });
    await iframeScroll.scrollIntoViewIfNeeded();

    // Role
    await iframeElement.locator(`.group-role-selector input#${roleId}`).check();

    // Faculty (waits for async data to load)
    await page.waitForTimeout(5_000);
    await iframeElement
      .locator(`.faculty-selector input[value="${faculty}"]`)
      .check();

    // State (fylke)
    const stateSelect = iframeElement.locator(
      ".select-county .vs__dropdown-toggle",
    );
    const stateOptions = iframeElement.locator(
      ".select-county ul.vs__dropdown-menu",
    );
    await stateSelect.scrollIntoViewIfNeeded();
    await stateSelect.click();
    await stateOptions.waitFor({ state: "visible" });
    await stateOptions
      .locator(`li.vs__dropdown-option:has-text("${state}")`)
      .click();

    // County (kommune)
    const countySelect = iframeElement.locator(
      ".select-community .vs__dropdown-toggle",
    );
    const countyOptions = iframeElement.locator(
      ".select-community ul.vs__dropdown-menu",
    );
    await countySelect.scrollIntoViewIfNeeded();
    await countySelect.click();
    await countyOptions.waitFor({ state: "visible" });
    await countyOptions
      .locator(`li.vs__dropdown-option:has-text("${county}")`)
      .click();

    // Institution (school)
    const institutionSelect = iframeElement.locator(
      ".select-school .vs__dropdown-toggle",
    );
    const institutionOptions = iframeElement.locator(
      ".select-school ul.vs__dropdown-menu",
    );
    await institutionSelect.scrollIntoViewIfNeeded();
    await institutionSelect.click();
    await institutionOptions.waitFor({ state: "visible" });
    await institutionOptions
      .locator(`li.vs__dropdown-option:has-text("${institution}")`)
      .click();

    // Submit
    await iframeElement.locator(".update-button button.btn").click();
    await iframeElement
      .locator(
        '.update-button .message--success span:has-text("Oppdateringen var vellykket!")',
      )
      .waitFor({ state: "visible", timeout: 60_000 });

    // Reload and verify persistence
    await page.reload();
    await page.waitForTimeout(5_000);

    // Re-authenticate if Canvas session was lost during reload
    if (!await page.locator('.header__link', { hasText: 'Logg ut' }).isVisible()) {
      await loginWithBasicAuth(page);
      await routeToTestCourse(page);
      await openModuleItem(
        page,
        getLtiModuleName(),
        `${getLtiModuleIndex()}.1.1 Rolle og grupper`,
      );
    }

    const velgRolleLocator = iframeElement.locator('h2:has-text("1. Velg rolle")').first();
    const iframeReady = await velgRolleLocator
      .waitFor({ state: "visible", timeout: 30_000 })
      .then(() => true, () => false);
    if (!iframeReady) {
      // KPAS LTI did not re-initialize — navigate fresh to trigger a new LTI launch
      await openModuleItem(
        page,
        getLtiModuleName(),
        `${getLtiModuleIndex()}.1.1 Rolle og grupper`,
      );
      await velgRolleLocator.waitFor({ state: "visible", timeout: 90_000 });
    }
    await iframeScroll.scrollIntoViewIfNeeded();

    await expect(
      iframeElement.locator(`.group-role-selector input#${roleId}`),
    ).toBeChecked({ timeout: 15_000 });
    await expect(
      iframeElement.locator(`.faculty-selector input[value="${faculty}"]`),
    ).toBeChecked({ timeout: 15_000 });
    await iframeElement
      .locator(`.select-county .vs__selected:has-text("${state}")`)
      .waitFor({ state: "visible", timeout: 15_000 });
    await iframeElement
      .locator(`.select-community .vs__selected:has-text("${county}")`)
      .waitFor({ state: "visible", timeout: 15_000 });
    await iframeElement
      .locator(`.select-school .vs__selected:has-text("${institution}")`)
      .waitFor({ state: "visible", timeout: 15_000 });

    // Verify leader-only "1.10 Lederstøtte" module item visibility
    const leftSide = page.locator("#left-side #coursepage-left-side-view");
    const moduleToggle = leftSide.locator(
      '.module-package__title h4 span.title:has-text("1. Innhold")',
    );
    const moduleContent = moduleToggle
      .locator(
        'xpath=ancestor::div[contains(@class, "courses__treeview__item")]',
      )
      .locator(".module-package__child-nodes");
    if (!(await moduleContent.isVisible())) {
      await moduleToggle.click();
      await moduleContent.waitFor({ state: "visible" });
    }
    const leaderItem = moduleContent.locator(
      '.tree-node__label__text a:has-text("1.10 Lederstøtte")',
    );
    expect(await leaderItem.isVisible()).toBe(expectLeaderContent);
  }

  test("Rolle og grupper — persists selection after reload", async ({
    page,
  }) => {
    // Two rounds of: form fill + submit (up to 60 s) + reload + re-auth (up to 90 s)
    // + iframe relaunch (up to 90 s) + polling assertions (up to 75 s).
    // Worst-case ~390 s per round × 2 — give this test 10 minutes.
    test.setTimeout(600_000);
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
    test.setTimeout(44_000);
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
    await appContainer.waitFor({ state: "visible" });

    // Reset survey if already submitted
    const surveyFormVisible = await appContainer
      .locator("form.survey-form")
      .isVisible();
    if (!surveyFormVisible) {
      await iframeElement
        .locator('h2:has-text("Takk for din tilbakemelding!")')
        .first()
        .waitFor({ state: "visible", timeout: 60_000 });
      await iframeElement.locator('button.btn:has-text("Fjern svar")').click();
    }
    await appContainer
      .locator("form.survey-form")
      .waitFor({ state: "visible" });

    // Fill in survey answers
    await iframeElement
      .locator(".survey-form > .survey-question")
      .nth(0)
      .locator('input[type="radio"][value="likert_scale_5pt_1"]')
      .click();
    await iframeElement
      .locator(".survey-form > .survey-question")
      .nth(1)
      .locator('input[type="radio"][value="likert_scale_5pt_2"]')
      .click();
    await iframeElement
      .locator(".survey-form > .survey-question")
      .nth(2)
      .locator('input[type="radio"][value="likert_scale_5pt_3"]')
      .click();
    await iframeElement
      .locator(".survey-form > .survey-question")
      .nth(3)
      .locator('input[type="radio"][value="likert_scale_5pt_4"]')
      .click();
    await iframeElement
      .locator(".survey-form > .survey-question")
      .nth(4)
      .locator("textarea.form-control")
      .fill("Test");

    await iframeElement
      .locator('.survey-form button.btn:has-text("Send inn")')
      .click();
    await iframeElement
      .locator('h2:has-text("Takk for din tilbakemelding!")')
      .first()
      .waitFor({ state: "visible", timeout: 60_000 });
  });

  test("Dashboard — results heading is visible", async ({ page }) => {
    test.setTimeout(39_000);
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
