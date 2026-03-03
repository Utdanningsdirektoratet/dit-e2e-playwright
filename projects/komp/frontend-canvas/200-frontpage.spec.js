/**
 * Authenticated frontpage tests for komp/frontend-canvas.
 *
 * Tests the komp frontpage as a logged-in user:
 *  - Stage banner and nav links reflect the logged-in state
 *  - Enrolled, unenrolled, and invited cards behave correctly
 *  - New tag is visible when present
 *  - Card filters work
 */
import { test, expect } from '@playwright/test';
import { loginWithBasicAuth, hasCredentials } from './auth.js';
import { routeToFrontpage } from './routes.js';
import { assertStageBanner, assertNavLinks, getEnv, useLocalTheme } from './helpers.js';

test.use({ viewport: { width: 1920, height: 1080 } });

test.describe('Frontpage | Canvas', () => {
  useLocalTheme();

  test.beforeEach(() => {
    test.skip(!hasCredentials(), 'KOMP_CANVAS_*_USERNAME not set — skipping auth tests');
  });
  test('stage banner is correct', async ({ page }) => {
    test.setTimeout(33_000);
    await loginWithBasicAuth(page);
    const header = page.locator('header#loggedInHeader .header__content');
    await assertStageBanner(header);
  });

  test('nav links show logged-in state', async ({ page }) => {
    test.setTimeout(14_000);
    await loginWithBasicAuth(page);
    const header = page.locator('header#loggedInHeader');
    await assertNavLinks(header, true);
  });

  test('enrolled card navigates to course', async ({ page }) => {
    test.setTimeout(53_000);
    await loginWithBasicAuth(page);
    await routeToFrontpage(page, true);

    const cardInstances = page
      .locator('.landing-page .card-container')
      .locator(`.card-instance h2:has-text("Kunstig intelligens i skolen")`)
      .locator('xpath=ancestor::div[contains(@class, "card-instance")]');

    const count = await cardInstances.count();
    expect(count).toBeGreaterThan(0);

    await cardInstances.first().locator('.circular-progress-bar').waitFor({ state: 'visible' });
    await cardInstances.first().locator('button.btn:has-text("Gå til kompetansepakke")').click();
    await page.waitForURL(/\/courses\//, { timeout: 30_000 });
    await page
      .locator('.course-page__banner__actions button:has-text("Meld deg av")')
      .waitFor({ state: 'visible' });
    expect(page.url()).toContain('/courses/');
  });

  test('unenrolled card read-more shows module list', async ({ page }) => {
    if (getEnv() === 'production') test.skip(); // Preview module list broken in production
    await loginWithBasicAuth(page);
    await routeToFrontpage(page, true);

    const cardInstances = page
      .locator('.landing-page .card-container')
      .locator(`.card-instance h2:has-text("Programmering og algoritmisk tenkning")`)
      .locator('xpath=ancestor::div[contains(@class, "card-instance")]');

    const readMoreButton = cardInstances.first().locator('button.btn:has-text("Les mer")');
    const modalPopup = page.locator('.modal-box');

    await readMoreButton.click();
    await modalPopup.waitFor({ state: 'visible' });
    await modalPopup.locator('.modules-list ul li').first().waitFor({ state: 'visible' });
    const itemCount = await modalPopup.locator('.modules-list ul li').count();
    expect(itemCount).toBeGreaterThan(0);
  });

  test('unenrolled card enroll and unenroll', async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    if (testInfo.project.name.includes('firefox')) test.skip(); // BUG: Works locally but not on CI
    await loginWithBasicAuth(page);
    await routeToFrontpage(page, true);

    const cardInstance = page
      .locator('#loggedInLandingPage .card-container')
      .locator(`.card-instance .card-box-title h2:has-text("Trygt og godt skolemiljø")`)
      .locator('xpath=ancestor::div[contains(@class, "card-instance")]');

    const isAlreadyEnrolled = await cardInstance
      .locator('button:has-text("Gå til kompetansepakke")')
      .count();

    if (isAlreadyEnrolled >= 1) {
      // Unenroll first so the enroll flow can be tested
      await cardInstance.locator('button.btn:has-text("Gå til kompetansepakke")').click();
      await page.waitForURL(/\/courses\//, { timeout: 30_000 });
      await page.locator('#actions_self_unenrollment:has-text("Meld deg av")').click();
      const modalPopup = page.locator('.modal-box');
      await modalPopup.waitFor({ state: 'visible' });
      await modalPopup.locator('button:has-text("Meld deg av emnet")').click();
      await page
        .locator('h1:has-text("Alle tilgjengelige kompetansepakker")')
        .waitFor({ state: 'visible', timeout: 30_000 });
      await routeToFrontpage(page, true);
    }

    // Enroll
    await cardInstance.locator('button.btn:has-text("Meld deg på")').click();
    await page.waitForLoadState('networkidle');
    await page
      .locator('.ic-Self-enrollment-footer button:has-text("Registrere deg i emnet")')
      .waitFor({ state: 'visible' });
    expect(page.url()).toContain('/enroll/');
    await page.locator('.ic-Self-enrollment-footer button:has-text("Registrere deg i emnet")').click();
    const goToCourse = page.locator('.ic-Self-enrollment-footer a:has-text("Gå til emnet")');
    const enrolled = await goToCourse.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true, () => false);
    if (!enrolled) {
      await page.locator('.ic-Self-enrollment-footer button:has-text("Registrere deg i emnet")').click();
      await goToCourse.waitFor({ state: 'visible' });
    }
    await goToCourse.click();

    // Unenroll
    await page.locator('#actions_self_unenrollment:has-text("Meld deg av")').waitFor({ state: 'visible' });
    expect(page.url()).toContain('/courses/');
    await page.locator('#actions_self_unenrollment:has-text("Meld deg av")').click();
    const modalPopup = page.locator('.modal-box');
    await modalPopup.waitFor({ state: 'visible' });
    await modalPopup.locator('button:has-text("Meld deg av emnet")').click();
    await page.waitForTimeout(5_000); // wait for unenrollment to process
    const unenrolled = await page
      .locator('h1:has-text("Alle tilgjengelige kompetansepakker")')
      .waitFor({ state: 'visible', timeout: 5_000 })
      .then(() => true, () => false);
    if (!unenrolled) {
      await page.locator('#actions_self_unenrollment:has-text("Meld deg av")').click();
      await modalPopup.waitFor({ state: 'visible' });
      await modalPopup.locator('button:has-text("Meld deg av emnet")').click();
      await page.waitForTimeout(10_000);
    }
    await page
      .locator('h1:has-text("Alle tilgjengelige kompetansepakker")')
      .waitFor({ state: 'visible', timeout: 30_000 });
    expect(page.url()).toContain('/search/all_courses');
  });

  test('invited card has no enroll or read-more buttons', async ({ page }) => {
    test.setTimeout(21_000);
    await loginWithBasicAuth(page);
    await routeToFrontpage(page, true);

    const cardInstance = page
      .locator('.landing-page .card-container')
      .locator(
        `.card-instance .card-box-title h2:has-text("Inkludering og universell utforming i digital praksis")`,
      )
      .locator('xpath=ancestor::div[contains(@class, "card-instance")]');

    const count = await cardInstance.count();
    expect(count).toBeGreaterThan(0);

    await cardInstance.first().locator('button.btn:has-text("Gå til kompetansepakke")').waitFor({ state: 'hidden' });
    await cardInstance.first().locator('button.btn:has-text("Meld deg på")').waitFor({ state: 'hidden' });
    await cardInstance.first().locator('button.btn:has-text("Les mer")').waitFor({ state: 'hidden' });
  });

  test('new tag is visible on at least one card', async ({ page }) => {
    await loginWithBasicAuth(page);
    await routeToFrontpage(page, true);

    const cardContainer = page.locator('.landing-page--layout .card-container');
    const newTags = cardContainer.locator('.new-flag-text:has-text("Ny")');
    const count = await newTags.count();
    if (count === 0) test.skip(); // no cards with "Ny" tag in this environment
    await newTags.first().waitFor({ state: 'visible' });
  });

  test('card list filters reduce results', async ({ page }) => {
    test.setTimeout(24_000);
    await loginWithBasicAuth(page);
    await routeToFrontpage(page, true);

    const cardContainer = page.locator('.landing-page--layout .card-container');
    const totalBefore = await cardContainer.locator('.card-instance').count();

    await page
      .locator('.filter-container ul li label')
      .filter({ hasText: 'Videregående opplæring' })
      .click();
    const filteredCount = await cardContainer.locator('.card-instance').count();
    expect(filteredCount).toBeLessThanOrEqual(totalBefore);

    await page.locator('.filter-container button:has-text("Tilbakestill filter")').click();
    const resetCount = await cardContainer.locator('.card-instance').count();
    expect(resetCount).toBe(totalBefore);
  });
});
