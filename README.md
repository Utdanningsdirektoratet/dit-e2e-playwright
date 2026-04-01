# DIT E2E Playwright

Shared end-to-end tests with [Playwright](https://playwright.dev/) for [Utdanningsdirektoratet](https://github.com/Utdanningsdirektoratet) DIT applications. Tests run against live environments after deployment or during PR validation.

## Projects

| Code                   | Service                                           | Codebase                                                                             | URL                                                                                               | Framework      |
| ---------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | -------------- |
| [DUB](projects/dub/)   | [frontend](projects/dub/frontend/)                | [dub-cms-optimizely](https://github.com/Utdanningsdirektoratet/dub-cms-optimizely)   | [Production](https://dubestemmer.no) / [Stage](https://utda01mstra4y02inte.dxcloud.episerver.net) | Optimizely CMS |
| [KOMP](projects/komp/) | [frontend-canvas](projects/komp/frontend-canvas/) | [frontend](https://github.com/matematikk-mooc/frontend)                              | [Production](https://bibsys.instructure.com) / [Stage](https://bibsys.test.instructure.com)       | Canvas LMS     |
| [KOMP](projects/komp/) | [frontend-react](projects/komp/frontend-react/)   | [kpas-frontend-react](https://github.com/Utdanningsdirektoratet/kpas-frontend-react) | [Production](https://kp.udir.no) / [Stage](https://kp.ditiac-stage.udir.no)                       | Next.js        |

> ℹ️ Projects are auto-discovered from `projects/<code>/<service>/` and generate Playwright project names `<code>-<service>-<device>-<browser>`. No registration needed.

## Getting Started

1. **Install** — `make install` (requires Node 22+, pnpm, Make)
2. **Credentials** — `cp .env.example .env` and fill in values

```bash
make test                                        # Production
make test TEST_ENV=stage                          # Stage
make test TEST_ENV=local                          # Localhost

# Filter by project, service, device, or browser — mix freely
make test FILTER='dub-*'                         # All DUB services
make test FILTER='dub-frontend-*'                # DUB frontend, all devices + browsers
make test FILTER='komp-frontend-canvas-*'        # KOMP Canvas LMS tests
make test FILTER='*-desktop-chromium'            # Desktop Chromium across all projects
make test FILTER='dub-frontend-desktop-chromium' # Single combination
CI=1 make test TEST_ENV=stage FILTER='komp-*'    # CI mode, staging, KOMP only
```

`CI=1` enables retries and machine-readable reporter output. `make help` lists all targets and discovered projects.

<details>
<summary><b>Credentials</b></summary>

Canvas tests (`komp/frontend-canvas`) require credentials in a `.env` file:

```bash
cp .env.example .env
```

- `TEST_KOMP_CHROMIUM_USERNAME`
- `TEST_KOMP_CHROMIUM_PASSWORD`

Tests skip automatically when credentials are missing — `make test` without a `.env` still runs all unauthenticated tests.

</details>

<details>
<summary><b>Debugging</b></summary>

Use the shortcut targets to inspect failing tests.

| Target         | Equivalent                                 | Accepts                                    |
| -------------- | ------------------------------------------ | ------------------------------------------ |
| `make ui`      | `--ui`                                     | `FILTER=` `WORKERS=` `TEST_ENV=`           |
| `make debug`   | `--debug --headed --workers=1 --timeout=0` | `FILTER=` `TEST_ENV=`                      |
| `make headed`  | `--headed`                                 | `FILTER=` `WORKERS=` `TRACE=1` `TEST_ENV=` |
| `make trace`   | `--trace=on`                               | `FILTER=` `WORKERS=` `TEST_ENV=`           |
| `make codegen` | `playwright codegen`                       | `URL=https://…`                            |
| `make report`  | `playwright show-report`                   | —                                          |

After a run with `TRACE=1`, open `make report` to browse traces, screenshots, and video.

To filter by **test name** (not project), pass `--grep` directly to Playwright:

```bash
pnpm exec playwright test --grep "cookie banner" --project='dub-frontend-desktop-chromium'
```

`FILTER=` targets Playwright **project names** (device/browser combos); `--grep` targets **test names** within those projects. Both can be combined.

</details>

## Adding a New Project

### Project layout

1. Create `projects/<code>/<service>/`
2. Add `config.json` with environments
3. Add `*.spec.js` test files
4. Optionally add `console-whitelist.js` and `page-requirements.js`

> ℹ️ No config changes needed — drop the folder and files and the project appears automatically. See [`projects/dub/frontend/`](projects/dub/frontend/) for the canonical pattern. Each code can have multiple services (e.g. `dub` has `frontend`; `komp` has `frontend-canvas` and `frontend-react`).

---

### Common patterns

<details>
<summary><b>Sitemap-driven page testing</b></summary>

Fetch the sitemap, group pages by URL segment, and test a random sample of each group each run. Large sites stay fast while coverage accumulates over many runs.

```js
import { test, expect } from "@playwright/test";
import { fetchSitemapPaths } from "../../../shared/sitemap.js";
import { randomSample } from "../../../shared/sampling.js";
import { sitemapUrl, insecure } from "./env.js";

const paths = await fetchSitemapPaths(sitemapUrl, {
  rejectUnauthorized: !insecure,
});

test.describe("All pages", () => {
  for (const path of randomSample(paths, 10)) {
    test(path, async ({ page }) => {
      const response = await page.goto(path);
      expect(response.status()).toBeLessThan(400);
      await expect(page).toHaveTitle(/.+/);
    });
  }
});
```

The canonical example is `projects/dub/frontend/300-sitemap.spec.js` — it groups pages by parent URL segment and runs per-step checks (components, console errors, broken links) with a shared failure collector so one bad page doesn't abort the rest of the group.

</details>

<details>
<summary><b>Console error monitoring</b></summary>

Attach a checker before navigation, snapshot before the interaction under test, then assert only on the new errors. This isolates interaction-triggered errors from unrelated page-load noise.

```js
import { createConsoleChecker } from "../../../shared/console-checker.js";
import { CONSOLE_WHITELIST } from "./console-whitelist.js";

test("menu open produces no console errors", async ({ page }) => {
  const checker = createConsoleChecker(page, CONSOLE_WHITELIST);
  await page.goto("/");
  const errsBefore = checker.errors.length;

  await page.locator("#burger-menu").click();

  const newErrors = checker.errors.slice(errsBefore);
  expect(newErrors, newErrors.join("\n")).toEqual([]);
});
```

`console-whitelist.js` is project-specific. Create it with a named `CONSOLE_WHITELIST` export containing regex patterns for known third-party noise. Keep them tight — overly broad patterns mask real application errors.

```js
// console-whitelist.js
export const CONSOLE_WHITELIST = [
  /matomo/i, // analytics pixel
  /Failed to load resource/i, // CDN hiccups (HTTP status checked separately via response.status())
];
```

</details>

<details>
<summary><b>Broken internal link detection</b></summary>

Extract all `a[href^="/"]` from the loaded page DOM and HEAD-check each one concurrently. Network-level failures (CDN down, TLS rejection) are silently skipped — only explicit HTTP 4xx/5xx are reported as broken.

```js
import {
  extractInternalLinks,
  checkLinks,
  formatBrokenLinks,
} from "../../../shared/check-links.js";

test("no broken internal links", async ({ page, request }) => {
  await page.goto("/");
  const links = await extractInternalLinks(page);
  const broken = await checkLinks(request, links);
  expect(broken, formatBrokenLinks(broken)).toHaveLength(0);
});
```

For sitemap specs: run inside each page step with a `browserName === 'chromium'` guard — link reachability is HTTP-level so there is no benefit in running on every browser engine.

</details>

<details>
<summary><b>Third-party embed checking (Qbrick, YouTube, …)</b></summary>

Detects cross-origin iframes by CSS selector and GET-checks each embed URL using the browser's network stack — TLS fingerprint and headers match a real browser, so CDN bot-detection behaves the same as for actual users. Only HTTP 4xx responses are reported as broken.

```js
import {
  checkEmbeds,
  formatEmbedIssues,
} from "../../../shared/check-embeds.js";

test("video embeds are reachable", async ({ page }) => {
  await page.goto("/video-page/");
  const issues = await checkEmbeds(page);
  expect(issues, formatEmbedIssues(issues)).toHaveLength(0);
});
```

Add new embed platforms by adding an entry to `PLATFORMS` in `shared/check-embeds.js`. Each entry needs a CSS `selector` (to match the iframe) and a `checkUrl` function (to derive the URL to check). YouTube and Qbrick examples are documented there.

</details>

<details>
<summary><b>Canvas LMS helpers</b></summary>

Three modules in `shared/canvas/` cover all common Canvas test needs.

**Authentication** — `shared/canvas/auth.js`

```js
import { loginCanvasForm, logoutCanvas } from "../../../shared/canvas/auth.js";

// Requires KOMP_CANVAS_*_USERNAME / KOMP_CANVAS_*_PASSWORD in .env
await loginCanvasForm(page, canvasBaseURL, username, password);
// Optional fifth arg: loginPath (default '/login/canvas?normalLogin=1')
await logoutCanvas(page);
```

**Header state assertions** — `shared/canvas/navigation.js`

```js
import {
  assertCanvasHeaderAuthenticated,
  assertCanvasHeaderUnauthenticated,
} from "../../../shared/canvas/navigation.js";

await assertCanvasHeaderAuthenticated(page); // user menu visible, login link absent
await assertCanvasHeaderUnauthenticated(page); // login link visible, user menu absent
```

**Stage environment detection** — `shared/canvas/stage-detection.js`

```js
import {
  isCanvasStage,
  assertCanvasStageStyling,
} from "../../../shared/canvas/stage-detection.js";

const isStage = isCanvasStage(baseURL); // true when baseURL contains '.test.'
await assertCanvasStageStyling(header, isStage); // asserts blue stage banner on stage
```

</details>

<details>
<summary><b>Component detect + test pattern</b></summary>

For interactive components that appear on some pages but not others, export a `detect` function and a `test` function. The sitemap spec calls `detect` on every page and only runs `test` when the component is present. Mark components as required for specific URL patterns in `page-requirements.js` — missing required components fail the test immediately.

```js
// components/my-widget.js
import { expect } from "@playwright/test";

const CONTAINER = ".my-widget";

export async function detect(page) {
  // Use filter({ visible: true }) so hidden/unpublished CMS content
  // doesn't trigger false positives.
  return (await page.locator(CONTAINER).filter({ visible: true }).count()) > 0;
}

export async function test(page) {
  await expect(page.locator(CONTAINER)).toBeVisible();
  // … assertions specific to this component
}
```

Register it in `300-sitemap.spec.js`:

```js
import * as myWidget from "./components/my-widget.js";
const COMPONENTS = { ...existingComponents, myWidget };
```

The detection loop handles calling `detect` and `test` for every component on every page automatically.

</details>

<details>
<summary><b>Quickstart — minimal smoke test</b></summary>

```bash
mkdir -p projects/myapp/frontend
```

**`projects/myapp/frontend/config.json`**

```json
{
  "environments": {
    "production": { "baseURL": "https://myapp.no" },
    "stage": { "baseURL": "https://stage.myapp.no" }
  },
  "deviceFilter": ["desktop-chromium"]
}
```

**`projects/myapp/frontend/100-smoke.spec.js`**

```js
import { test, expect } from "@playwright/test";

test("homepage loads", async ({ page }) => {
  const response = await page.goto("/");
  expect(response.status()).toBeLessThan(400);
  await expect(page).toHaveTitle(/.+/);
});
```

Run with `make test FILTER='myapp-*'`. Add shared utilities and additional spec files as needed.

For authenticated services, add an `auth.js` that wraps the relevant `shared/canvas/` helpers (or writes its own login flow), and add credentials to `.env.example`.

</details>

<details>
<summary><b>Environments (<code>config.json</code>)</b></summary>

Tests run against **production** by default. Use `TEST_ENV` to target a different environment. Each project's `config.json` defines available environments:

```json
{
  "environments": {
    "production": { "baseURL": "https://example.com" },
    "stage": { "baseURL": "https://stage.example.com" },
    "local": { "baseURL": "https://localhost:44353", "ignoreHTTPSErrors": true }
  }
}
```

| Field               | Description                                                |
| ------------------- | ---------------------------------------------------------- |
| `baseURL`           | Playwright's base URL for `page.goto('/')`                 |
| `sitemapUrl`        | Custom sitemap URL (defaults to `${baseURL}/sitemap.xml`)  |
| `ignoreHTTPSErrors` | Skip TLS verification (for self-signed certs on localhost) |

Each project exposes these values via a thin `env.js` at project level:

```js
// projects/myapp/frontend/env.js
import { createEnv } from "../../../shared/env.js";
export const { config, env, baseURL, sitemapUrl, insecure } = createEnv(
  import.meta.dirname,
);
```

Spec files import from `'./env.js'` and receive `baseURL`, `sitemapUrl`, `insecure`, and the full `env` object from `config.json`.

</details>

<details>
<summary><b>Device matrix</b></summary>

| Device  | Browser  | Playwright Profile | Viewport |
| ------- | -------- | ------------------ | -------- |
| desktop | chromium | Desktop Chrome     | 1280×720 |
| desktop | firefox  | Desktop Firefox    | 1280×720 |
| desktop | webkit   | Desktop Safari     | 1280×720 |
| mobile  | chromium | Pixel 7            | 393×851  |
| mobile  | webkit   | iPhone 15          | 393×852  |
| tablet  | chromium | Galaxy Tab S4      | 712×1138 |
| tablet  | webkit   | iPad (gen 7)       | 810×1080 |

</details>

<details>
<summary><b>Per-project overrides</b></summary>

Each project's `config.json` can override global defaults. The most common is `deviceFilter`, which limits which device/browser combinations run:

```json
{
  "deviceFilter": ["desktop-chromium", "mobile-webkit"]
}
```

By default, all 7 combinations are generated. DUB frontend uses `deviceFilter` to run on desktop Chromium, desktop WebKit, mobile Chromium, and mobile WebKit (4 of the 7 combinations).

Other supported overrides: `timeout`, `retries`, `fullyParallel`, `workers`, `expect`, `use.*` (baseURL, trace, screenshot, video), `testMatch`, `testIgnore`, `outputDir`.

Add `sitemapExclude` to skip broken sitemap pages: `"sitemapExclude": ["^/broken-section/$"]`.

</details>

<details>
<summary><b>Global defaults</b></summary>

| Setting          | Value             |
| ---------------- | ----------------- |
| `timeout`        | 60s               |
| `expect.timeout` | 10s               |
| `retries`        | 1                 |
| `workers`        | 6                 |
| `fullyParallel`  | true              |
| `trace`          | on-first-retry    |
| `screenshot`     | only-on-failure   |
| `video`          | retain-on-failure |

</details>

<details>
<summary><b>Proxy support</b></summary>

When running behind an HTTP(S) proxy (e.g. in sandboxed CI environments), the config auto-detects `HTTPS_PROXY` / `HTTP_PROXY` environment variables and configures both:

- **Chromium browser proxy** — so page navigation routes through the proxy
- **Node fetch proxy** — so sitemap fetching uses `undici.ProxyAgent`

TLS certificate validation is disabled when a proxy is active (`ignoreHTTPSErrors: true`) since corporate proxies typically intercept HTTPS with their own certificate.

</details>

## FAQ

<details>
<summary><b>My Canvas tests are skipped — why?</b></summary>

Credentials are missing — tests skip automatically when `TEST_KOMP_CHROMIUM_USERNAME` or `TEST_KOMP_CHROMIUM_PASSWORD` is not set.

Fix: `cp .env.example .env` and fill in the values. See [Getting Started](#getting-started) → Credentials.

</details>

<details>
<summary><b>How do I run/debug a single test?</b></summary>

See the **Debugging** section in [Getting Started](#getting-started) above — it covers `make debug`, `make headed`, `make ui`, `make trace`, all filter flags, and `make report`.

</details>

<details>
<summary><b>How do I quickly set up tests for a site using its sitemap?</b></summary>

Copy the DUB frontend pattern — `projects/dub/frontend/300-sitemap.spec.js` fetches `sitemap.xml` and auto-generates one test per URL group. No hardcoded pages needed.

1. Add your project with a `config.json` (see [Adding a New Project](#adding-a-new-project))
2. Copy `300-sitemap.spec.js` into your project directory
3. Run `make test FILTER='myapp-*'`

To exclude broken sitemap pages, see [Adding a New Project](#adding-a-new-project) → Per-project overrides — `sitemapExclude` accepts an array of URL regexes.

</details>

<details>
<summary><b>I added a project folder but no tests are generated — why?</b></summary>

Auto-discovery requires both:

1. A `config.json` with at least one environment (`"environments": { "production": { "baseURL": "..." } }`)
2. At least one `*.spec.js` file in the same directory

If either is missing, the project won't appear. Verify with:

```bash
pnpm exec playwright test --list --project='myapp-*'
```

</details>
