/**
 * Canvas LMS stage vs. production detection.
 *
 * Detects environment from Canvas URL pattern (*.test.instructure.com = staging).
 * All Canvas instances follow this convention from Instructure.
 * See: README.md § Adding a Project for usage pattern.
 */

/**
 * Detect if the Canvas instance is a staging environment.
 *
 * @param {string} canvasBaseURL — Canvas instance root URL
 * @returns {boolean}
 */
export function isCanvasStage(canvasBaseURL) {
  return canvasBaseURL.includes('.test.');
}

/**
 * Assert that Canvas header displays stage environment indicator.
 *
 * On Canvas stage instances, the header typically has a .stage class
 * and a light-blue background (#bed5e8) to visually warn that this is not production.
 *
 * This is a standard convention implemented by most Canvas instances.
 *
 * @param {import('@playwright/test').Locator} headerLocator
 * @param {boolean} expectStage — true if expecting stage styling, false for production
 */
export async function assertCanvasStageStyling(headerLocator, expectStage) {
  const { expect } = await import('@playwright/test');

  const hasStageClass = await headerLocator.evaluate((el) => el.classList.contains('stage'));
  const hasStageBanner = await headerLocator
    .locator('.stage-banner:has-text("stage")')
    .isVisible()
    .catch(() => false);

  // eslint-disable-next-line no-undef -- runs inside evaluate() (browser context)
  const bgColor = await headerLocator.evaluate((el) => window.getComputedStyle(el).backgroundColor);

  const rgbToHex = (rgb) => {
    const result = rgb.match(/\d+/g)?.map(Number);
    return `#${result?.map((x) => x.toString(16).padStart(2, '0')).join('')}`;
  };

  expect(hasStageClass).toBe(expectStage);
  expect(hasStageBanner).toBe(expectStage);
  expect(rgbToHex(bgColor)).toBe(expectStage ? '#bed5e8' : '#ffffff');
}
