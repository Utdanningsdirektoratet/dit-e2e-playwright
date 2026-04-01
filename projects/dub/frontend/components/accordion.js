/**
 * Detect and test expandable/accordion sections.
 * dubestemmer.no uses .toggle-article buttons with aria-expanded to
 * show/hide .hidden-article-block content.
 */
import { expect } from "@playwright/test";

export const SELECTOR = ".toggle-article";

export async function detect(page) {
  return (await page.locator(SELECTOR).count()) > 0;
}

export async function test(page) {
  const toggles = page.locator(SELECTOR);
  const first = toggles.first();
  await expect(first).toBeVisible();

  const initial = await first.getAttribute("aria-expanded");

  // dispatchEvent fires the click synchronously through the browser's native
  // event system. Playwright's click() uses synthetic mouse events which the
  // DUB site's jQuery accordion handler doesn't reliably receive on Firefox.
  await first.scrollIntoViewIfNeeded();
  await first.dispatchEvent("click");
  await expect(first).toHaveAttribute(
    "aria-expanded",
    initial === "true" ? "false" : "true",
  );

  // Restore original state
  await first.scrollIntoViewIfNeeded();
  await first.dispatchEvent("click");
  await expect(first).toHaveAttribute("aria-expanded", initial ?? "false");
}
