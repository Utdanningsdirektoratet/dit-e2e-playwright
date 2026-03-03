/**
 * Navigation helpers for komp/frontend-canvas tests.
 *
 * All routes resolve against canvasBaseURL — the Canvas LMS instance
 * where the komp React components are served as an LTI / design override.
 */
import { canvasBaseURL } from './env.js';

/**
 * Navigate to the komp frontpage (all available packages).
 *
 * @param {import('@playwright/test').Page} page
 * @param {boolean} loggedIn - Whether to wait for the logged-in or guest variant
 */
export async function routeToFrontpage(page, loggedIn) {
  await page.goto(`${canvasBaseURL}/search/all_courses?design=udir`);
  await page
    .locator(
      !loggedIn
        ? '#notLoggedInPage h1:has-text("Velkommen til Utdanningsdirektoratets kompetanseportal!")'
        : '#loggedInLandingPage h1:has-text("Alle tilgjengelige kompetansepakker")',
    )
    .waitFor({ state: 'visible' });
}

/**
 * Navigate to "Mine kompetansepakker" (My Courses).
 *
 * @param {import('@playwright/test').Page} page
 */
export async function routeToMyCourses(page) {
  await page.goto(`${canvasBaseURL}/courses`);
  await page.locator('h1:has-text("Mine kompetansepakker")').waitFor({ state: 'visible' });
}

/**
 * Navigate to the shared test course used for content and LTI tests.
 * Course ID 851 is the "Test kompetansepakke" course on all environments.
 *
 * @param {import('@playwright/test').Page} page
 */
export async function routeToTestCourse(page) {
  await page.goto(`${canvasBaseURL}/courses/851?lang=nb`);
  await page
    .locator('.course-page__banner h1:has-text("Test kompetansepakke")')
    .waitFor({ state: 'visible' });
}
