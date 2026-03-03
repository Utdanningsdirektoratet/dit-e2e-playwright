/**
 * Course content tests for komp/frontend-canvas.
 *
 * Tests interactive course content within Canvas LMS:
 *  - Module tree navigation
 *  - Announcements
 *  - Reveal toggle, accordion, and tabs components
 *  - Vimeo video transcript reveal
 *  - Hint tooltips
 *  - Grafana iframe embed
 *  - Multilingual language switching within a course page
 *  - LTI iframe integration (KPAS Forvaltning, Diplom)
 *  - Course footer and information banner
 */
import { test, expect } from '@playwright/test';
import { loginWithBasicAuth, hasCredentials } from './auth.js';
import { routeToTestCourse } from './routes.js';
import { openModuleItem, getLtiModuleName, getLtiModuleIndex, useLocalTheme } from './helpers.js';

test.use({ viewport: { width: 1920, height: 1080 } });

test.describe('Course Content | Canvas', () => {
  useLocalTheme();

  test.beforeEach(() => {
    test.skip(!hasCredentials(), 'KOMP_CANVAS_*_USERNAME not set — skipping auth tests');
  });

  test('module tree toggles open', async ({ page }) => {
    test.setTimeout(46_000);
    await loginWithBasicAuth(page);
    await routeToTestCourse(page);

    const leftSideContainer = page.locator('#left-side #coursepage-left-side-view');
    const modulesContainer = leftSideContainer.locator(
      '.course-modules-container-with-progression',
    );
    await modulesContainer.waitFor({ state: 'visible' });
    await modulesContainer.locator('h5:has-text("Progresjon")').waitFor({ state: 'visible' });

    const moduleToggle = leftSideContainer
      .locator('.module-package__title h4 span.title:has-text("1. Innhold")')
      .first();
    const moduleContent = moduleToggle
      .locator('xpath=ancestor::div[contains(@class, "courses__treeview__item")]')
      .locator('.module-package__child-nodes');

    await moduleContent.waitFor({ state: 'hidden' });
    await moduleToggle.click();
    await moduleContent.waitFor({ state: 'visible' });
  });

  test('announcements navigate to announcement detail', async ({ page }) => {
    test.setTimeout(43_000);
    await loginWithBasicAuth(page);
    await routeToTestCourse(page);

    const leftSideContainer = page.locator('#left-side #coursepage-left-side-view');
    const announcementsLink = leftSideContainer.locator('a.course-page-announcements-link');
    await announcementsLink.waitFor({ state: 'visible' });
    await announcementsLink.click();

    const announcementsContainer = page.locator('#content-wrapper #content');
    await announcementsContainer.waitFor({ state: 'visible' });
    expect(page.url()).toContain('/announcements');

    await announcementsContainer
      .locator('a.ic-item-row__content-link h3:has-text("Test kunngjøring")')
      .click();
    await page
      .locator('h2[data-testid="message_title"] span[aria-hidden="true"]:has-text("Test kunngjøring")')
      .waitFor({ state: 'visible' });
    expect(page.url()).toContain('/discussion_topics/');
  });

  test.describe('Reveal component', () => {
    test('toggle expand/collapse works', async ({ page }) => {
      test.setTimeout(39_000);
      await loginWithBasicAuth(page);
      await routeToTestCourse(page);
      await openModuleItem(page, '1. Innhold', '1.2 Reveal');

      const revealContainer = page.locator('.custom-reveal-wrapper').first();
      const revealToggleButton = revealContainer.locator('a.custom-reveal-button');
      const revealContent = revealContainer.locator('.custom-reveal-content');

      await revealContent.waitFor({ state: 'hidden' });
      await revealToggleButton.click();
      await revealContent.waitFor({ state: 'visible' });
      await revealToggleButton.click();
      await revealContent.waitFor({ state: 'hidden' });
    });

    test('accordion expand/collapse works', async ({ page }) => {
      test.setTimeout(27_000);
      await loginWithBasicAuth(page);
      await routeToTestCourse(page);
      await openModuleItem(page, '1. Innhold', '1.2 Reveal');

      const revealContainer = page.locator('.custom-accordions').first();
      const revealAccordionButton = revealContainer.locator('button.custom-accordion').first();
      const revealContent = revealContainer.locator('.custom-accordion-panel').first();

      await revealContent.waitFor({ state: 'hidden' });
      await revealAccordionButton.click();
      await revealContent.waitFor({ state: 'visible' });
      await revealAccordionButton.click();
      await revealContent.waitFor({ state: 'hidden' });
    });

    test('tabs switch active panel', async ({ page }) => {
      test.setTimeout(24_000);
      await loginWithBasicAuth(page);
      await routeToTestCourse(page);
      await openModuleItem(page, '1. Innhold', '1.2 Reveal');

      const revealContainer = page.locator('.custom-segments').first();
      const firstTabButton = revealContainer.locator('.custom-segments__segment a').nth(0);
      const firstContent = revealContainer.locator('.custom-segments__pane').nth(0);
      const secondTabButton = revealContainer.locator('.custom-segments__segment a').nth(1);
      const secondContent = revealContainer.locator('.custom-segments__pane').nth(1);

      await firstContent.waitFor({ state: 'visible' });
      await secondContent.waitFor({ state: 'hidden' });

      await secondTabButton.click();
      await firstContent.waitFor({ state: 'hidden' });
      await secondContent.waitFor({ state: 'visible' });

      await firstTabButton.click();
      await firstContent.waitFor({ state: 'visible' });
      await secondContent.waitFor({ state: 'hidden' });
    });
  });

  test('Vimeo transcript reveal shows correct languages', async ({ page }, testInfo) => {
    test.setTimeout(123_000);
    // BUG: Works locally but not on CI in Firefox/WebKit
    if (testInfo.project.name.includes('firefox') || testInfo.project.name.includes('webkit'))
      test.skip();

    await loginWithBasicAuth(page);
    await routeToTestCourse(page);
    await openModuleItem(page, '1. Innhold', '1.4 Vimeo');

    await page.waitForTimeout(30_000); // wait for Vimeo videos to load

    const revealContainer = page.locator('.show-content > p > .custom-reveal-wrapper');

    // Helper: open reveal, verify languages, close reveal
    async function checkTranscript(container, languages) {
      const toggleButton = container.locator('a.custom-reveal-button');
      const content = container.locator('.custom-reveal-content').first();
      await container.waitFor({ state: 'visible' });
      await content.waitFor({ state: 'hidden' });
      await toggleButton.click();
      // Retry click if content didn't open (flaky in CI)
      if (!(await content.isVisible())) await toggleButton.click();
      await content.waitFor({ state: 'visible' });

      if (languages.length === 0) {
        await content
          .locator('p:has-text("Videotranskript er dessverre ikke tilgjengelig for denne videoen.")')
          .waitFor({ state: 'visible' });
      } else {
        const optionTexts = await container
          .locator('select.custom-reveal-button option')
          .allTextContents();
        expect(optionTexts.sort()).toEqual(languages.sort());
      }

      await toggleButton.click();
      await content.waitFor({ state: 'hidden' });
    }

    await checkTranscript(revealContainer.nth(0), ['Norsk bokmål']);
    await checkTranscript(revealContainer.nth(1), ['Norsk bokmål', 'Norsk nynorsk']);
    await checkTranscript(revealContainer.nth(2), ['Norsk bokmål', 'Davvisámegiella', 'Norsk nynorsk']);
    await checkTranscript(revealContainer.nth(3), []);
  });

  test('hint tooltip appears on hover', async ({ page }) => {
    test.setTimeout(27_000);
    await loginWithBasicAuth(page);
    await routeToTestCourse(page);
    await openModuleItem(page, '1. Innhold', '1.6 Hint');

    const contentContainer = page.locator('#content');
    const hintButton = contentContainer.locator('span.tooltip').first();
    const hintContent = hintButton.locator('.tooltiptext-box').first();

    await hintButton.waitFor({ state: 'visible' });
    await hintContent.waitFor({ state: 'hidden' });
    await hintButton.hover();
    await hintContent.waitFor({ state: 'visible' });
    await page.mouse.move(0, 0);
    await hintContent.waitFor({ state: 'hidden' });
  });

  test('Grafana iframe loads', async ({ page }, testInfo) => {
    test.setTimeout(30_000);
    // BUG: Third-party cookie restrictions block Grafana auth in Safari/WebKit
    // ref: https://blog.certa.dev/third-party-cookie-restrictions-for-iframes-in-safari
    if (testInfo.project.name.includes('webkit')) test.skip();

    await loginWithBasicAuth(page);
    await routeToTestCourse(page);
    await openModuleItem(page, '1. Innhold', '1.8 Grafana');

    const iframeElement = page.frameLocator('iframe[title="Grafana"]');
    await iframeElement
      .locator('h1:has-text("Digital kompetanse for skoleeiere og skoleledere")')
      .first()
      .waitFor({ state: 'visible', timeout: 60_000 });
  });

  test('multilingual language switcher changes content', async ({ page }) => {
    test.setTimeout(30_000);
    await loginWithBasicAuth(page);
    await routeToTestCourse(page);
    await openModuleItem(page, '1. Innhold', '1.9 Flerspråklig');

    const languageContainer = page.locator('.course-page__banner__actions .dropdown');
    const languageButton = languageContainer.locator('button.btn--dropdown').first();
    const languageDropdown = languageContainer.locator('.dropdown__content').first();

    await languageButton.waitFor({ state: 'visible' });
    await languageDropdown.waitFor({ state: 'hidden' });
    await languageButton.click();
    await languageDropdown.waitFor({ state: 'visible' });

    await languageDropdown.locator('.dropdown__item:has-text("Nynorsk")').click();
    await page
      .locator('h1.page-title span[lang="nn"].language:has-text("1.9 Flerspråklig på NN")')
      .waitFor({ state: 'visible' });
    expect(page.url()).toContain('lang=nn');

    await languageButton.click();
    await languageDropdown.locator('.dropdown__item:has-text("Sápmi")').click();
    await page
      .locator('h1.page-title span[lang="se"].language:has-text("1.9 Flerspråklig på SE")')
      .waitFor({ state: 'visible' });
    expect(page.url()).toContain('lang=se');

    await languageButton.click();
    await languageDropdown.locator('.dropdown__item:has-text("Bokmål")').click();
    await page
      .locator('h1.page-title span[lang="nb"].language:has-text("1.9 Flerspråklig")')
      .waitFor({ state: 'visible' });
    expect(page.url()).toContain('lang=nb');
  });

  test('KPAS Forvaltning LTI iframe loads', async ({ page }) => {
    test.setTimeout(39_000);
    await loginWithBasicAuth(page);
    await routeToTestCourse(page);
    await openModuleItem(page, getLtiModuleName(), `${getLtiModuleIndex()}.2 Forvaltning`);

    const iframeElement = page.frameLocator('iframe[title="KPAS"]');
    await iframeElement
      .locator('h2:has-text("Helsesjekk")')
      .first()
      .waitFor({ state: 'visible', timeout: 60_000 });
  });

  test('KPAS Diplom LTI shows not-completed then completed state', async ({ page }) => {
    test.setTimeout(74_000);
    await loginWithBasicAuth(page);
    await routeToTestCourse(page);
    await openModuleItem(page, getLtiModuleName(), `${getLtiModuleIndex()}.3 Diplom`);

    const iframeElement = page.frameLocator('iframe[title="KPAS"]');
    const appContainer = iframeElement.locator('#app');
    await appContainer.waitFor({ state: 'visible', timeout: 30_000 });

    // If diploma is already earned, mark the test item as not done first
    const diplomaBorder = appContainer.locator('.diplomaBorder');
    if (await diplomaBorder.isVisible()) {
      await openModuleItem(page, '1. Innhold', '1.1 Infobokser');
      await page.locator('button.custom-mark-as-done-checkbox').waitFor({ state: 'visible' });
      await page.locator('button#mark-as-done-checkbox').click();
      await page.locator('button[completed="false"]').waitFor({ state: 'visible' });
      await openModuleItem(page, getLtiModuleName(), `${getLtiModuleIndex()}.3 Diplom`);
    }

    // Verify not-completed state
    await iframeElement
      .locator('h2:has-text("Diplomstatus: Ikke fullført")')
      .first()
      .waitFor({ state: 'visible', timeout: 60_000 });
    await iframeElement
      .locator('.item-checkmark span:has-text("X")')
      .first()
      .waitFor({ state: 'visible' });

    // Mark the required item as done
    await openModuleItem(page, '1. Innhold', '1.1 Infobokser');
    await page.locator('button.custom-mark-as-done-checkbox').waitFor({ state: 'visible' });
    await page.locator('button#mark-as-done-checkbox').click();
    await page.locator('button[completed="true"]').waitFor({ state: 'visible' });

    // Verify diploma is now earned
    await openModuleItem(page, getLtiModuleName(), `${getLtiModuleIndex()}.3 Diplom`);
    await diplomaBorder.waitFor({ state: 'visible', timeout: 30_000 });
  });

  test('course footer license and banner are visible', async ({ page }) => {
    test.setTimeout(22_000);
    await loginWithBasicAuth(page);
    await routeToTestCourse(page);

    await page.locator('footer.footer .course-license-footer').waitFor({ state: 'visible' });

    const banner = page.locator('.fixed-bottom .information-banner-content-text');
    await banner.waitFor({ state: 'attached', timeout: 30_000 });
    await banner.scrollIntoViewIfNeeded();

    await expect(banner).toBeVisible({ timeout: 10_000 });
    await expect(banner).toContainText(/lorem|test/i);
  });
});
