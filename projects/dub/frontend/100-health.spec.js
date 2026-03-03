/**
 * Infrastructure and SEO checks for DUB frontend.
 * Catches regressions that page-load tests miss: soft-404s, empty meta/OG
 * tags, hreflang. All tests run Chromium only.
 * NOTE: robots.txt is not served by dubestemmer.no — test omitted.
 * Some checks can be disabled per environment via config.json.
 */
import { test, expect } from '@playwright/test';
import { env } from './env.js';

const disabled = env.disabledHealthChecks ?? [];

// Health checks are HTTP/DOM-level — browser engine doesn't change the result.
// Running on Chromium only avoids 3× duplicate work across the 4-browser matrix.
test.beforeEach(({ browserName }) => {
  test.skip(browserName !== 'chromium', 'HTTP/DOM health checks: Chromium only');
});

test.describe('Infrastructure', () => {
  test('unknown URL returns HTTP 404', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist-playwright-e2e-check');
    expect(
      response.status(),
      'missing page should return HTTP 404, not 200 (soft-404) or 500 (server error)',
    ).toBe(404);
    await expect(page, 'custom 404 page should still have a title').toHaveTitle(/.+/);
  });
});

test.describe('SEO', () => {
  test('homepage has a meta description', async ({ page }) => {
    await page.goto('/');
    const content = await page.locator('meta[name="description"]').getAttribute('content');
    expect(content, 'homepage meta description is missing or empty').toBeTruthy();
  });

  test('homepage has Open Graph title and image', async ({ page }) => {
    await page.goto('/');
    const ogTitle = await page
      .locator('meta[property="og:title"]')
      .getAttribute('content');
    expect(ogTitle, 'og:title is missing or empty').toBeTruthy();

    const ogImage = await page
      .locator('meta[property="og:image"]')
      .getAttribute('content');
    expect(ogImage, 'og:image is missing or empty').toBeTruthy();
  });

  test('homepage declares hreflang for nynorsk (nn) variant', async ({ page }) => {
    test.skip(disabled.includes('hreflang'), 'hreflang disabled for this environment in config.json');
    await page.goto('/');
    const hreflangs = page.locator('link[rel="alternate"][hreflang]');
    await expect(hreflangs, 'no hreflang links found').not.toHaveCount(0);

    const nnLink = page.locator('link[rel="alternate"][hreflang="nn"]');
    await expect(nnLink, 'hreflang="nn" missing — nynorsk variant not declared to search engines').toHaveCount(1);
  });
});

test.describe('Legal', () => {
  // Both links are legally mandatory in Norway (universell utforming regulation + GDPR).

  test('footer has tilgjengelighetserklæring (universal design declaration) link', async ({ page }) => {
    await page.goto('/');
    const link = page.locator('a[href*="uustatus.no"]');
    await expect(
      link,
      'Tilgjengelighetserklæring link pointing to uustatus.no must be present in the footer',
    ).toBeVisible();
  });

  test('footer has personvernerklæring (privacy policy) link and page is reachable', async ({
    page,
    request,
  }) => {
    await page.goto('/');
    const link = page.locator('footer a[href*="personvernerklaring"]');
    await expect(
      link.first(),
      'Personvernerklæring link must be present in the footer',
    ).toBeVisible();

    const response = await request.head('/personvernerklaring/');
    expect(
      response.status(),
      'Privacy policy page returned an HTTP error — the footer link is broken',
    ).toBeLessThan(400);
  });
});
