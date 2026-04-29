import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Flow-OS accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
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
