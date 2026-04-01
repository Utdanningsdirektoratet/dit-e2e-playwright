/**
 * Detect and test slideshow/carousel components.
 * dubestemmer.no uses a custom jQuery slideshow plugin with GUID-based IDs.
 * Each slider has .slider-previous-arrow / .slider-next-arrow nav buttons
 * and .page-numbers-wrapper pagination.
 */
import { expect } from "@playwright/test";

export const SELECTOR = '[id^="main-slider-"]';

export async function detect(page) {
  return (await page.locator(SELECTOR).count()) > 0;
}

export async function test(page) {
  const sliders = page.locator(SELECTOR);
  const count = await sliders.count();
  expect(count).toBeGreaterThan(0);

  let testedNav = false;

  for (let i = 0; i < count; i++) {
    const slider = sliders.nth(i);
    if (!(await slider.isVisible())) continue;
    await expect(slider).not.toBeEmpty();

    if (!testedNav) {
      const nextBtn = slider.locator(".slider-next-arrow");
      if ((await nextBtn.count()) > 0 && (await nextBtn.isVisible())) {
        await nextBtn.click();
        await expect(slider).not.toBeEmpty();
      }
      testedNav = true;
    }
  }
}
