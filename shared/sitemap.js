/**
 * Fetch a sitemap.xml and return an array of URL pathname strings.
 * Reusable across projects — just pass the full sitemap URL.
 *
 * Automatically uses HTTPS_PROXY / HTTP_PROXY from the environment
 * via undici ProxyAgent (bundled with Node 22+).
 *
 * Handles both regular sitemaps (<urlset>) and sitemap indexes
 * (<sitemapindex>). When an index is detected, all child sitemaps are
 * fetched concurrently (capped at `concurrency`, default 5) and their
 * paths are merged.
 *
 * @param {string} sitemapUrl  Absolute URL to the sitemap.xml
 * @param {object} [options]
 * @param {boolean} [options.rejectUnauthorized=true]  Set false for self-signed certs (localhost)
 * @param {number}  [options.concurrency=5]  Max simultaneous child-sitemap fetches (index only)
 * @returns {Promise<string[]>} Deduplicated pathnames (e.g. ["/", "/about/"])
 */
export async function fetchSitemapPaths(sitemapUrl, options = {}) {
  const { rejectUnauthorized = true, concurrency = 5 } = options;

  // Build fetch options once — reused for every request (proxy / TLS settings)
  const fetchOptions = {};
  const proxyUrl =
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy;

  if (proxyUrl) {
    const { ProxyAgent } = await import("undici");
    fetchOptions.dispatcher = new ProxyAgent(proxyUrl);
  } else if (!rejectUnauthorized) {
    // Self-signed cert support (e.g. localhost dev server)
    const { Agent } = await import("undici");
    fetchOptions.dispatcher = new Agent({
      connect: { rejectUnauthorized: false },
    });
  }

  async function fetchXml(url) {
    const res = await fetch(url, fetchOptions);
    if (!res.ok) {
      throw new Error(
        `Sitemap fetch failed: ${res.status} ${res.statusText} — ${url}`,
      );
    }
    return res.text();
  }

  // Match both plain <loc> and namespace-prefixed <s:loc>, <sitemap:loc>, etc.
  // Decode &amp; entities — valid XML in URLs (e.g. ?foo=1&amp;bar=2) must be
  // decoded before passing to new URL(), otherwise the URL constructor throws.
  function extractLocs(xml) {
    return [...xml.matchAll(/<(?:\w+:)?loc>([^<]+)<\/(?:\w+:)?loc>/g)].map(
      (m) => m[1].replace(/&amp;/g, "&"),
    );
  }

  const xml = await fetchXml(sitemapUrl);

  // Sitemap index: the root document lists child sitemaps, not pages.
  // Fetch child sitemaps concurrently using the same worker-pool pattern as checkLinks.
  if (/<sitemapindex[\s>]/i.test(xml)) {
    const childUrls = extractLocs(xml);
    const allPaths = [];
    const queue = [...childUrls];

    async function worker() {
      while (queue.length > 0) {
        const url = queue.shift();
        const childXml = await fetchXml(url);
        for (const loc of extractLocs(childXml)) {
          allPaths.push(new URL(loc).pathname);
        }
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(concurrency, childUrls.length) }, worker),
    );
    return [...new Set(allPaths)];
  }

  // Regular sitemap (<urlset>): extract page URLs directly
  return [...new Set(extractLocs(xml).map((loc) => new URL(loc).pathname))];
}
