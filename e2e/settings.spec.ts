import { test, expect } from '@playwright/test';

test.describe('Settings drawer', () => {
  // Playwright gives every test a fresh BrowserContext (isolated cookies +
  // origin storage), so IndexedDB starts empty for each test. No manual
  // cleanup needed.
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
  });

  test('opens via gear button and closes via Escape', async ({ page }) => {
    await page.getByRole('button', { name: '開啟設定' }).click();
    await expect(page.getByRole('dialog', { name: '設定' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: '設定' })).toBeHidden();
  });

  test('clicking the backdrop closes the drawer', async ({ page }) => {
    await page.getByRole('button', { name: '開啟設定' }).click();
    await expect(page.getByRole('dialog', { name: '設定' })).toBeVisible();
    await page.getByTestId('settings-backdrop').click();
    await expect(page.getByRole('dialog', { name: '設定' })).toBeHidden();
  });

  test('changing focus duration updates the clock immediately when idle', async ({ page }) => {
    await expect(page.getByLabel(/剩餘時間/)).toHaveAccessibleName(/25:00/);
    await page.getByRole('button', { name: '開啟設定' }).click();
    const focusInput = page.getByLabel('專注時間（分鐘）');
    await focusInput.fill('30');
    await focusInput.blur();
    await page.keyboard.press('Escape');
    await expect(page.getByLabel(/剩餘時間/)).toHaveAccessibleName(/30:00/);
  });

  test('reload preserves changed durations (persisted to IndexedDB)', async ({ page }) => {
    await page.getByRole('button', { name: '開啟設定' }).click();
    await page.getByLabel('專注時間（分鐘）').fill('45');
    await page.getByLabel('專注時間（分鐘）').blur();
    await page.keyboard.press('Escape');
    await expect(page.getByLabel(/剩餘時間/)).toHaveAccessibleName(/45:00/);

    await page.reload();
    await expect(page.getByLabel(/剩餘時間/)).toHaveAccessibleName(/45:00/);
  });

  test('inputs clamp to a valid range (1..120 minutes)', async ({ page }) => {
    await page.getByRole('button', { name: '開啟設定' }).click();
    const focusInput = page.getByLabel('專注時間（分鐘）');
    await focusInput.fill('999');
    await focusInput.blur();
    await expect(focusInput).toHaveValue('120');

    await focusInput.fill('0');
    await focusInput.blur();
    await expect(focusInput).toHaveValue('1');

    await focusInput.fill('-5');
    await focusInput.blur();
    await expect(focusInput).toHaveValue('1');
  });

  test('drawer is keyboard-trappable: tab cycles inside the dialog', async ({ page }) => {
    await page.getByRole('button', { name: '開啟設定' }).click();
    await page.getByLabel('專注時間（分鐘）').focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    // After tabbing past the last focusable element, focus should still be
    // inside the dialog (focus trap). We just check focus has not escaped
    // to the document body.
    const activeIsInDialog = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      return dialog?.contains(document.activeElement) ?? false;
    });
    expect(activeIsInDialog).toBe(true);
  });
});
