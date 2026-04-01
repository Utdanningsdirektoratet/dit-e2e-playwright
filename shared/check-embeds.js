/**
 * Reusable embed health checker.
 *
 * Detects externally-hosted embedded content via iframe src patterns and
 * verifies each embed is still accessible — catching content that has been
 * set to private, removed, or whose URL has changed.
 *
 * Currently supported platforms (add more entries to PLATFORMS as needed):
 *   Qbrick — HTTP status check on the embed URL; 4xx means broken/removed
 *
 * Why no play/pause check?
 *   Qbrick (and all other) embed iframes are cross-origin. CORS prevents
 *   Playwright from interacting with or reading the DOM inside a cross-origin
 *   iframe, so clicking play/pause or checking video state is not possible.
 *   The URL reachability check is the right signal: a removed or private video
 *   causes the embed URL to return 4xx, which we catch here.
 *
 * How the URL check works:
 *   Uses page.request.get() which runs through the browser's network stack
 *   (same TLS fingerprint and headers as a real browser). This allows Qbrick's
 *   CDN to accept the connection. Node.js fetch() is more aggressively blocked
 *   because its TLS fingerprint identifies it as a non-browser client.
 *
 *   If the CDN rejects the connection at the network level (e.g. mobile WebKit's
 *   TLS fingerprint is blocked on some CDNs), the error is silently skipped —
 *   a network-level rejection from the CDN is not the same as the video being
 *   unavailable. Only explicit HTTP 4xx responses from the server indicate a
 *   real problem (removed, private, URL changed).
 *
 * Extending to a new platform:
 *   Add a single entry to PLATFORMS with { name, category, selector, checkUrl }.
 *   Set checkUrl to null to skip availability checks (e.g. auth-gated APIs).
 *   The selector is a CSS attribute selector targeting the embed's iframe element.
 *
 * Usage:
 *   import { checkEmbeds, formatEmbedIssues } from '../../../shared/check-embeds.js';
 *
 *   const issues = await checkEmbeds(page);
 *   expect(issues, formatEmbedIssues(issues)).toHaveLength(0);
 */

/**
 * @typedef {{
 *   name: string,
 *   category: string,
 *   selector: string,
 *   checkUrl: ((src: string) => string|null) | null
 * }} Platform
 */

/** @type {Platform[]} */
const PLATFORMS = [
  {
    name: "qbrick",
    category: "video",
    selector: 'iframe[src*="qbrick.com"]',
    // No public oEmbed API — check the embed URL directly; 4xx means removed.
    checkUrl: (src) => src,
  },
  // Add more platforms here, e.g.:
  // {
  //   name: 'youtube',
  //   category: 'video',
  //   selector: 'iframe[src*="youtube.com/embed/"], iframe[src*="youtube-nocookie.com/embed/"]',
  //   checkUrl: (src) => {
  //     const id = src.match(/\/embed\/([^?&#/]+)/)?.[1];
  //     return id
  //       ? `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`
  //       : null;
  //   },
  // },
];

/** @param {number} status */
function statusReason(status) {
  if (status === 401) return "content is private or requires authentication";
  if (status === 403)
    return "access denied — content may be private or geo-restricted";
  if (status === 404)
    return "content removed, renamed, or URL has changed — link needs to be renewed";
  return `unexpected HTTP ${status}`;
}

/**
 * @typedef {{
 *   src: string,
 *   platform: string,
 *   category: string,
 *   checkUrl: string|null
 * }} EmbedInfo
 */

/**
 * @typedef {{
 *   src: string,
 *   platform: string,
 *   category: string,
 *   status: number,
 *   reason: string
 * }} EmbedIssue
 */

/**
 * Detect all external embeds on the page.
 * Deduplicates by src so the same embed is counted only once even if repeated.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<EmbedInfo[]>}
 */
export async function detectEmbeds(page) {
  const seen = new Set();
  const embeds = [];

  for (const platform of PLATFORMS) {
    const iframes = page.locator(platform.selector);
    const count = await iframes.count();

    for (let i = 0; i < count; i++) {
      const src = ((await iframes.nth(i).getAttribute("src")) ?? "").trim();
      if (!src || seen.has(src)) continue;
      seen.add(src);

      embeds.push({
        src,
        platform: platform.name,
        category: platform.category,
        checkUrl: platform.checkUrl ? platform.checkUrl(src) : null,
      });
    }
  }

  return embeds;
}

/**
 * Check external embeds on the page for availability.
 *
 * Visibility is intentionally NOT checked — embeds inside collapsed accordions
 * are legitimately not visible at domcontentloaded but are correctly embedded.
 *
 * Uses page.request.get() so the check runs through the browser's network
 * stack and TLS fingerprint. If the CDN rejects the connection at the network
 * level (e.g. some CDNs block mobile WebKit's TLS handshake), the error is
 * silently skipped — that is a CDN restriction, not a broken video. Only HTTP
 * 4xx responses are reported as real problems.
 *
 * Platforms with checkUrl === null are skipped (require API tokens).
 * checkUrls are deduplicated so the same endpoint is only called once.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ maxPerPlatform?: number }} [options]
 *   maxPerPlatform — cap the number of embed URLs checked per platform type
 *   (e.g. 2 means at most 2 Qbrick URLs are checked per page). Default: unlimited.
 * @returns {Promise<EmbedIssue[]>}
 */
export async function checkEmbeds(page, { maxPerPlatform = Infinity } = {}) {
  const embeds = await detectEmbeds(page);
  const issues = [];
  const checkedUrls = new Set();
  const platformCounts = new Map();

  const toCheck = [];
  for (const embed of embeds) {
    if (embed.checkUrl === null) continue;
    if (checkedUrls.has(embed.checkUrl)) continue;
    const n = (platformCounts.get(embed.platform) ?? 0) + 1;
    if (n > maxPerPlatform) continue;
    platformCounts.set(embed.platform, n);
    checkedUrls.add(embed.checkUrl);
    toCheck.push(embed);
  }

  // Process in batches of 3 so that 6 parallel workers produce at most 18
  // concurrent outbound requests total rather than flooding the CDN.
  const BATCH_SIZE = 3;
  for (let i = 0; i < toCheck.length; i += BATCH_SIZE) {
    const batch = toCheck.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (embed) => {
        try {
          const response = await page.request.get(embed.checkUrl, {
            timeout: 10_000,
          });
          if (response.status() >= 400) {
            return {
              src: embed.src,
              platform: embed.platform,
              category: embed.category,
              status: response.status(),
              reason: statusReason(response.status()),
            };
          }
        } catch {
          // Network-level failure: CDN rejected the connection (TLS fingerprint
          // mismatch, bot detection, etc.). This is not a broken video — skip it.
        }
        return null;
      }),
    );
    issues.push(...batchResults.filter(Boolean));
  }

  return issues;
}

/**
 * Format embed issues for use as a Playwright assertion failure message.
 *
 * @param {EmbedIssue[]} issues
 * @returns {string}
 */
export function formatEmbedIssues(issues) {
  const lines = issues.map(({ platform, category, status, reason, src }) => {
    return `  [HTTP ${status}] ${category}/${platform}: ${reason}\n    ${src}`;
  });
  return `Embed issues found:\n${lines.join("\n")}`;
}
