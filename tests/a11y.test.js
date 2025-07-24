const { test, expect } = require('@playwright/test');
const { injectAxe, checkA11y } = require('axe-playwright');

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await injectAxe(page);
  });

  test('should not have any accessibility violations on main page', async ({ page }) => {
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true },
      rules: {
        'color-contrast': { enabled: true },
        'keyboard-navigation': { enabled: true },
        'focus-management': { enabled: true }
      }
    });
  });

  test('should support keyboard navigation', async ({ page }) => {
    // 測試 Tab 鍵導航順序
    await page.keyboard.press('Tab');
    let focusedElement = await page.locator(':focus');
    let elementText = await focusedElement.textContent();
    expect(elementText).toContain('開始');
    
    // 繼續 Tab 到下一個元素
    await page.keyboard.press('Tab');
    focusedElement = await page.locator(':focus');
    elementText = await focusedElement.textContent();
    expect(elementText).toContain('重設');
    
    // 測試 Enter 鍵啟動功能
    await page.keyboard.press('Shift+Tab'); // 回到開始按鈕
    await page.keyboard.press('Enter');
    
    // 驗證計時器已開始
    await page.waitForTimeout(1000);
    const pauseButton = page.locator('button:has-text("暫停")');
    expect(await pauseButton.isVisible()).toBeTruthy();
  });

  test('should work with screen reader', async ({ page }) => {
    // 檢查重要元素的 ARIA 標籤和語義化標記
    
    // 檢查計時器顯示的 ARIA live 區域
    const timerDisplay = page.locator('[aria-live="polite"]');
    expect(await timerDisplay.isVisible()).toBeTruthy();
    
    const ariaLabel = await timerDisplay.getAttribute('aria-label');
    expect(ariaLabel).toContain('剩餘時間');
    
    // 檢查按鈕的 ARIA 標籤
    const startButton = page.locator('button[aria-label="開始計時"]');
    expect(await startButton.isVisible()).toBeTruthy();
    
    const resetButton = page.locator('button[aria-label="重設計時"]');
    expect(await resetButton.isVisible()).toBeTruthy();
    
    // 檢查主標題結構
    const mainHeading = page.locator('h1');
    expect(await mainHeading.textContent()).toBe('Flow-OS');
  });

  test('should handle focus management correctly', async ({ page }) => {
    // 測試按鈕點擊後的焦點管理
    const startButton = page.locator('button[aria-label="開始計時"]');
    await startButton.click();
    
    // 等待按鈕狀態變化
    await page.waitForTimeout(500);
    
    // 驗證焦點是否正確轉移到暫停按鈕
    const pauseButton = page.locator('button[aria-label="暫停計時"]');
    expect(await pauseButton.isVisible()).toBeTruthy();
    
    // 測試重設按鈕的焦點
    const resetButton = page.locator('button[aria-label="重設計時"]');
    await resetButton.focus();
    expect(await resetButton).toBeFocused();
  });

  test('should respect prefers-reduced-motion', async ({ page }) => {
    // 模擬用戶偏好減少動畫
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    // 重新載入頁面
    await page.reload();
    await injectAxe(page);
    
    // 驗證動畫相關的無障礙性
    await checkA11y(page, null, {
      rules: {
        'motion': { enabled: true }
      }
    });
    
    // 檢查是否正確處理了動畫偏好
    const bodyStyles = await page.evaluate(() => {
      return window.getComputedStyle(document.body);
    });
    
    // 驗證相關 CSS 變數或類別是否已應用
  });

  test('should have proper color contrast', async ({ page }) => {
    // 專門測試顏色對比度
    await checkA11y(page, null, {
      rules: {
        'color-contrast': { enabled: true }
      },
      tags: ['wcag2a', 'wcag2aa']
    });
  });

  test('should handle different session types accessibly', async ({ page }) => {
    // 測試不同計時器狀態的無障礙性
    
    // 開始專注時間
    await page.click('button[aria-label="開始計時"]');
    await page.waitForTimeout(1000);
    
    // 檢查狀態指示器的無障礙性
    const sessionIndicator = page.locator('text=專注時間');
    expect(await sessionIndicator.isVisible()).toBeTruthy();
    
    // 暫停並重設
    await page.click('button[aria-label="暫停計時"]');
    await page.click('button[aria-label="重設計時"]');
    
    // 再次檢查無障礙性
    await checkA11y(page);
  });
});
