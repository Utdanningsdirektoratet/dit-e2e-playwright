import { defineConfig, devices } from "@playwright/test";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

// Load .env file if present (CI env vars take precedence)
const envPath = join(import.meta.dirname, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    if (!(key in process.env)) process.env[key] = value;
  }
}

/*
 * Auto-discovers projects from projects/<code>/<service>/ and creates
 * a Playwright project per device × browser for each.
 *
 * Per-project overrides: add a config.json in the service directory.
 * Supported fields: timeout, retries, fullyParallel, deviceFilter, use.
 *
 * Project naming:  <code>-<service>-<device>-<browser>
 * Filtering:
 *   --project='dub-*'                        all DUB services
 *   --project='dub-frontend-*'               DUB frontend, all devices + browsers
 *   --project='*-desktop-chromium'           all desktop-chromium tests
 *
 * Spec files run in alphabetical order within a project when fullyParallel
 * is false (the default for komp services). Name spec files with multiples
 * of 100 (100-, 200-, 300-…) so new files can be inserted in gaps without
 * renaming existing ones.
 */

const DEVICES = [
  // Desktop — full browser matrix
  {
    device: "desktop",
    browser: "chromium",
    use: { ...devices["Desktop Chrome"] },
  },
  {
    device: "desktop",
    browser: "firefox",
    use: { ...devices["Desktop Firefox"] },
  },
  {
    device: "desktop",
    browser: "webkit",
    use: { ...devices["Desktop Safari"] },
  },
  // Mobile — most popular devices per engine
  { device: "mobile", browser: "chromium", use: { ...devices["Pixel 7"] } },
  { device: "mobile", browser: "webkit", use: { ...devices["iPhone 15"] } },
  // Tablet — most popular devices per engine
  {
    device: "tablet",
    browser: "chromium",
    use: { ...devices["Galaxy Tab S4"] },
  },
  { device: "tablet", browser: "webkit", use: { ...devices["iPad (gen 7)"] } },
];

/*
 * Proxy detection — reads HTTPS_PROXY / HTTP_PROXY from the environment.
 * Needed in sandboxed CI environments that route traffic through a proxy.
 * The proxy URL may include credentials (http://user:pass@host:port).
 */
function detectProxy() {
  const raw =
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy;
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    const server = url.port
      ? `${url.protocol}//${url.hostname}:${url.port}`
      : `${url.protocol}//${url.hostname}`;
    return {
      server,
      ...(url.username ? { username: decodeURIComponent(url.username) } : {}),
      ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
    };
  } catch {
    return { server: raw };
  }
}

const proxy = detectProxy();

function dirs(path) {
  return readdirSync(path, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

function loadJson(path) {
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, "utf-8"));
}

/*
 * Resolve environment from config.json.
 *
 * Multi-env format (config.json):
 *   { "environments": { "production": { "baseURL": "…" }, "stage": { … }, "local": { … } } }
 *
 * Legacy format (backwards-compatible):
 *   { "use": { "baseURL": "…" } }
 *
 * TEST_ENV selects the environment (defaults to "production").
 * "development" is normalised to "local" so local dev servers work out of the box.
 * Each environment may define: baseURL, sitemapUrl, ignoreHTTPSErrors.
 *
 * Top-level fields (fullyParallel, retries, timeout, expect, …) are forwarded
 * to the Playwright project config even when "environments" is present.
 */
function resolveConfig(raw) {
  if (raw.environments) {
    // Normalise TEST_ENV: "development" is an alias for "local"
    let envName = process.env.TEST_ENV || "production";
    if (envName === "development") envName = "local";

    const env = raw.environments[envName];
    if (!env) {
      const available = Object.keys(raw.environments).join(", ");
      throw new Error(
        `Unknown TEST_ENV="${process.env.TEST_ENV}". Available: ${available}`,
      );
    }

    // sitemapUrl is consumed by spec files, not by Playwright config — strip it here
    const {
      baseURL,
      ignoreHTTPSErrors,
      sitemapUrl: _sitemapUrl,
      ...envRest
    } = env;

    // Strip meta fields that are not Playwright project options
    const { environments: _e, deviceFilter: _d, ...playwrightOptions } = raw;

    return {
      ...playwrightOptions, // fullyParallel, retries, timeout, expect, …
      ...envRest, // env-specific extras (e.g. canvasBaseURL)
      use: { baseURL },
      ...(ignoreHTTPSErrors ? { _ignoreHTTPSErrors: true } : {}),
    };
  }
  // Legacy format: { use: { baseURL }, timeout, retries, … }
  return raw;
}

function discoverProjects() {
  const projectsDir = join(import.meta.dirname, "projects");
  const result = [];

  if (!existsSync(projectsDir)) return result;

  for (const code of dirs(projectsDir)) {
    for (const service of dirs(join(projectsDir, code))) {
      const testDir = join(projectsDir, code, service);

      // Optional per-project overrides from config.json
      const raw = loadJson(join(testDir, "config.json"));
      const resolved = resolveConfig(raw);
      const { use: useOverrides, _ignoreHTTPSErrors, ...overrides } = resolved;

      // Enable ignoreHTTPSErrors when proxy is active OR config says so (e.g. localhost)
      const needsInsecure = !!proxy || !!_ignoreHTTPSErrors;

      // Optional device filter — limits which device×browser combos are generated.
      // Set "deviceFilter": ["desktop-chromium", "mobile-webkit"] in config.json.
      const deviceFilter = raw.deviceFilter;
      const activeDevices = deviceFilter
        ? DEVICES.filter((d) =>
            deviceFilter.includes(`${d.device}-${d.browser}`),
          )
        : DEVICES;

      for (const entry of activeDevices) {
        result.push({
          name: `${code}-${service}-${entry.device}-${entry.browser}`,
          testDir,
          ...overrides,
          use: {
            ...entry.use,
            ...useOverrides,
            ...(proxy ? { proxy } : {}),
            ...(needsInsecure ? { ignoreHTTPSErrors: true } : {}),
          },
        });
      }
    }
  }

  return result;
}

export default defineConfig({
  testMatch: "**/*.spec.js",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 9,
  reporter: process.env.CI
    ? [
        ["html", { open: "never" }],
        ["json", { outputFile: "results/results.json" }],
      ]
    : [["html", { open: "on-failure" }]],
  outputDir: "results/artifacts",

  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: discoverProjects(),
});
