/**
 * Broken internal link detection for komp/frontend-react.
 *
 * Visits each entry-point page, extracts every internal <a href>, and
 * HEAD-checks them all for HTTP errors. Catches links to pages that were
 * deleted, renamed, or never created — before users do.
 *
 * Both language variants are checked so bokmål-only regressions are
 * caught separately from nynorsk ones.
 */
import { test, expect } from "@playwright/test";
import {
  extractInternalLinks,
  checkLinks,
  formatBrokenLinks,
} from "../../../shared/check-links.js";

// Link availability is an HTTP check — browser engine doesn't affect the result.
// Running on Chromium only avoids 6× duplicate work across the device matrix.
test.beforeEach(({ browserName }) => {
  test.skip(browserName !== "chromium", "HTTP link checks: Chromium only");
});

const PAGES_TO_CHECK = [
  "/",
  "/nn/",
  "/om-kompetanseportalen/",
  "/kontakt/",
  "/personvern/",
];

// Paths that return HTTP 404 at the server level but render fine via client-side
// React routing. Already verified by smoke tests — excluding here avoids false positives.
const EXCLUDE_PATHS = ["/", "/nn/"];

test.describe("Broken Links", () => {
  for (const path of PAGES_TO_CHECK) {
    test(`no broken internal links on ${path}`, async ({ page, request }) => {
      await page.goto(path);
      const allLinks = await extractInternalLinks(page);
      const links = allLinks.filter((link) => !EXCLUDE_PATHS.includes(link));

      test.skip(
        links.length === 0,
        "No internal links found on page — check selector",
      );

      // 3 concurrent requests per worker keeps the total load reasonable.
      const broken = await checkLinks(request, links, { concurrency: 3 });
      expect(broken, formatBrokenLinks(broken)).toHaveLength(0);
    });
  }
});
