import { expect } from "@playwright/test";

/**
 * Dismiss the cookie consent banner if it is visible.
 *
 * The banner must be dismissed before interacting with elements it overlaps
 * (e.g. the Målform language button on mobile viewports). Uses waitFor() with
 * a short timeout so tests don't stall on pages where the banner is absent.
 *
 * @param {import('@playwright/test').Page} page
 */
export async function dismissCookieBanner(page) {
  const cookieBtn = page.locator(".cookie-banner button");
  const visible = await cookieBtn
    .waitFor({ state: "visible", timeout: 2000 })
    .then(
      () => true,
      () => false,
    );
  if (visible) {
    await cookieBtn.click();
    await expect(cookieBtn).not.toBeVisible();
  }
}
