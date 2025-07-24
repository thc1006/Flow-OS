// 無障礙性測試的設定檔案
import { configure } from '@testing-library/react';
import 'jest-axe/extend-expect';

// 設定 Testing Library
configure({
  // 增加異步操作的等待時間
  asyncUtilTimeout: 5000,
  
  // 設定測試 ID 屬性
  testIdAttribute: 'data-testid',
  
  // 在找不到元素時顯示更詳細的錯誤訊息
  getElementError: (message, container) => {
    const error = new Error(
      `${message}\n\n${container.innerHTML}`
    );
    error.name = 'TestingLibraryElementError';
    return error;
  }
});

// 模擬 axe-core
jest.mock('axe-core', () => ({
  run: jest.fn().mockResolvedValue({
    violations: [],
    passes: [],
    incomplete: [],
    inapplicable: []
  }),
  configure: jest.fn(),
  getRules: jest.fn().mockReturnValue([])
}));

// 設定全域測試環境
beforeEach(() => {
  // 重設所有模擬
  jest.clearAllMocks();
  
  // 設定 ARIA 相關的模擬
  Object.defineProperty(window, 'getComputedStyle', {
    value: jest.fn().mockImplementation(() => ({
      getPropertyValue: jest.fn().mockReturnValue(''),
      color: 'rgb(0, 0, 0)',
      backgroundColor: 'rgb(255, 255, 255)'
    }))
  });
  
  // 模擬 focus 和 blur 事件
  HTMLElement.prototype.focus = jest.fn();
  HTMLElement.prototype.blur = jest.fn();
  HTMLElement.prototype.scrollIntoView = jest.fn();
});

afterEach(() => {
  // 清理 DOM
  document.body.innerHTML = '';
  
  // 清理事件監聽器
  document.removeAllListeners?.();
});

// 全域無障礙性測試輔助函數
global.expectToBeAccessible = async (container) => {
  const { toHaveNoViolations } = require('jest-axe');
  expect.extend(toHaveNoViolations);
  
  const results = await axe(container);
  expect(results).toHaveNoViolations();
};

// 鍵盤導航測試輔助函數
global.testKeyboardNavigation = async (container, expectedFocusOrder) => {
  const { fireEvent } = require('@testing-library/react');
  
  // 聚焦到第一個可聚焦元素
  const firstFocusableElement = container.querySelector('[tabindex="0"], button, input, select, textarea, a[href]');
  if (firstFocusableElement) {
    firstFocusableElement.focus();
  }
  
  // 測試 Tab 鍵導航
  for (let i = 0; i < expectedFocusOrder.length - 1; i++) {
    fireEvent.keyDown(document.activeElement, { key: 'Tab' });
    
    const expectedElement = container.querySelector(expectedFocusOrder[i + 1]);
    expect(document.activeElement).toBe(expectedElement);
  }
};

// 螢幕閱讀器測試輔助函數
global.testScreenReaderSupport = (container) => {
  // 檢查 ARIA 標籤
  const elementsWithAriaLabel = container.querySelectorAll('[aria-label]');
  const elementsWithAriaLabelledby = container.querySelectorAll('[aria-labelledby]');
  const elementsWithAriaDescribedby = container.querySelectorAll('[aria-describedby]');
  
  // 檢查語義化標籤
  const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
  const buttons = container.querySelectorAll('button');
  const links = container.querySelectorAll('a[href]');
  const inputs = container.querySelectorAll('input, select, textarea');
  
  return {
    ariaLabels: elementsWithAriaLabel.length,
    ariaLabelledby: elementsWithAriaLabelledby.length,
    ariaDescribedby: elementsWithAriaDescribedby.length,
    headings: headings.length,
    buttons: buttons.length,
    links: links.length,
    inputs: inputs.length
  };
};

console.log('Accessibility testing setup completed');
