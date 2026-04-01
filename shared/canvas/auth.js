/**
 * Canvas LMS authentication helpers.
 *
 * Reusable login/logout for any Canvas instance. Projects provide credentials
 * and baseURL. See: README.md § Adding a Project for usage pattern.
 */

/**
 * Log in to a Canvas LMS instance via the standard login form.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} canvasBaseURL
 * @param {string} username
 * @param {string} password
 * @param {string} [loginPath]
 */
export async function loginCanvasForm(
  page,
  canvasBaseURL,
  username,
  password,
  loginPath = "/login/canvas?normalLogin=1",
) {
  await page.goto(`${canvasBaseURL}${loginPath}`, {
    waitUntil: "domcontentloaded",
  });
  await page.locator("#login_form").waitFor({ state: "visible" });

  await page.locator("#pseudonym_session_unique_id").fill(username);
  await page.locator("#pseudonym_session_password").fill(password);
  await page.locator("input.Button--login").click();

  // Canvas staging under parallel load may reject the first attempt (session
  // conflict, rate limit) and re-render the login form. Retry with fresh
  // credentials if the form is still visible after 10s.
  const formGone = await page
    .locator("#login_form")
    .waitFor({ state: "hidden", timeout: 10_000 })
    .then(
      () => true,
      () => false,
    );
  if (!formGone) {
    await page.locator("#pseudonym_session_unique_id").fill(username);
    await page.locator("#pseudonym_session_password").fill(password);
    await page.locator("input.Button--login").click();
    await page
      .locator("#login_form")
      .waitFor({ state: "hidden", timeout: 30_000 });
  }
}

/**
 * Log out from a Canvas LMS instance via the standard logout flow.
 *
 * @param {import('@playwright/test').Page} page
 */
export async function logoutCanvas(page) {
  await page
    .locator(".header__link", { hasText: "Logg ut" })
    .waitFor({ state: "visible" });
  await page
    .locator(".header__content a.header__link", { hasText: "Logg ut" })
    .click();

  page.on("dialog", (dialog) => dialog.accept());

  await page
    .locator("h1.ic-Login__title", { hasText: "Logg ut" })
    .waitFor({ state: "visible" });
  await page.locator(".ic-Login button", { hasText: "Logg ut" }).click();
  await page
    .locator(".header__link", { hasText: "Logg ut" })
    .waitFor({ state: "hidden" });
}
