/**
 * LTI-specific test helpers for komp/frontend-canvas.
 *
 * Contains the Rolle og grupper form fill + persistence verification logic
 * used by the Course LTI spec.
 */
import { expect } from "@playwright/test";
import { routeToTestCourse } from "./routes.js";
import {
  openModuleItem,
  getLtiModuleName,
  getLtiModuleIndex,
} from "./helpers.js";

/**
 * Fill and submit Rolle og grupper, navigate fresh to verify persistence,
 * then check leader-only module item visibility.
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').FrameLocator} iframeElement
 * @param {Object} options
 */
export async function fillRoleAndGroups(
  page,
  iframeElement,
  { roleId, faculty, state, county, institution, expectLeaderContent },
) {
  const iframeScroll = page.locator('iframe[title="KPAS"]');

  await iframeElement
    .locator('h2:has-text("1. Velg rolle")')
    .first()
    .waitFor({ state: "visible", timeout: 20_000 });
  await iframeScroll.scrollIntoViewIfNeeded();

  // Wait for KPAS data to load before interacting with the form
  await iframeElement
    .locator(
      '.select-county .vs__selected, .faculty-selector input[type="radio"]:checked',
    )
    .first()
    .waitFor({ state: "attached", timeout: 15_000 })
    .catch(() => {});

  // Role
  await iframeElement
    .locator(`.group-role-selector input#${roleId}`)
    .check({ timeout: 15_000 });

  // Faculty — click the label, not the hidden input (Canvas custom radio styling)
  const facultyLabel = iframeElement.locator(
    `.faculty-selector label:has(input[value="${faculty}"])`,
  );
  const facultyRadio = iframeElement.locator(
    `.faculty-selector input[value="${faculty}"]`,
  );
  await facultyLabel.click({ timeout: 15_000 });
  await expect(facultyRadio).toBeChecked({ timeout: 10_000 });

  // State (fylke)
  const stateSelect = iframeElement.locator(
    ".select-county .vs__dropdown-toggle",
  );
  const stateOptions = iframeElement.locator(
    ".select-county ul.vs__dropdown-menu",
  );
  await stateSelect.waitFor({ state: "visible", timeout: 30_000 });
  await stateSelect.scrollIntoViewIfNeeded();
  await stateSelect.click({ timeout: 15_000 });
  await stateOptions.waitFor({ state: "visible", timeout: 15_000 });
  await stateOptions
    .locator(`li.vs__dropdown-option:has-text("${state}")`)
    .click({ timeout: 15_000 });

  // County (kommune) — waits for KPAS API to load county data after state selection
  const countySelect = iframeElement.locator(
    ".select-community .vs__dropdown-toggle",
  );
  const countyOptions = iframeElement.locator(
    ".select-community ul.vs__dropdown-menu",
  );
  await countySelect.waitFor({ state: "visible", timeout: 30_000 });
  await countySelect.scrollIntoViewIfNeeded();
  await countySelect.click({ timeout: 15_000 });
  await countyOptions.waitFor({ state: "visible", timeout: 15_000 });
  await countyOptions
    .locator(`li.vs__dropdown-option:has-text("${county}")`)
    .click({ timeout: 15_000 });

  // Institution (school) — waits for KPAS API to load school data after county selection
  const institutionSelect = iframeElement.locator(
    ".select-school .vs__dropdown-toggle",
  );
  const institutionOptions = iframeElement.locator(
    ".select-school ul.vs__dropdown-menu",
  );
  await institutionSelect.waitFor({ state: "visible", timeout: 30_000 });
  await institutionSelect.scrollIntoViewIfNeeded();
  await institutionSelect.click({ timeout: 15_000 });
  await institutionOptions.waitFor({ state: "visible", timeout: 15_000 });
  await institutionOptions
    .locator(`li.vs__dropdown-option:has-text("${institution}")`)
    .click({ timeout: 15_000 });

  // Submit
  await iframeElement
    .locator(".update-button button.btn")
    .click({ timeout: 15_000 });
  await iframeElement
    .locator(
      '.update-button .message--success span:has-text("Oppdateringen var vellykket!")',
    )
    .waitFor({ state: "visible", timeout: 60_000 });

  // Verify persistence: navigate fresh — routeToTestCourse handles
  // session recovery automatically if Canvas session expired.
  await routeToTestCourse(page);
  await openModuleItem(
    page,
    getLtiModuleName(),
    `${getLtiModuleIndex()}.1.1 Rolle og grupper`,
  );

  // Wait for LTI iframe to initialize — if it doesn't load within 60s,
  // the LTI launch likely failed. Reload and try openModuleItem again.
  const velgRolleLocator = iframeElement
    .locator('h2:has-text("1. Velg rolle")')
    .first();
  const iframeLoaded = await velgRolleLocator
    .waitFor({ state: "visible", timeout: 20_000 })
    .then(
      () => true,
      () => false,
    );
  if (!iframeLoaded) {
    await routeToTestCourse(page);
    await openModuleItem(
      page,
      getLtiModuleName(),
      `${getLtiModuleIndex()}.1.1 Rolle og grupper`,
    );
    await velgRolleLocator.waitFor({ state: "visible", timeout: 90_000 });
  }
  await iframeScroll.scrollIntoViewIfNeeded();

  // Wait for KPAS data to hydrate before asserting persisted values
  await facultyRadio.waitFor({ state: "attached", timeout: 30_000 });
  await expect(
    iframeElement.locator(`.group-role-selector input#${roleId}`),
  ).toBeChecked({ timeout: 30_000 });
  await expect(facultyRadio).toBeChecked({ timeout: 30_000 });
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
    .locator('xpath=ancestor::div[contains(@class, "courses__treeview__item")]')
    .locator(".module-package__child-nodes");
  if (!(await moduleContent.isVisible())) {
    await moduleToggle.click({ timeout: 5_000 });
    await moduleContent.waitFor({ state: "visible", timeout: 5_000 });
  }
  const leaderItem = moduleContent.locator(
    '.tree-node__label__text a:has-text("1.10 Lederstøtte")',
  );
  expect(await leaderItem.isVisible()).toBe(expectLeaderContent);
}
