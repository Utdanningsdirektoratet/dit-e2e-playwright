/**
 * Console log patterns to ignore during komp/frontend-canvas testing.
 * Canvas LMS loads many third-party scripts — keep this list focused.
 * Add patterns here as new noise surfaces, not in spec files.
 */
export const CONSOLE_WHITELIST = [
  // Canvas LMS telemetry and analytics
  /matomo/i,
  /canvasanalytics/i,
  // Canvas LMS internal debug output
  /\[Canvas\]/i,
  // Azure Application Insights
  /application\s*insights/i,
  /dc\.services\.visualstudio\.com/i,
  // Browser and CDN noise
  /favicon\.ico/i,
  /Failed to load resource/i,
  /Preflight response is not successful/i,
  /permissions policy violation/i,
  // Qbrick video embeds (checked separately by embed tests)
  /qbrick\.com/i,
  // Sentry (error tracking SDK initialisation warnings)
  /\[Sentry\]/i,
  // Browser engine noise (WebGPU/WebGL fallback in headless Chromium)
  /WebGPU/i,
  /WebGL/i,
];
