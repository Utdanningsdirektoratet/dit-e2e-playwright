// NOTE: On dubestemmer.no most navigation links live inside the hamburger menu
// (#offcanvas-menu). Tests open it first to match the actual user flow.
// Tests cover all navigation surfaces: hamburger, footer, language, school-level,
// in-page level switch (.btn-switch-container), and anchor menu section links.
//
// Each interaction test also asserts no console errors/warnings are produced by
// that specific interaction — the snapshot pattern (errsBefore/after) isolates
// interaction-triggered JS from unrelated page-load noise.
import { test, expect } from '@playwright/test';
import { createConsoleChecker } from '../../../shared/console-checker.js';
import { CONSOLE_WHITELIST } from './console-whitelist.js';
import { dismissCookieBanner } from './helpers.js';

const TOPIC_PAGE = '/tema/mellomtrinn/personvern/';

test.describe('Navigation', () => {
  // Production CDN can be slow to satisfy the waitUntil:'load' event — give
  // navigation tests 90 s so page.goto() doesn't exhaust the test timeout on
  // occasional slow loads.  Stage is unaffected (always well under budget).
  test.setTimeout(90_000);

  // ── Hamburger / offcanvas menu ──────────────────────────────────────────

  test('hamburger menu opens, navigates, and produces no console errors', async ({ page }) => {
    const checker = createConsoleChecker(page, CONSOLE_WHITELIST);
    await page.goto('/');
    const errsBefore = checker.errors.length;
    const warnsBefore = checker.warnings.length;

    await page.locator('#burger-menu').click();
    const menu = page.locator('#offcanvas-menu');
    await expect(menu).toBeVisible();
    const menuLink = menu.locator('a').first();
    await expect(menuLink).toBeVisible();
    await menuLink.click();
    await expect(page).toHaveTitle(/.+/);

    const newErrors = checker.errors.slice(errsBefore);
    const newWarnings = checker.warnings.slice(warnsBefore);
    expect(newErrors, `Console errors after menu open/navigate:\n${newErrors.join('\n')}`).toEqual([]);
    expect(newWarnings, `Console warnings after menu open/navigate:\n${newWarnings.join('\n')}`).toEqual([]);
  });

  test('hamburger menu toggle (open + close) produces no console errors', async ({ page }) => {
    const checker = createConsoleChecker(page, CONSOLE_WHITELIST);
    await page.goto('/');
    const errsBefore = checker.errors.length;
    const warnsBefore = checker.warnings.length;

    await page.locator('#burger-menu').click();
    await expect(page.locator('#offcanvas-menu')).toBeVisible();
    await page.locator('#burger-menu').click();
    await expect(page.locator('#offcanvas-menu')).not.toBeVisible();

    const newErrors = checker.errors.slice(errsBefore);
    const newWarnings = checker.warnings.slice(warnsBefore);
    expect(newErrors, `Console errors after menu toggle:\n${newErrors.join('\n')}`).toEqual([]);
    expect(newWarnings, `Console warnings after menu toggle:\n${newWarnings.join('\n')}`).toEqual([]);
  });

  test('navigate to topic page via menu and back home', async ({ page }) => {
    await page.goto('/');
    await page.locator('#burger-menu').click();
    const topicLink = page.locator('#offcanvas-menu a[href*="/tema/"]').first();
    await expect(topicLink).toBeVisible();
    await topicLink.click();
    await expect(page).toHaveTitle(/.+/);
    // Navigate back via logo.
    // The CMS appends ?epslanguage=… on some browsers — assert only the pathname.
    await page.locator('.db-home-link').click();
    await page.waitForURL((url) => new URL(url).pathname === '/');
  });

  test('film overview is reachable via menu', async ({ page }) => {
    await page.goto('/');
    // /filmoversikt/ only exists in the hamburger menu
    await page.locator('#burger-menu').click();
    await page.locator('#offcanvas-menu a[href*="filmoversikt"]').click();
    await expect(page).toHaveURL(/filmoversikt/);
    await expect(page).toHaveTitle(/.+/);
  });

  test('teacher guide is reachable via menu', async ({ page }) => {
    await page.goto('/');
    await page.locator('#burger-menu').click();
    await page.locator('#offcanvas-menu a[href*="/larer/"]').first().click();
    await expect(page).toHaveURL(/larer/);
    await expect(page).toHaveTitle(/.+/);
  });

  // ── Language / school-level ─────────────────────────────────────────────

  test('language switcher round-trip bokmål ↔ nynorsk produces no console errors', async ({
    page,
    browserName,
  }) => {
    // TODO: Language switch triggers AxiosError: Network Error on WebKit
    // (CORS/SameSite issue in the application). Remove skip once fixed.
    test.skip(browserName === 'webkit', 'AxiosError: Network Error on WebKit during language switch — application bug');
    const checker = createConsoleChecker(page, CONSOLE_WHITELIST);
    await page.goto('/');
    await dismissCookieBanner(page);

    const errsBefore = checker.errors.length;
    const warnsBefore = checker.warnings.length;

    // Desktop uses a header link; mobile/tablet uses the footer "Målform" button
    const desktopLink = page.locator('.global-language-link-item');
    const isMobile = (await desktopLink.isVisible().catch(() => false)) === false;
    if (isMobile) {
      await page.locator('button:has-text("Målform")').click();
      await page.getByRole('link', { name: /nynorsk/i }).click();
    } else {
      await desktopLink.click();
    }
    await expect(page).toHaveURL(/\/nn(\/|$)/);

    if (isMobile) {
      await page.locator('button:has-text("Målform")').click();
      await page.getByRole('link', { name: /bokmål/i }).click();
    } else {
      await page.locator('.global-language-link-item').click();
    }
    await expect(page).not.toHaveURL(/\/nn(\/|$)/);

    const newErrors = checker.errors.slice(errsBefore);
    const newWarnings = checker.warnings.slice(warnsBefore);
    expect(newErrors, `Console errors after language switch:\n${newErrors.join('\n')}`).toEqual([]);
    expect(newWarnings, `Console warnings after language switch:\n${newWarnings.join('\n')}`).toEqual([]);
  });

  test('homepage shows both school levels', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h3').filter({ hasText: /mellomtrinn/i }).first()).toBeVisible();
    await expect(page.locator('h3').filter({ hasText: /ungdom/i }).first()).toBeVisible();
  });

  test('school-level switch navigates between levels and produces no console errors', async ({
    page,
    browserName,
  }) => {
    // TODO: Axios network request fails on WebKit with AxiosError: Network Error.
    // Likely a CORS preflight or SameSite cookie issue. Remove skip once fixed.
    test.skip(browserName === 'webkit', 'AxiosError: Network Error on WebKit during school-level switch — application bug');
    const checker = createConsoleChecker(page, CONSOLE_WHITELIST);
    await page.goto(TOPIC_PAGE);

    const errsBefore = checker.errors.length;
    const warnsBefore = checker.warnings.length;

    const switchLink = page.locator('.barn-ungdom-btn-switch a').first();
    await expect(switchLink).toBeVisible();
    await switchLink.click();
    await expect(page).toHaveURL(/ungdom/);
    await expect(page).toHaveTitle(/.+/);

    const newErrors = checker.errors.slice(errsBefore);
    const newWarnings = checker.warnings.slice(warnsBefore);
    expect(newErrors, `Console errors after school-level switch:\n${newErrors.join('\n')}`).toEqual([]);
    expect(newWarnings, `Console warnings after school-level switch:\n${newWarnings.join('\n')}`).toEqual([]);
  });

  test('in-page level switch is interactive (.btn-switch-container)', async ({ page }) => {
    await page.goto(TOPIC_PAGE);
    const switchContainer = page.locator('.btn-switch-container');
    const containerVisible = await switchContainer.isVisible().catch(() => false);
    test.skip(!containerVisible, '.btn-switch-container not present on this page');
    const items = switchContainer.locator('a, button');
    await expect(items.first()).toBeVisible();
    await items.first().click();
    await expect(page).toHaveTitle(/.+/);
  });

  // ── Cookie banner ────────────────────────────────────────────────────────

  test('cookie consent banner is present and dismissible', async ({ page }) => {
    await page.goto('/');
    const banner = page.locator('.cookie-banner');
    await expect(banner, 'Cookie consent banner should be visible on first visit').toBeVisible();
    const closeBtn = banner.locator('button');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(banner).not.toBeVisible();
  });

  test('cookie banner has a privacy information link', async ({ page }) => {
    await page.goto('/');
    const bannerLink = page.locator('.cookie-banner a[href]');
    await expect(
      bannerLink,
      'Cookie banner must include a link to privacy/cookie information',
    ).toBeVisible();
    const href = await bannerLink.getAttribute('href');
    expect(href, 'Cookie banner link href must not be empty').toBeTruthy();
  });

  // ── Footer ──────────────────────────────────────────────────────────────

  test('footer navigation links are present and reachable', async ({ page }) => {
    await page.goto('/');
    await dismissCookieBanner(page);
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    const internalLinks = footer.locator('a[href^="/"]');
    await expect(internalLinks.first()).toBeVisible();
    await internalLinks.first().click();
    await expect(page).toHaveTitle(/.+/);
  });

  // ── Anchor menu (topic page section shortcuts) ──────────────────────────

  test('topic page anchor menu navigates between sections', async ({ page }) => {
    await page.goto(TOPIC_PAGE);
    const anchorMenu = page.locator('.anchor-menu-container');
    // Use waitFor so WebKit (which finalises rendering after the load event)
    // has time to make the menu visible before we decide to skip.
    // On mobile viewports the menu is genuinely absent — waitFor times out quickly.
    const menuVisible = await anchorMenu.waitFor({ state: 'visible', timeout: 3000 })
      .then(() => true)
      .catch(() => false);
    // Anchor menu collapses on mobile viewports — skip rather than fail
    test.skip(!menuVisible, 'Anchor menu not visible on this viewport (mobile)');
    const sectionLink = anchorMenu.locator('a[href^="#"]').first();
    await expect(sectionLink).toBeVisible();
    await sectionLink.click();
    await expect(page).toHaveURL(/#/);
  });
});
