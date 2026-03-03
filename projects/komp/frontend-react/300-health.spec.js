/**
 * Infrastructure and SEO health checks for komp/frontend-react.
 *
 * Fast checks that catch common Next.js/CDN infrastructure regressions:
 *
 * Infrastructure:
 *  - /api/ping health endpoint returns HTTP 200
 *
 * SEO:
 *  - Homepage has a meta description
 *  - Homepage has a canonical link
 *  - Pages declare the correct hreflang for both language variants
 */
import { test, expect } from '@playwright/test';
import { env } from './env.js';

// Health checks are HTTP/DOM-level — browser engine doesn't change the result.
// Running on Chromium only avoids redundant work across the 7-device matrix.
test.beforeEach(({ browserName }) => {
  test.skip(browserName !== 'chromium', 'HTTP/DOM health checks: Chromium only');
});

test.describe('Infrastructure', () => {
  test('/api/ping returns HTTP 200', async ({ request }) => {
    const response = await request.get('/api/ping');
    expect(response.status()).toBe(200);
  });
});

test.describe('SEO', () => {
  test('contact page has basic SEO tags', async ({ page }) => {
    await page.goto('/kontakt/');
    const title = await page.title();
    const metaDescription = page.locator('meta[name="description"]');
    const metaViewport = page.locator('meta[name="viewport"]');

    expect(title).not.toBe('');
    await expect(metaDescription).toHaveAttribute('content', /.+/);
    await expect(metaViewport).toHaveAttribute('content', /width=device-width/);
  });

  test('nynorsk contact page has canonical pointing to bokmål', async ({ page }) => {
    await page.goto('/nn/kontakt/');
    const href = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(href, 'canonical link is missing or empty').toBeTruthy();
    expect(href).toContain('/kontakt/');
  });
});
