/**
 * Browser console error and warning checks for komp/frontend-react.
 *
 * 1. KEY PAGES IN ISOLATION — each page loaded in a fresh context.
 *    Catches errors/warnings that only fire on a cold first load
 *    (e.g. missing module, race condition on first paint).
 *
 * 2. INTERACTION-BASED CHECKS — language navigation.
 *    These actions can trigger lazy-loaded JS not exercised by passive
 *    page loads.
 *
 * Both console.error and console.warn are asserted — warnings often
 * precede errors in the next release.
 */
import { test, expect } from '@playwright/test';
import { createConsoleChecker } from '../../../shared/console-checker.js';
import { CONSOLE_WHITELIST } from './console-whitelist.js';

// ── 1. Key pages in isolation ─────────────────────────────────────────────────

const KEY_PAGES = [
  ['homepage (bokmål)', '/'],
  ['homepage (nynorsk)', '/nn/'],
  ['about page', '/om-kompetanseportalen/'],
  ['contact page', '/kontakt/'],
  ['privacy page', '/personvern/'],
];

test.describe('Console — Pages', () => {
  for (const [label, path] of KEY_PAGES) {
    test(`no console errors or warnings on ${label}`, async ({ page }) => {
      const checker = createConsoleChecker(page, CONSOLE_WHITELIST);
      await page.goto(path);
      expect(
        checker.errors,
        `Console errors on ${path}:\n${checker.errors.join('\n')}`,
      ).toEqual([]);
      expect(
        checker.warnings,
        `Console warnings on ${path}:\n${checker.warnings.join('\n')}`,
      ).toEqual([]);
    });
  }
});

// ── 2. Interaction-based checks ───────────────────────────────────────────────

test.describe('Console — Interactions', () => {
  test('language switch bokmål → nynorsk produces no console errors', async ({ page }) => {
    const checker = createConsoleChecker(page, CONSOLE_WHITELIST);
    await page.goto('/');

    const errsBefore = checker.errors.length;
    const warnsBefore = checker.warnings.length;

    await page.goto('/nn/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'nn');

    const newErrors = checker.errors.slice(errsBefore);
    const newWarnings = checker.warnings.slice(warnsBefore);
    expect(newErrors, `Console errors after language switch:\n${newErrors.join('\n')}`).toEqual([]);
    expect(
      newWarnings,
      `Console warnings after language switch:\n${newWarnings.join('\n')}`,
    ).toEqual([]);
  });
});
