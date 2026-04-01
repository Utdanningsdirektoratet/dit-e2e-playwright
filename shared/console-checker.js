/**
 * Attach to a Playwright page to collect console errors and warnings.
 * Pass a whitelist of regex patterns to ignore known third-party noise.
 *
 * Usage:
 *   const checker = createConsoleChecker(page, [/matomo/i]);
 *   await page.goto('/some-page');
 *   expect(checker.errors).toEqual([]);
 *   expect(checker.warnings).toEqual([]);
 */
export function createConsoleChecker(page, whitelist = []) {
  const errors = [];
  const warnings = [];

  function isWhitelisted(text) {
    return whitelist.some((pattern) => pattern.test(text));
  }

  page.on("console", (msg) => {
    const text = msg.text();
    if (isWhitelisted(text)) return;
    if (msg.type() === "error") errors.push(text);
    if (msg.type() === "warning") warnings.push(text);
  });

  page.on("pageerror", (err) => {
    const text = err.message;
    if (isWhitelisted(text)) return;
    errors.push(`[pageerror] ${text}`);
  });

  return { errors, warnings };
}
