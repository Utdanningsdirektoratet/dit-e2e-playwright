/**
 * Internal link health checker — reusable across projects.
 *
 * Extracts all internal links from a loaded page and HEAD-checks each one
 * for HTTP errors. Catches broken links (deleted, renamed, or never created
 * pages) before users encounter them.
 *
 * Typical usage:
 *
 *   const links = await extractInternalLinks(page);
 *   const broken = await checkLinks(request, links, { concurrency: 3 });
 *   expect(broken, formatBrokenLinks(broken)).toHaveLength(0);
 *
 * extractInternalLinks returns deduplicated pathnames ("/about/", "/nn/contact/").
 * The caller filters out any paths that should be excluded (e.g. client-side-only
 * routes that return 404 at the server level but render fine via React routing).
 *
 * checkLinks uses request.head() — the Playwright APIRequestContext — which
 * goes through the browser's network stack and respects proxy settings.
 * Network-level failures (CDN/TLS rejection) are silently skipped; only
 * explicit HTTP 4xx/5xx responses are reported as broken links.
 */
/**
 * Extract all unique internal link pathnames from the current page.
 *
 * Only href attributes starting with "/" are considered internal.
 * Anchors ("#section"), external URLs, and javascript: hrefs are excluded.
 * Query strings and hash fragments are stripped — only the pathname is returned.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string[]>}  Deduplicated pathnames, e.g. ["/about/", "/nn/contact/"]
 */
export async function extractInternalLinks(page) {
  const hrefs = await page.evaluate(() => {
    return [...document.querySelectorAll('a[href^="/"]')]
      .map((a) => {
        try {
          return new URL(a.href).pathname;
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  });
  return [...new Set(hrefs)];
}

/**
 * @typedef {{ link: string, status: number }} BrokenLink
 */

/**
 * HEAD-check a list of internal paths for HTTP errors.
 *
 * Uses request.head() (Playwright APIRequestContext) so checks run through
 * the browser's network stack and respect proxy settings.
 *
 * Network-level failures (connection refused, TLS errors) are silently
 * skipped — those are infrastructure problems, not broken links.
 * Only explicit HTTP 4xx/5xx responses are returned as broken.
 *
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {string[]} links          Pathnames to check (e.g. ["/about/"])
 * @param {{ concurrency?: number, timeout?: number }} [options]
 *   concurrency — max parallel requests per worker (default: 3)
 *   timeout     — per-request timeout in ms (default: 10_000)
 * @returns {Promise<BrokenLink[]>}
 */
export async function checkLinks(
  request,
  links,
  { concurrency = 3, timeout = 10_000 } = {},
) {
  const broken = [];
  const queue = [...links];

  async function worker() {
    while (queue.length > 0) {
      const link = queue.shift();
      try {
        const response = await request.head(link, { timeout });
        if (response.status() >= 400) {
          broken.push({ link, status: response.status() });
        }
      } catch {
        // Network-level failure (CDN down, TLS rejection, etc.).
        // Not a broken link — skip.
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, links.length) }, worker),
  );
  return broken;
}

/**
 * Format broken link results for a readable expect() failure message.
 *
 * @param {BrokenLink[]} broken
 * @returns {string}
 */
export function formatBrokenLinks(broken) {
  const lines = broken.map(({ status, link }) => `  [HTTP ${status}] ${link}`);
  return `Broken internal links found:\n${lines.join("\n")}`;
}
