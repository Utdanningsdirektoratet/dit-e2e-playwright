/**
 * Canvas LMS authentication helpers.
 *
 * Reusable login/logout for any Canvas instance. Projects provide credentials
 * and baseURL. See: README.md § Adding a Project for usage pattern.
 */

/**
 * Log in to a Canvas LMS instance via the standard login form.
 *
 * Assumes the Canvas instance is at the standard /login/canvas endpoint
 * with the standard form structure.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} canvasBaseURL — Canvas instance root URL (e.g., "https://bibsys.instructure.com")
 * @param {string} username
 * @param {string} password
 * @param {string} [loginPath] — login path + query string (defaults to "/login/canvas?normalLogin=1")
 */
export async function loginCanvasForm(page, canvasBaseURL, username, password, loginPath = '/login/canvas?normalLogin=1') {
  await page.goto(`${canvasBaseURL}${loginPath}`);
  await page.locator('#login_form').waitFor({ state: 'visible' });

  await page.locator('#pseudonym_session_unique_id').fill(username);
  await page.locator('#pseudonym_session_password').fill(password);
  await page.locator('input.Button--login').click();

  // Wait for login to complete: Canvas redirects away from the login page
  await page.waitForURL((url) => !url.href.includes('/login'), { timeout: 30_000 });
}

/**
 * Log out from a Canvas LMS instance via the standard logout flow.
 *
 * @param {import('@playwright/test').Page} page
 */
export async function logoutCanvas(page) {
  await page.locator('.header__link', { hasText: 'Logg ut' }).waitFor({ state: 'visible' });
  await page.locator('.header__content a.header__link', { hasText: 'Logg ut' }).click();

  // Confirm logout
  await page.locator('h1.ic-Login__title', { hasText: 'Logg ut' }).waitFor({ state: 'visible' });
  await page.locator('.ic-Login button', { hasText: 'Logg ut' }).click();
  await page.locator('.header__link', { hasText: 'Logg ut' }).waitFor({ state: 'hidden' });
}
