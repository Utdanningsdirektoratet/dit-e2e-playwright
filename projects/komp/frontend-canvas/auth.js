/**
 * Authentication helpers for komp/frontend-canvas tests.
 *
 * Handles Canvas LMS basic authentication (username + password).
 * Only chromium is configured (see deviceFilter in config.json).
 *
 * When credentials are missing the test is skipped (not failed),
 * so unauthenticated tests still run without any env setup.
 *
 * Env vars (set in .env or CI secrets):
 *   KOMP_CANVAS_CHROMIUM_USERNAME / KOMP_CANVAS_CHROMIUM_PASSWORD
 *
 * The Canvas login/logout form interactions are handled by the shared module:
 * @see shared/canvas/auth.js
 */
import { expect } from '@playwright/test';
import { canvasBaseURL } from './env.js';
import { loginCanvasForm, logoutCanvas } from '../../../shared/canvas/auth.js';

function resolveCredentials() {
  return {
    username: process.env.KOMP_CANVAS_CHROMIUM_USERNAME ?? '',
    password: process.env.KOMP_CANVAS_CHROMIUM_PASSWORD ?? '',
  };
}

/**
 * Returns true when credentials are configured.
 * Spec files use this to skip auth-dependent tests gracefully.
 */
export function hasCredentials() {
  const { username, password } = resolveCredentials();
  return username !== '' && password !== '';
}

/**
 * Log in to Canvas LMS via basic (username/password) authentication.
 * @param {import('@playwright/test').Page} page
 */
export async function loginWithBasicAuth(page) {
  const { username, password } = resolveCredentials();
  expect(username, 'KOMP_CANVAS_*_USERNAME env var is not set').not.toBe('');
  expect(password, 'KOMP_CANVAS_*_PASSWORD env var is not set').not.toBe('');
  await loginCanvasForm(page, canvasBaseURL, username, password, '/login/canvas?normalLogin=1&design=udir');
  // Confirm login in the UDIR context — navigate to the frontpage and wait for the header
  await page.goto(`${canvasBaseURL}/search/all_courses?design=udir`);
  await page
    .locator('.header__link', { hasText: 'Logg ut' })
    .waitFor({ state: 'visible', timeout: 30_000 });
}

export async function logout(page) {
  await logoutCanvas(page);
}
