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
    ['932×430 (iPhone landscape)', { width: 932, height: 430 }],
    ['667×375 (iPhone SE landscape)', { width: 667, height: 375 }],
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

  test.describe('landscape phone (touch + coarse pointer)', () => {
    test.use({ hasTouch: true, isMobile: true, viewport: { width: 932, height: 430 } });

    test('hides the global header to reclaim vertical space', async ({ page }) => {
      await page.goto('./');
      // h1 still in DOM but hidden by landscape-compact:hidden
      await expect(page.locator('h1')).toBeHidden();
      // ring placed beside clock (two-column compact layout) — ring x > clock x
      const clock = await page.getByLabel(/剩餘時間/).boundingBox();
      const ring = await page.locator('svg:visible').first().boundingBox();
      expect(ring!.x).toBeGreaterThan(clock!.x);
    });
  });

  test('desktop browser shrunk to short height does NOT activate landscape-compact', async ({
    page,
  }) => {
    // Same dimensions as a landscape phone but with mouse pointer (fine).
    // Header should remain visible — proof that the pointer:coarse guard works.
    await page.setViewportSize({ width: 932, height: 430 });
    await page.goto('./');
    await expect(page.locator('h1')).toBeVisible();
  });

  for (const [label, viewport] of [
    ['lg', { width: 1280, height: 720 }],
    ['sm', { width: 414, height: 896 }],
    ['xs', { width: 360, height: 640 }],
    ['landscape', { width: 932, height: 430 }],
  ] as const) {
    test(`exactly one SVG in DOM at ${label} viewport`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('./');
      const svgCount = await page.locator('svg').count();
      expect(svgCount).toBe(1);
    });
  }

  test('clock digits use the fluid display font + tight letter spacing', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('./');
    const clock = page.getByLabel(/剩餘時間/);
    const styles = await clock.evaluate((el) => {
      const cs = window.getComputedStyle(el);
      return {
        fontSize: cs.fontSize,
        lineHeight: cs.lineHeight,
        letterSpacing: cs.letterSpacing,
        fontFamily: cs.fontFamily,
      };
    });
    // clamp(3rem, 8vw + 1rem, 8rem) at width 1280 → 8*12.8 + 16 = 118.4px, but capped at 8rem = 128px.
    // Use a generous range — the point is "noticeably bigger than body copy".
    const px = parseFloat(styles.fontSize);
    expect(px).toBeGreaterThan(80);
    expect(px).toBeLessThanOrEqual(128);
    // letterSpacing -0.02em ≈ -1.6 to -2.6px in this size range
    expect(styles.letterSpacing.startsWith('-')).toBe(true);
    // tabular-nums + monospace → some monospace family present
    expect(styles.fontFamily.toLowerCase()).toMatch(/mono|courier|menlo|consolas|ui-monospace/);
  });

  test('Fitts: primary CTA wider than reset button', async ({ page }) => {
    await page.setViewportSize({ width: 414, height: 896 });
    await page.goto('./');
    const start = await page.getByRole('button', { name: '開始計時' }).boundingBox();
    const reset = await page.getByRole('button', { name: '重設計時' }).boundingBox();
    expect(start).not.toBeNull();
    expect(reset).not.toBeNull();
    expect(start!.width).toBeGreaterThan(reset!.width);
    // WCAG 2.5.5 Target Size (AAA): both ≥ 44px tall
    expect(start!.height).toBeGreaterThanOrEqual(44);
    expect(reset!.height).toBeGreaterThanOrEqual(44);
  });
});
