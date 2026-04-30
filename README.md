# Flow-OS

專注與成長的數位夥伴 — 一個輕量、可離線的番茄鐘 PWA。

🔗 線上版本：<https://thc1006.github.io/Flow-OS/>

## Quick start

```bash
npm ci
npm run dev          # http://localhost:3000
npm run build        # 產出 dist/
npm run preview      # 預覽 dist/
```

## Scripts

| script         | 用途                                       |
| -------------- | ------------------------------------------ |
| `dev`          | Vite dev server                            |
| `build`        | Production build (dist/)                   |
| `preview`      | Static preview of dist/                    |
| `start`        | Alias of preview, for CI server            |
| `lint`         | ESLint on src/, tests/, e2e/               |
| `format`       | Prettier check (read-only, used by CI)     |
| `format:write` | Prettier write                             |
| `type-check`   | tsc --noEmit                               |
| `test`         | Vitest (unit + jsdom)                      |
| `test:e2e`     | Playwright (含 a11y + responsive viewport) |

## Architecture

```
src/
├── components/Timer.tsx      # 番茄鐘 UI（grid-area + container queries）
├── store/timerStore.ts       # Zustand store; Date.now() 基準避開 background-tab drift
├── utils/
│   ├── eventBus.ts           # 型別化事件總線（TIMER_START/PAUSE/COMPLETE）
│   ├── database.ts           # Dexie schema — 只存 completed sessions
│   ├── interactions.ts       # Confetti 慶祝動畫（lazy import）
│   └── pwa.ts                # Service Worker 註冊與安全更新流程
└── main.tsx, App.tsx, index.css
public/
├── favicon.svg               # Brand mark
├── manifest.json             # PWA manifest
└── sw.js                     # Service Worker（cache-first / network-first / SWR 三策略）
```

### 設計重點

- **計時器無漂移**：`setInterval` 不直接遞減；每 tick 從 `Date.now()` 重算剩餘秒數。背景分頁回前景後可即時校正。
- **Fluid responsive**：字級、間距、進度環尺寸都是 `clamp()`，配合 `@container/timer` 容器查詢——
  Timer 元件可嵌入任何寬度的容器而不依賴 viewport breakpoint。
- **ARIA 不噪音**：主數字不掛 live region，狀態變化才透過隱藏 `role="status"` 區宣告。
- **動畫尊重 `prefers-reduced-motion`**：以 `[data-decorative]` 區分「裝飾」與「資訊」動畫，
  不使用 `!important`。
- **離線優先**：SW 對靜態資源用 cache-first、API 用 network-first、CDN 用 SWR；版本升級時
  以 `controllerchange` 安全 reload（首次安裝不誤觸）。
- **無障礙**：所有按鈕色階 ≥ WCAG 2 AA 對比，觸控目標 ≥ 44px (WCAG 2.5.5 AAA)，
  session 用色 + icon 雙線索，不依賴單一感官。

## CI

| Platform | Workflow                   | Badge                                                  |
| -------- | -------------------------- | ------------------------------------------------------ |
| GitHub   | `.github/workflows/ci.yml` | Lint / type-check / Vitest / Playwright / Pages deploy |
| GitLab   | `.gitlab-ci.yml`           | 同步 mirror，含 cobertura coverage                     |

兩平台共用同一份 npm scripts，一邊綠 = 另一邊綠。Concurrency rule 已修過 runner queue 死鎖。

## License

Internal.
