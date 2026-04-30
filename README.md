# Flow-OS

專注與成長的數位夥伴 — 一個輕量、可離線、可自託管的番茄鐘 PWA。

## Quick start

```bash
npm ci
npm run dev          # http://localhost:3000
npm run build        # 產出 dist/
npm run preview      # 預覽 dist/
```

## Scripts

| script       | 用途                            |
| ------------ | ------------------------------- |
| `dev`        | Vite dev server                 |
| `build`      | Production build (dist/)        |
| `preview`    | Static preview of dist/         |
| `start`      | Alias of preview, for CI server |
| `lint`       | ESLint on src/                  |
| `type-check` | tsc --noEmit                    |
| `test`       | Vitest (unit + jsdom)           |
| `test:e2e`   | Playwright (含 a11y)            |

## Architecture

```
src/
├── components/Timer.tsx      # 番茄鐘 UI（含 ARIA + 進度環）
├── store/timerStore.ts       # Zustand store; Date.now() 基準避開 background-tab drift
├── utils/
│   ├── eventBus.ts           # 型別化事件總線（含 handler 隔離）
│   ├── database.ts           # Dexie schema (sessions/tasks/achievements/settings)
│   ├── interactions.ts       # Confetti 慶祝動畫（lazy import）
│   └── pwa.ts                # Service Worker 註冊與更新提示
└── main.tsx, App.tsx, index.css
public/
├── manifest.json             # PWA manifest
└── sw.js                     # Service Worker（cache-first / network-first / SWR 三策略）
```

### 設計重點

- **計時器無漂移**：`setInterval` 不直接遞減；每 tick 從 `Date.now()` 重算剩餘秒數。背景分頁回前景後可即時校正。
- **ARIA 不噪音**：主數字 `aria-live="off"`，狀態變化才透過隱藏 `role="status"` 區宣告。
- **動畫與音效尊重 `prefers-reduced-motion`**：confetti 自動跳過。
- **離線優先**：靜態資源 cache-first；其他 network-first，回退快取。

## PWA 圖示

`manifest.json` 期望 `/icon-192x192.png` 與 `/icon-512x512.png`；目前 repo 暫未含圖檔，請自行於 `public/` 補上後 manifest 才會通過 Lighthouse PWA 檢查。

## Cloud sync (optional, scaffold)

Supabase 同步邏輯在 v4 已移除，等待後續以「OAuth + 後端 relay」方式重新實作。範本：見 `.env.example`。

## License

Internal.
