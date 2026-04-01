/**
 * Canvas LMS header assertions.
 *
 * Standard assertions for authenticated and unauthenticated header states.
 * Canvas header structure is identical across all Instructure instances.
 * See: README.md § Adding a Project for usage pattern.
 */

/**
 * Assert that a Canvas navigation header shows only the login button (unauthenticated state).
 *
 * Verifies:
 * - Exactly 1 header link ("Logg inn")
 * - Sub-navigation bar is not visible
 *
 * @param {import('@playwright/test').Locator} headerLocator
 */
export async function assertCanvasHeaderUnauthenticated(headerLocator) {
  const { expect } = await import("@playwright/test");

  const links = headerLocator.locator(
    ".header__link-list > .header__list-item a.header__link",
  );
  const subNavBar = headerLocator.locator(".nav-bar-container");

  await expect(links).toHaveCount(1);
  const linkText = await links.first().textContent();
  expect(linkText).toContain("Logg inn");
  await expect(subNavBar).not.toBeVisible();
}

/**
 * Assert that a Canvas navigation header shows authenticated links.
 *
 * Verifies:
 * - 2+ header links including "Innstillinger" and "Logg ut"
 * - Sub-navigation bar is visible with 2 links
 *
 * @param {import('@playwright/test').Locator} headerLocator
 */
export async function assertCanvasHeaderAuthenticated(headerLocator) {
  const { expect } = await import("@playwright/test");

  const links = headerLocator.locator(
    ".header__link-list > .header__list-item a.header__link",
  );
  const subNavBar = headerLocator.locator(".nav-bar-container");

  const linkCount = await links.count();
  expect(linkCount).toBeGreaterThanOrEqual(2);

  // Both action links are present
  for (const text of ["Innstillinger", "Logg ut"]) {
    const match = links.filter({ hasText: text });
    await expect(match.first()).toBeVisible();
  }

  // Sub-nav bar shows My Courses + All Courses
  await expect(subNavBar).toBeVisible();
  const subLinks = subNavBar.locator(".nav-bar__link");
  await expect(subLinks).toHaveCount(2);
}
