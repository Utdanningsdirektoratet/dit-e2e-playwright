/**
 * Detect and test film filter components.
 * dubestemmer.no /filmoversikt/ uses dropdown filter groups with radio inputs
 * inside .videopage-filter-wrapper. Each group has a toggle button that opens
 * a dropdown with label.custom-radio-button-label options.
 *
 * NOTE: .radio__checkcircle is the LANGUAGE SELECTOR (removed from DOM on load),
 * NOT the film filter. Don't use it.
 */
import { expect } from '@playwright/test';

const CONTAINER = '.videopage-filter-wrapper';
const DROPDOWN_TOGGLE = 'button.item-toggle';
const OPTION = 'label.custom-radio-button-label';
const FILM_ITEM = '.single-video-wrapper';
const FILTER_TAG = '.filtertag-wrapper';

export async function detect(page) {
  return (await page.locator(CONTAINER).count()) > 0;
}

export async function test(page) {
  const container = page.locator(CONTAINER);
  await expect(container).toBeVisible();
  await expect(page.locator(FILM_ITEM).first()).toBeVisible();

  await container.locator(DROPDOWN_TOGGLE).first().click();
  await container.locator(OPTION).first().click();
  await expect(page.locator(FILTER_TAG).first()).toBeVisible();

  // Remove filter to restore state
  await page.locator(`${FILTER_TAG} button`).first().click();
  await expect(page.locator(FILTER_TAG)).toHaveCount(0);
}
