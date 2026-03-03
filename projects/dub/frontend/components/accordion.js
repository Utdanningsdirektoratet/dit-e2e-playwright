/**
 * Detect and test expandable/accordion sections.
 * dubestemmer.no uses .toggle-article buttons with aria-expanded to
 * show/hide .hidden-article-block content.
 */
import { expect } from '@playwright/test';

export const SELECTOR = '.toggle-article';

export async function detect(page) {
  return (await page.locator(SELECTOR).count()) > 0;
}

export async function test(page) {
  const toggles = page.locator(SELECTOR);
  const first = toggles.first();
  await expect(first).toBeVisible();

  const initial = await first.getAttribute('aria-expanded');

  // Scroll into view before clicking — on mobile viewports the toggle may be
  // below the fold, causing the click to silently miss on WebKit.
  await first.scrollIntoViewIfNeeded();

  // Toggle open — use toHaveAttribute() so Playwright auto-retries until the
  // DOM settles, rather than reading the attribute synchronously after click()
  // which can race against the animation/state update.
  await first.click();
  await expect(first).toHaveAttribute('aria-expanded', initial === 'true' ? 'false' : 'true');

  // Restore original state — scroll again before clicking because opening the
  // accordion can shift the page layout, pushing the toggle off-screen on mobile
  // viewports and causing WebKit to silently miss the click.
  await first.scrollIntoViewIfNeeded();
  await first.click();
  await expect(first).toHaveAttribute('aria-expanded', initial ?? 'false');
}
