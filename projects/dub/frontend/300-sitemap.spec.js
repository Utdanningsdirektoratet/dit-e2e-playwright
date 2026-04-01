/**
 * Sitemap-driven E2E tests for DUB frontend.
 *
 * Sitemap paths are grouped by their first URL segment so the dashboard
 * shows one test per section (tema, larer, aktuelt, …) rather than one
 * test per page. Each page is a test.step inside its group, making failures
 * easy to locate in the HTML report while keeping the top-level count small.
 *
 * Per-page checks:
 *  1. Page loads with HTTP status < 400
 *  2. Page has a <title>
 *  3. Interactive components are detected and tested
 *  4. Required components (page-requirements.js) must be present
 *  5. No unexpected console errors or warnings
 *  6. No broken internal links (Chromium only — HTTP-level check, browser
 *     engine does not affect the result)
 *
 * All pages in a group run even when one fails — failures are collected
 * and reported together at the end of the group test.
 *
 * Large groups (> SITEMAP_FULL_THRESHOLD pages) test a random subset each run;
 * small groups always run in full. Coverage accumulates over many runs by chance.
 */
import { test, expect } from "@playwright/test";
import { fetchSitemapPaths } from "../../../shared/sitemap.js";
import { randomSample } from "../../../shared/sampling.js";
import { createConsoleChecker } from "../../../shared/console-checker.js";
import {
  extractInternalLinks,
  checkLinks,
  formatBrokenLinks,
} from "../../../shared/check-links.js";
import { CONSOLE_WHITELIST } from "./console-whitelist.js";
import { getRequiredComponents } from "./page-requirements.js";
import { config, sitemapUrl, insecure } from "./env.js";
import * as slider from "./components/slider.js";
import * as filter from "./components/filter.js";
import * as accordion from "./components/accordion.js";
import * as anchorMenu from "./components/anchor-menu.js";
import * as embeddedContent from "./components/embedded-content.js";
import * as teacherGuidance from "./components/teacher-guidance.js";
// To add coverage for a new component: create components/<name>.js with
// detect(page) and test(page) exports, then add it to COMPONENTS below.

// Paths matching these patterns are skipped (e.g. broken category listing pages in sitemap)
const excludePatterns = (config.sitemapExclude || []).map((p) => new RegExp(p));

// Groups at or below this size run in full. Larger groups test a random subset.
const SITEMAP_FULL_THRESHOLD = 8;

const COMPONENTS = {
  slider,
  filter,
  accordion,
  anchorMenu,
  embeddedContent,
  teacherGuidance,
};

// Override labels only where auto-capitalization produces the wrong result
// (Norwegian æ/ø/å characters). Everything else capitalizes automatically —
// new URL segments appear in the dashboard without any code changes here.
const SEGMENT_LABELS = {
  larer: "Lærer",
  personvernerklaring: "Personvernerklæring",
};

function labelForSegment(seg) {
  return SEGMENT_LABELS[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1);
}

/**
 * Group paths by their parent URL segment (one level above the page).
 * Strips the /nn/ language prefix so both language variants land in the same group.
 *
 * Algorithm — take the second-to-last non-empty segment:
 *   /                              → "Home"          (root)
 *   /filmoversikt/                 → "Filmoversikt"  (1-level: use the segment itself)
 *   /aktuelt/some-article/         → "Aktuelt"       (2-level: use first)
 *   /tema/mellomtrinn/personvern/  → "Mellomtrinn"   (3-level: use second)
 *   /nn/tema/mellomtrinn/…         → "Mellomtrinn"   (same after prefix strip)
 *
 * No hardcoded section list — new URL structures appear automatically.
 */
