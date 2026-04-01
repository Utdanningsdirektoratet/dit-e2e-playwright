/**
 * Course content test helpers for komp/frontend-canvas.
 *
 * Contains helpers for interactive content components (Vimeo transcripts, etc.)
 * used by the Course Content spec.
 */
import { expect } from "@playwright/test";

/**
 * Open a Vimeo transcript reveal, verify available languages, then close it.
 *
 * @param {import('@playwright/test').Locator} container - The .custom-reveal-wrapper locator
 * @param {string[]} languages - Expected language options (empty = unavailable message)
 */
export async function checkTranscript(container, languages) {
  const toggleButton = container.locator("a.custom-reveal-button");
  const content = container.locator(".custom-reveal-content").first();
  await container.waitFor({ state: "visible", timeout: 10_000 });
  await content.waitFor({ state: "hidden", timeout: 10_000 });
  await toggleButton.click({ timeout: 10_000 });
  // Retry click if content didn't open (flaky in CI)
  if (!(await content.isVisible()))
    await toggleButton.click({ timeout: 10_000 });
  await content.waitFor({ state: "visible", timeout: 10_000 });

  if (languages.length === 0) {
    await content
      .locator(
        'p:has-text("Videotranskript er dessverre ikke tilgjengelig for denne videoen.")',
      )
      .waitFor({ state: "visible", timeout: 10_000 });
  } else {
    const optionTexts = await container
      .locator("select.custom-reveal-button option")
      .allTextContents();
    expect(optionTexts.sort()).toEqual(languages.sort());
  }

  await toggleButton.click({ timeout: 10_000 });
  await content.waitFor({ state: "hidden", timeout: 10_000 });
}
