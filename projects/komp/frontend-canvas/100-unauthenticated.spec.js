/**
 * Unauthenticated user flow for komp/frontend-canvas.
 *
 * Tests the komp frontpage as a guest visitor:
 *  - Stage banner and nav links reflect the unauthenticated state
 *  - Cards display correctly (new tag, filters)
 *  - Login/logout flow works with basic auth
 */
import { test, expect } from '@playwright/test';
import { loginWithBasicAuth, logout, hasCredentials } from './auth.js';
import { routeToFrontpage } from './routes.js';
import { assertStageBanner, assertNavLinks, useLocalTheme } from './helpers.js';

test.use({ viewport: { width: 1920, height: 1080 } });

test.describe('Unauthenticated | Canvas', () => {
  useLocalTheme();

  test('stage banner is correct', async ({ page }) => {
    test.setTimeout(27_000);
    await routeToFrontpage(page, false);
    const header = page.locator('header#notLoggedInHeader .header__content');
    await assertStageBanner(header);
  });

  test('nav links show only login link', async ({ page }) => {
    test.setTimeout(17_000);
    await routeToFrontpage(page, false);
    const header = page.locator('header#notLoggedInHeader');
    await assertNavLinks(header, false);
  });

  test('featured card is visible', async ({ page }) => {
    test.setTimeout(18_000);
    await routeToFrontpage(page, false);
    const featuredCard = page.locator('.intro-news .card-highlighted');
    await expect(featuredCard).toBeVisible();
  });

  test('course cards are visible', async ({ page }) => {
    test.setTimeout(18_000);
    await routeToFrontpage(page, false);
    const cardContainer = page.locator('.not-logged-in-page--layout .card-container');
    const cards = cardContainer.locator('.card-instance');
    await expect(cards.first()).toBeVisible();
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('new tag is visible on at least one card', async ({ page }) => {
    await routeToFrontpage(page, false);
    const cardContainer = page.locator('.not-logged-in-page--layout .card-container');
    const newTags = cardContainer.locator('.new-flag-text:has-text("Ny")');
    const count = await newTags.count();
    if (count === 0) test.skip(); // no cards with "Ny" tag in this environment
    await newTags.first().waitFor({ state: 'visible' });
  });

  test('filter resets card list', async ({ page }) => {
    test.setTimeout(12_000);
    await routeToFrontpage(page, false);
    const cardContainer = page.locator('.not-logged-in-page--layout .card-container');
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

  test('login and logout with basic auth', async ({ browser }) => {
    test.setTimeout(24_000);
    test.skip(!hasCredentials(), 'KOMP_CANVAS_*_USERNAME not set — skipping auth test');
    // Use an isolated context (incognito) so the logout does not invalidate the
    // shared Canvas session that other parallel tests may be using.
    const context = await browser.newContext();
    const isolatedPage = await context.newPage();
    try {
      await loginWithBasicAuth(isolatedPage);
      await logout(isolatedPage);
    } finally {
      await context.close();
    }
  });
});
