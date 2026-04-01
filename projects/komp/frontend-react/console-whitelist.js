/**
 * Console log patterns to ignore during komp/frontend-react testing.
 * Keep this list tight — overly broad patterns mask real issues.
 */
export const CONSOLE_WHITELIST = [
  // ── Analytics & telemetry ─────────────────────────────────────────────────
  /matomo/i, // Matomo tracking
  /application\s*insights/i, // Azure Application Insights SDK
  /dc\.services\.visualstudio\.com/i, // Azure AI telemetry endpoint

  // ── Network & resource loading ────────────────────────────────────────────
  /favicon\.ico/i, // Missing favicon
  /Failed to load resource/i, // Generic subresource fetch failure
  /Preflight response is not successful/i, // CORS preflight rejection
  /SSL certificate error/i, // CDN/proxy TLS renegotiation

  // ── CSP & permissions ─────────────────────────────────────────────────────
  /permissions policy violation/i, // Iframe permissions policy

  // ── Next.js ───────────────────────────────────────────────────────────────
  /\[HMR\]/i, // Dev-only HMR noise
  /\[Fast Refresh\]/i, // Dev-only Fast Refresh noise
  /next\/config/i, // Runtime config deprecation

  // ── Sentry ────────────────────────────────────────────────────────────────
  /\[Sentry\]/i, // Sentry init warnings in test environments

  // ── Service worker (Serwist) ──────────────────────────────────────────────
  /sw\.js/i, // SW registration/load failures (WebKit headless)
  /A bad HTTP response code \(404\) was received when fetching the script/i, // SW script 404 on navigation (Chromium)

  // ── Chromium-specific ─────────────────────────────────────────────────────
  /WebGPU/i, // WebGPU fallback in headless
  /WebGL/i, // WebGL fallback in headless

  // ── Firefox-specific ──────────────────────────────────────────────────────
  /NS_BINDING_ABORTED/i, // Playwright Juggler protocol abort
  /juggler/i, // Playwright Firefox internals
];
