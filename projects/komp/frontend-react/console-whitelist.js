/**
 * Console log patterns to ignore during komp/frontend-react testing.
 * Keep this list tight — overly broad patterns mask real issues.
 */
export const CONSOLE_WHITELIST = [
  // Analytics / telemetry
  /matomo/i,
  // Azure Application Insights
  /application\s*insights/i,
  /dc\.services\.visualstudio\.com/i,
  // Common browser noise
  /favicon\.ico/i,
  // Subresource fetch failures from external CDNs
  /Failed to load resource/i,
  // CORS preflight failures from third-party CDNs
  /Preflight response is not successful/i,
  /permissions policy violation/i,
  // Next.js development-only HMR noise
  /\[HMR\]/i,
  /\[Fast Refresh\]/i,
  // Browser engine noise (WebGPU/WebGL fallback in headless Chromium)
  /WebGPU/i,
  /WebGL/i,
  // Sentry initialization warnings in test environments
  /\[Sentry\]/i,
  // Next.js runtime config deprecation (fixed in app, harmless until Next.js 16)
  /next\/config/i,
  // SSL certificate errors during navigation (CDN/proxy TLS renegotiation)
  /SSL certificate error/i,
];
