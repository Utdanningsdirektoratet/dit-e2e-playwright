/**
 * Shared test helpers for komp/frontend-canvas specs.
 *
 * Platform-standard assertions (stage detection, nav header state) are
 * delegated to shared/canvas/ modules. Only komp-specific helpers live here:
 * modal interactions, course tree navigation, and LTI module resolution.
 *
 * @see shared/canvas/stage-detection.js — isCanvasStage, assertCanvasStageStyling
 * @see shared/canvas/navigation.js     — assertCanvasHeaderAuthenticated/Unauthenticated
 */
import { test } from "@playwright/test";
import { canvasBaseURL } from "./env.js";
import {
  isCanvasStage,
  assertCanvasStageStyling,
} from "../../../shared/canvas/stage-detection.js";
import {
  assertCanvasHeaderAuthenticated,
  assertCanvasHeaderUnauthenticated,
} from "../../../shared/canvas/navigation.js";

/**
 * Injects the use_localhost_theme=true cookie so Canvas loads frontend assets
 * from localhost instead of the CDN. Mirrors the old TEST_CANVAS_LOCAL_THEME
 * feature flag from frontend-react. Enabled when either
 * KOMP_CANVAS_LOCAL_THEME=true or TEST_CANVAS_LOCAL_THEME=true is set.
 *
 * Call this inside a test.describe() block alongside useDesktopViewport().
 */
export function useLocalTheme() {
  const isEnabled =
    process.env.KOMP_CANVAS_LOCAL_THEME === "true" ||
    process.env.TEST_CANVAS_LOCAL_THEME === "true";

  if (isEnabled) {
    test.beforeEach(async ({ context }) => {
      const cookieDomain = canvasBaseURL.replace(/^https?:\/\//, "");
      await context.addCookies([
        {
          name: "use_localhost_theme",
          value: "true",
          domain: cookieDomain,
          path: "/",
        },
      ]);
    });
  }
}

/**
 * Returns the current environment name, normalising local/development to 'stage'.
 * @returns {'stage' | 'production'}
 */
export function getEnv() {
  let env = process.env.TEST_ENV ?? "production";
  if (env === "local" || env === "development") env = "stage";
  return env;
}

/**
 * Returns true if the current Canvas instance is the staging environment.
 * @returns {boolean}
 */
export function isStage() {
  return isCanvasStage(canvasBaseURL);
}

/**
 * Close a modal popup by clicking its close/icon button.
 *
 * @param {import('@playwright/test').Locator} modalElement
 */
export async function modalClose(modalElement) {
  await modalElement.waitFor({ state: "visible", timeout: 10_000 });
  const closeButton = modalElement.locator("button.icon-button");
  await closeButton.click({ timeout: 10_000 });
  await modalElement.waitFor({ state: "hidden", timeout: 10_000 });
}

/**
 * Check header stage banner presence and colour.
 * Delegates to shared/canvas/stage-detection.js with the active Canvas URL.
 *
 * @param {import('@playwright/test').Locator} header
 */
export async function assertStageBanner(header) {
  await header.waitFor({ state: "visible", timeout: 10_000 });
  await assertCanvasStageStyling(header, isCanvasStage(canvasBaseURL));
}

/**
 * Assert that the navigation header links are correct for the given auth state.
 * Delegates to shared/canvas/navigation.js.
 *
 * @param {import('@playwright/test').Locator} header
 * @param {boolean} isLoggedIn
 */
export async function assertNavLinks(header, isLoggedIn) {
  if (!isLoggedIn) {
    await assertCanvasHeaderUnauthenticated(header);
  } else {
    await assertCanvasHeaderAuthenticated(header);
  }
}

/**
 * Open a module item in the left-side course tree and wait for its page to load.
 *
 * Success timings: sidebar 5ms, toggle click 30ms, item click ~1s, title ~250ms.
 * Timeouts are set tight to fail fast — retry re-queries the sidebar on the
 * current page in case the first click triggered a navigation.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} moduleName - e.g. "1. Innhold"
 * @param {string} moduleItemName - e.g. "1.2 Reveal"
 */
export async function openModuleItem(page, moduleName, moduleItemName) {
  const leftSideContainer = page.locator(
    "#left-side #coursepage-left-side-view",
  );

  await leftSideContainer.waitFor({ state: "visible", timeout: 15_000 });

  const moduleToggle = leftSideContainer.locator(
    `.module-package__title h4 span.title:has-text("${moduleName}")`,
  );
  const moduleContent = moduleToggle
    .locator('xpath=ancestor::div[contains(@class, "courses__treeview__item")]')
    .locator(".module-package__child-nodes");

  if (!(await moduleContent.isVisible())) {
    await moduleToggle.click({ timeout: 10_000 });
    await moduleContent.waitFor({ state: "visible", timeout: 10_000 });
  }

  const moduleContentItem = moduleContent.locator(
    `.tree-node__label__text a:has-text("${moduleItemName}")`,
  );
  await moduleContentItem.click({ timeout: 5_000 });

  // Success: title appears in ~250ms. 5s catches slow staging; retry re-queries
  // the sidebar on the current page since the first click may have navigated.
  const titleReady = await page
    .locator(`h1.page-title:has-text("${moduleItemName}")`)
    .waitFor({ state: "visible", timeout: 5_000 })
    .then(
      () => true,
      () => false,
    );
  if (!titleReady) {
    const retryLink = page
      .locator("#left-side #coursepage-left-side-view")
      .locator(`.tree-node__label__text a:has-text("${moduleItemName}")`);
    await retryLink.click({ timeout: 5_000 });
    await page
      .locator(`h1.page-title:has-text("${moduleItemName}")`)
      .waitFor({ state: "visible", timeout: 5_000 });
  }
}

/**
 * Returns the LTI module name for the active environment.
 * @returns {string}
 */
export function getLtiModuleName() {
  return getEnv() === "production" ? "3. LTI (production)" : "2. LTI (stage)";
}

/**
 * Returns the LTI module index for the active environment.
 * @returns {number}
 */
export function getLtiModuleIndex() {
  return getEnv() === "production" ? 3 : 2;
}
