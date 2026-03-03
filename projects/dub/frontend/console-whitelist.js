/**
 * Console log patterns to ignore during testing.
 * Add regex patterns for known third-party noise as tests surface them.
 * Keep this list tight — overly broad patterns mask real issues.
 */
export const CONSOLE_WHITELIST = [
  /matomo/i,
  // Azure Application Insights telemetry (Chromium) and its CORS error on WebKit.
  // WebKit formats the pageerror as "<URL> due to access control checks" (no SDK name).
  /application\s*insights/i,
  /dc\.services\.visualstudio\.com/i,
  /favicon\.ico/i,
  /qbrick\.com/i,
  // Subresource fetch failures (video embeds, CDN, staging server errors)
  // NOTE: page-level HTTP status is checked separately via response.status()
  /Failed to load resource/i,
  // Uncaught Axios errors from failed background API calls (e.g. personalisation
  // endpoints unavailable on specific pages). Not a page-load failure.
  /AxiosError.*Network Error/i,
  // GoBrain video player (Qbrick-based) CDN subtitle load failures and data
  // module errors. These are third-party player internals, not app errors.
  // The player logs two companion objects per failure: {body:, code:0} and
  // {body:, code:0, error:XMLHttpRequestProgressEvent} as separate console.error calls.
  /GoBrain\./i,
  /^\{body: .*code: 0/,
  /XMLHttpRequestProgressEvent/,
  // Qbrick subtitle CDN (ip-only.net) — .srt/.vtt files fail on mobile WebKit
  // due to TLS fingerprint rejection. WebKit surfaces these as pageerrors with
  // "due to access control checks" and also emits a generic TLS failure message.
  /ip-only\.net/i,
  /A TLS error caused the secure connection to fail/i,
  // WebKit network-level module load failure: the browser could not fetch a JS
  // module script (CDN hiccup / TLS rejection). Not a JS logic error — the
  // message is WebKit-specific and always indicates a resource fetch problem.
  /Importing a module script failed/i,
  // Vimeo CDN playlist fetch (HLS) failures on WebKit — access control issue
  // between page origin and skyfire.vimeocdn.com. Embedded third-party video.
  /vimeocdn/i,
  // HLS.js "no available adapters" — video stream codec not supported by browser,
  // or HLS stream unavailable. Common on pages with video embeds in headless env.
  /No available adapters/i,
  // CORS preflight failures from third-party CDNs (e.g. Qbrick returning 503 on OPTIONS).
  // WebKit is more likely than Chromium to surface these as console errors.
  /Preflight response is not successful/i,
  /permissions policy violation/i,
  // Cloudflare Turnstile noise (duplicate render, obfuscated JS errors, debug logs)
  /cloudflare turnstile/i,
  /charCodeAt/,
  /font-size:0;color:transparent/,
  // Cloudflare challenge platform injected into pages with bot-detection (e.g. Vimeo embeds).
  // Surfaces as cross-frame access pageerrors and unused-preload warnings on mobile WebKit.
  /challenges\.cloudflare\.com/i,
  // CSP fallback notice (not a real error)
  /default-src.*fallback/i,
  // Browser engine noise (WebGPU/WebGL fallback in headless Chromium)
  /WebGPU/i,
  /WebGL/i,
  // WebKit browser engine deprecation notice for window.styleMedia (not app code).
  /window\.styleMedia/i,
  // macOS/iOS WebKit CFNetwork error (kCFURLErrorCannotLoadFromNetwork = 303) —
  // fired when embedded resources (iframes, video players) fail at the OS network
  // layer in Safari. Same root cause as the AxiosError WebKit skip in 200-navigation:
  // third-party resources behave differently in Safari's URL loading system.
  /kCFErrorDomainCFNetwork/,
];
