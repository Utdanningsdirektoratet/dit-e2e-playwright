// Detect/test contract for external embed iframes (Qbrick).
// Logic and rationale live in shared/check-embeds.js.
//
// Chromium-only: embed URL availability is an HTTP check; browser engine
// does not affect the result, so we skip on Firefox/WebKit to avoid 3×
// duplicate work across the 4-browser matrix.
import { expect } from '@playwright/test';
import {
  detectEmbeds,
  checkEmbeds,
  formatEmbedIssues,
} from '../../../../shared/check-embeds.js';

export async function detect(page) {
  if (page.context().browser().browserType().name() !== 'chromium') return false;
  const embeds = await detectEmbeds(page);
  return embeds.length > 0;
}

export async function test(page) {
  // Cap at 2 per platform — a page may have many Qbrick iframes but checking
  // 2 is sufficient to catch "all videos on this page are private/removed".
  const issues = await checkEmbeds(page, { maxPerPlatform: 2 });
  expect(issues, formatEmbedIssues(issues)).toHaveLength(0);
}
