/**
 * Routing tests for komp/frontend-react.
 *
 * Verifies that key page templates are reachable and contain the expected
 * headings. A failure here indicates a routing regression in the Next.js
 * configuration or a broken page component.
 */
import { test, expect } from '@playwright/test';

const ROUTES = [
  { path: '/om-kompetanseportalen/', heading: 'Om kompetanseportalen' },
  { path: '/kontakt/', heading: 'Kontakt' },
  { path: '/personvern/', heading: 'Personvernerklæring' },
];

test.describe('Routing', () => {
  test('404 page returns HTTP 404 and has title', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist-playwright-e2e-check');
    expect(
      response.status(),
      'missing page should return HTTP 404, not 200 (soft-404)',
    ).toBe(404);
    await expect(page).toHaveTitle(/.+/);
  });

  for (const { path, heading } of ROUTES) {
    test(`${path} renders correct heading`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('main h1')).toContainText(heading);
    });
  }
});
