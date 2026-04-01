// Detect and test teacher guidance information blocks.
// Teacher pages (/larer/…) contain a .teacher-guidance-information section
// with .block content blocks that typically include button/link groups.
// Auto-detected — not all larer pages have this section.
import { expect } from "@playwright/test";

const CONTAINER = ".teacher-guidance-information";
const BLOCK = `${CONTAINER} .block`;

export async function detect(page) {
  // Only run if there is at least one visible block — the container may exist
  // on stage/preview with unpublished (hidden) content, which would cause false failures.
  return (await page.locator(BLOCK).filter({ visible: true }).count()) > 0;
}

export async function test(page) {
  const container = page.locator(CONTAINER);
  await expect(container).toBeVisible();

  // At least one content block should be visible (first() on unfiltered blocks
  // can return a hidden DOM node when some blocks are hidden by the CMS)
  const visibleBlocks = page.locator(BLOCK).filter({ visible: true });
  await expect(visibleBlocks.first()).toBeVisible();

  // If button/link blocks are present, verify they have valid hrefs
  const blockLinks = visibleBlocks.locator("a[href]");
  if ((await blockLinks.count()) > 0) {
    const href = await blockLinks.first().getAttribute("href");
    expect(href, "Block link should have a non-empty href").toBeTruthy();
  }
}
