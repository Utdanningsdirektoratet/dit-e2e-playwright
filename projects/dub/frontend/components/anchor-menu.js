/**
 * Detect and test the anchor navigation and copy-link modal.
 * Topic pages have a floating side menu (.anchor-menu-container) with section
 * links. Clicking a section heading (.anchor-title-container) opens a modal
 * (#copy-modal) with the anchor URL and a "Kopier nettadresse" copy button.
 *
 * NOTE: Pages with multiple sections create multiple #copy-modal elements.
 * The heading buttons and close button use aria-hidden="true", so Playwright's
 * actionability checks don't work. We use JS-level clicks via page.evaluate().
 *
 * On mobile viewports the anchor menu collapses into a "Vis/Skjul innholdsmeny"
 * toggle — heading buttons are not rendered, so detect() returns false.
 */
/* global document */
import { expect } from "@playwright/test";

const HEADING_BUTTON = "button.anchor-title-container";
const COPY_MODAL = "#copy-modal";
const COPY_INPUT = "#modal-autoselect";

export async function detect(page) {
  // Only detect when heading buttons exist (desktop); on mobile the anchor
  // menu collapses into a toggle and heading buttons are absent.
  return (await page.locator(HEADING_BUTTON).count()) > 0;
}

export async function test(page) {
  // Use JS click — heading buttons are obscured by the floating anchor menu
  // and the close button has aria-hidden="true"
  await page.evaluate((sel) => {
    document.querySelector(sel)?.click();
  }, HEADING_BUTTON);

  // Modal should appear with anchor URL in input
  await expect(page.locator(COPY_MODAL).first()).toBeVisible();
  await expect(page.locator(COPY_INPUT).first()).toHaveValue(/#anchor-/);

  // Close modal via JS (close button has aria-hidden="true")
  await page.evaluate(() => {
    document.querySelector("#close-copy-modal")?.click();
  });
  await expect(page.locator(COPY_MODAL).first()).not.toBeVisible();
}
