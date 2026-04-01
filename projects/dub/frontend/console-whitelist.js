/**
 * Console log patterns to ignore during testing.
 * Keep this list tight — overly broad patterns mask real issues.
 */
export const CONSOLE_WHITELIST = [
  // ── Analytics & telemetry ─────────────────────────────────────────────────
  /matomo/i, // Matomo tracking
  /application\s*insights/i, // Azure Application Insights SDK
  /dc\.services\.visualstudio\.com/i, // Azure AI telemetry endpoint

  // ── Third-party video players ─────────────────────────────────────────────
  /qbrick\.com/i, // Qbrick CDN
  /GoBrain\./i, // GoBrain player internals
  /^\{body: .*code: 0/, // GoBrain error payload object
  /XMLHttpRequestProgressEvent/, // GoBrain XHR failure companion
  /ip-only\.net/i, // Qbrick subtitle CDN (TLS failures on WebKit)
  /vimeocdn/i, // Vimeo HLS playlist fetch failures
  /No available adapters/i, // HLS.js codec not supported in headless

  // ── Cloudflare ────────────────────────────────────────────────────────────
  /cloudflare turnstile/i, // Turnstile widget noise
  /charCodeAt/, // Obfuscated Turnstile JS error
  /font-size:0;color:transparent/, // Turnstile debug render log
  /challenges\.cloudflare\.com/i, // Challenge platform cross-frame errors

  // ── Network & resource loading ────────────────────────────────────────────
  /favicon\.ico/i, // Missing favicon
  /Failed to load resource/i, // Generic subresource fetch failure
  /AxiosError.*Network Error/i, // Background API call failure
  /Preflight response is not successful/i, // CORS preflight rejection
  /A TLS error caused the secure connection to fail/i, // TLS handshake failure

  // ── CSP & permissions ─────────────────────────────────────────────────────
  /default-src.*fallback/i, // CSP fallback notice
  /permissions policy violation/i, // Iframe permissions policy

  // ── Chromium-specific ─────────────────────────────────────────────────────
  /WebGPU/i, // WebGPU fallback in headless
  /WebGL/i, // WebGL fallback in headless

  // ── WebKit-specific ───────────────────────────────────────────────────────
  /Importing a module script failed/i, // Module fetch failure (CDN/TLS)
  /window\.styleMedia/i, // Deprecated API notice
  /kCFErrorDomainCFNetwork/, // macOS network layer error (code 303)

  // ── Firefox-specific ──────────────────────────────────────────────────────
  /downloadable font:.*download failed/i, // Intermittent font fetch failure
  /downloadable font:.*no supported format/i, // FontAwesome format fallback
  /Glyph bbox was incorrect/i, // FontAwesome bounding box warning
  /Image corrupt or truncated/i, // Image decode race in headless
  /Layout was forced before the page was fully loaded/i, // FOUC warning
  /Feature Policy:.*Skipping unsupported feature/i, // Unsupported iframe attrs
  /unreachable code after return statement/i, // Vimeo minified bundle warning
  /NS_ERROR_ABORT/i, // Sporadic navigation abort
  /NetworkError when attempting to fetch/i, // CDN timeout / TLS renegotiation
  /classified as a bounce tracker/i, // Enhanced Tracking Protection noise
  /jQuery is not defined/i, // Old pages with broken jQuery CDN deps
  /\$ is not defined/i, // jQuery alias ($) missing after failed load
  /Microsoft is not defined/i, // Legacy Microsoft JS SDK on old Optimizely pages
];
