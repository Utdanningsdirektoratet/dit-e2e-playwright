/**
 * Navigation helpers for komp/frontend-canvas tests.
 *
 * All routes resolve against canvasBaseURL — the Canvas LMS instance
 * where the komp React components are served as an LTI / design override.
 *
 * Each route function detects when Canvas redirects to /login (expired session)
 * and re-authenticates transparently before retrying the navigation.
 */
import { canvasBaseURL } from "./env.js";
import { loginWithBasicAuth } from "./auth.js";

/**
 * Navigate to a Canvas URL with automatic session recovery.
 * If Canvas redirects to /login, re-authenticate and retry the goto.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} url
 */
async function gotoWithSessionRecovery(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  if (page.url().includes("/login")) {
    await loginWithBasicAuth(page);
    await page.goto(url, { waitUntil: "domcontentloaded" });
    if (page.url().includes("/login")) {
      await page.waitForTimeout(3_000);
      await page.goto(url, { waitUntil: "domcontentloaded" });
    }
  }
  // Wait for Vue/React components to bind event handlers after navigation.
  await page.waitForLoadState("networkidle");
}

/**
 * Navigate to the komp frontpage (all available packages).
 *
 * @param {import('@playwright/test').Page} page
 * @param {boolean} loggedIn - Whether to wait for the logged-in or guest variant
 */
export async function routeToFrontpage(page, loggedIn) {
  await gotoWithSessionRecovery(
    page,
    `${canvasBaseURL}/search/all_courses?design=udir`,
  );
  const heading = page.locator(
    !loggedIn
      ? '#notLoggedInPage h1:has-text("Velkommen til Utdanningsdirektoratets kompetanseportal!")'
      : '#loggedInLandingPage h1:has-text("Alle tilgjengelige kompetansepakker")',
  );
  // Success: heading appears in <100ms after networkidle.
  // 5s first try catches stale pages fast; re-auth + retry for session issues.
  const headingReady = await heading
    .waitFor({ state: "visible", timeout: 5_000 })
    .then(
      () => true,
      () => false,
    );
  if (!headingReady) {
    await loginWithBasicAuth(page);
    await gotoWithSessionRecovery(
      page,
      `${canvasBaseURL}/search/all_courses?design=udir`,
    );
    await heading.waitFor({ state: "visible", timeout: 15_000 });
  }
}

/**
 * Navigate to "Mine kompetansepakker" (My Courses).
 *
 * @param {import('@playwright/test').Page} page
 */
export async function routeToMyCourses(page) {
  await gotoWithSessionRecovery(page, `${canvasBaseURL}/courses`);
  const heading = page.locator('h1:has-text("Mine kompetansepakker")');
  const headingReady = await heading
    .waitFor({ state: "visible", timeout: 5_000 })
    .then(
      () => true,
      () => false,
    );
  if (!headingReady) {
    await loginWithBasicAuth(page);
    await gotoWithSessionRecovery(page, `${canvasBaseURL}/courses`);
    await heading.waitFor({ state: "visible", timeout: 15_000 });
  }
}

/**
 * Navigate to the shared test course used for content and LTI tests.
 * Course ID 851 is the "Test kompetansepakke" course on all environments.
 *
 * @param {import('@playwright/test').Page} page
 */
export async function routeToTestCourse(page) {
  await gotoWithSessionRecovery(page, `${canvasBaseURL}/courses/851?lang=nb`);
  const banner = page.locator(
    '.course-page__banner h1:has-text("Test kompetansepakke")',
  );
  // Success: banner appears in <30ms after networkidle.
  // 5s first try catches stale pages fast; re-auth + retry for session issues.
  const bannerReady = await banner
    .waitFor({ state: "visible", timeout: 5_000 })
    .then(
      () => true,
      () => false,
    );
  if (!bannerReady) {
    await loginWithBasicAuth(page);
    await gotoWithSessionRecovery(page, `${canvasBaseURL}/courses/851?lang=nb`);
    await banner.waitFor({ state: "visible", timeout: 15_000 });
  }
}
