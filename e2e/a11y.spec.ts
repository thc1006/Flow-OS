import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Flow-OS accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    await injectAxe(page);
  });

  test('main page has no WCAG 2 A/AA violations', async ({ page }) => {
    await checkA11y(page, undefined, {
      detailedReport: true,
      detailedReportOptions: { html: true },
      axeOptions: { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } },
    });
  });

  test('start button is reachable via keyboard and toggles to pause', async ({ page }) => {
    const startButton = page.getByRole('button', { name: '開始計時' });
    await startButton.focus();
    await expect(startButton).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: '暫停計時' })).toBeVisible();
  });

  test('main heading is Flow-OS', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('Flow-OS');
  });

  test('respects prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();
    await injectAxe(page);
    await checkA11y(page);
  });
});

test.describe('Flow-OS responsive layout', () => {
  // Common laptop / tablet / phone viewports — every primary control must
  // be in-view without scrolling.
  for (const [label, viewport] of [
    ['1366×768 (legacy laptop)', { width: 1366, height: 768 }],
    ['1280×720 (small laptop)', { width: 1280, height: 720 }],
    ['1024×600 (netbook)', { width: 1024, height: 600 }],
    ['820×1180 (iPad portrait)', { width: 820, height: 1180 }],
    ['414×896 (iPhone 11)', { width: 414, height: 896 }],
    ['360×640 (compact Android)', { width: 360, height: 640 }],
  ] as const) {
    test(`controls are visible without scrolling on ${label}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('./');
      for (const name of ['開始計時', '重設計時']) {
        const button = page.getByRole('button', { name });
        await expect(button).toBeVisible();
        const box = await button.boundingBox();
        expect(box, `boundingBox for ${name}`).not.toBeNull();
        expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
        expect(box!.y).toBeGreaterThanOrEqual(0);
      }
    });
  }

  test('lg viewport renders the progress ring beside the clock (two-column)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('./');
    const clock = await page.getByLabel(/剩餘時間/).boundingBox();
    const ring = await page.locator('svg:visible').first().boundingBox();
    expect(clock).not.toBeNull();
    expect(ring).not.toBeNull();
    // ring should be to the RIGHT of the clock (x-axis), confirming two-column layout
    expect(ring!.x).toBeGreaterThan(clock!.x + clock!.width / 2);
  });

  test('sm viewport stacks ring under the clock (single-column)', async ({ page }) => {
    await page.setViewportSize({ width: 414, height: 896 });
    await page.goto('./');
    const clock = await page.getByLabel(/剩餘時間/).boundingBox();
    const ring = await page.locator('svg:visible').first().boundingBox();
    expect(clock).not.toBeNull();
    expect(ring).not.toBeNull();
    // ring sits BELOW the clock vertically
    expect(ring!.y).toBeGreaterThan(clock!.y + clock!.height);
  });
});