function groupByParentSegment(paths) {
  const groups = new Map();
  for (const path of paths) {
    const normalized = path.replace(/^\/nn\//, "/");
    const segments = normalized.split("/").filter(Boolean);
    let segment;
    if (segments.length === 0) {
      segment = "home";
    } else if (segments.length === 1) {
      segment = segments[0];
    } else {
      segment = segments[segments.length - 2];
    }
    const label = labelForSegment(segment);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(path);
  }
  return groups;
}

// Top-level await — runs during file loading (test discovery), not inside a test.
// This is intentional: test names are derived from the sitemap, so the fetch must
// complete before Playwright registers the test.describe() block below.
// Trade-off: `npx playwright test --list` also hits the sitemap URL.
let paths;
let fetchError;

try {
  const allPaths = await fetchSitemapPaths(sitemapUrl, {
    rejectUnauthorized: !insecure,
  });
  paths = allPaths.filter((p) => !excludePatterns.some((re) => re.test(p)));
} catch (err) {
  fetchError = err;
}

if (fetchError) {
  test("sitemap fetch", () => {
    throw fetchError;
  });
} else if (paths.length === 0) {
  test("sitemap empty", () => {
    throw new Error(`Sitemap at ${sitemapUrl} returned no URLs`);
  });
} else {
  test.describe("Sitemap Pages", () => {
    const groups = groupByParentSegment(paths);

    for (const [group, groupPaths] of groups) {
      const pagesToTest = randomSample(groupPaths, SITEMAP_FULL_THRESHOLD);
      const label =
        pagesToTest.length < groupPaths.length
          ? `${group} (${pagesToTest.length}/${groupPaths.length} pages)`
          : group;

      test(label, async ({ page, request, browserName }) => {
        // Each page gets up to 50 s: navigation + component detection + link checks
        // + console checks. 5 s buffer added per group to absorb scheduling jitter.
        test.setTimeout(pagesToTest.length * 50_000 + 5_000);

        const checker = createConsoleChecker(page, CONSOLE_WHITELIST);
        const failures = [];

        for (const path of pagesToTest) {
          // Snapshot console state before visiting this page so we only
          // report errors produced by this specific navigation.
          const errsBefore = checker.errors.length;
          const warnsBefore = checker.warnings.length;

          try {
            await test.step(path, async () => {
              // Use domcontentloaded so the goto doesn't block on slow/broken
              // external resources (e.g. video iframes) before returning.
              const response = await page.goto(path, {
                waitUntil: "domcontentloaded",
              });
              expect(
                response.status(),
                `HTTP ${response.status()}`,
              ).toBeLessThan(400);
              await expect(page).toHaveTitle(/.+/);

              const required = getRequiredComponents(path);
              for (const [name, component] of Object.entries(COMPONENTS)) {
                const found = await component.detect(page);
                if (required.includes(name)) {
                  expect(found, `Required component "${name}" missing`).toBe(
                    true,
                  );
                }
                if (found) {
                  await test.step(name, () => component.test(page));
                }
              }

              // Chromium only — HTTP-level check, browser engine is irrelevant
              if (browserName === "chromium") {
                const links = await extractInternalLinks(page);
                const broken = await checkLinks(request, links);
                expect(broken, formatBrokenLinks(broken)).toHaveLength(0);
              }

              const pageErrors = checker.errors.slice(errsBefore);
              const pageWarnings = checker.warnings.slice(warnsBefore);
              expect(
                pageErrors,
                `Console errors:\n${pageErrors.join("\n")}`,
              ).toEqual([]);
              expect(
                pageWarnings,
                `Console warnings:\n${pageWarnings.join("\n")}`,
              ).toEqual([]);
            });
          } catch (err) {
            // Capture the failure and continue to the next page in this group.
            // Show up to 6 lines so console error messages are visible in the
            // summary (the first line is the label, e.g. "Console errors:").
            const detail = err.message.split("\n").slice(0, 6).join("\n    ");
            failures.push(`${path}\n    ${detail}`);
          }
        }

        if (failures.length > 0) {
          throw new Error(
            `${failures.length} of ${pagesToTest.length} page(s) failed:\n\n  ${failures.join("\n\n  ")}`,
          );
        }
      });
    }
  });
}
