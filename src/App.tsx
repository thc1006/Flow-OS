import { useCallback, useEffect, useState } from 'react';
import Timer from './components/Timer';
import { eventBus } from './utils/eventBus';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const INSTALL_DISMISS_KEY = 'flow-os.install-dismissed-until';
const INSTALL_DISMISS_DAYS = 30;

const App: React.FC = () => {
  useEffect(() => {
    const handler = (data: { sessionType: 'focus' | 'break' }) => {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      const message =
        data.sessionType === 'focus' ? '專注時間結束！該休息了 🎉' : '休息結束!準備開始專注 💪';
      try {
        new Notification('Flow-OS', { body: message, tag: 'flow-os-timer' });
      } catch (error) {
        console.warn('Notification failed:', error);
      }
    };
    eventBus.on('TIMER_COMPLETE', handler);
    return () => eventBus.off('TIMER_COMPLETE', handler);
  }, []);

  // PWA install prompt — captured for our own button. We respect a
  // 30-day "I don't want this nag" sentinel kept in localStorage so a
  // user who dismissed once isn't pestered every visit.
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  useEffect(() => {
    const dismissedUntil = Number(localStorage.getItem(INSTALL_DISMISS_KEY) ?? 0);
    const isSnoozed = dismissedUntil > Date.now();

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      if (isSnoozed) return;
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstallPrompt(null);
      localStorage.removeItem(INSTALL_DISMISS_KEY);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!installPrompt) return;
    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'dismissed') {
        // user said no via the native dialog: snooze
        const until = Date.now() + INSTALL_DISMISS_DAYS * 24 * 60 * 60 * 1000;
        localStorage.setItem(INSTALL_DISMISS_KEY, String(until));
      }
      setInstallPrompt(null);
    } catch (error) {
      console.warn('Install prompt failed:', error);
    }
  }, [installPrompt]);

  const handleDismissInstall = useCallback(() => {
    const until = Date.now() + INSTALL_DISMISS_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(INSTALL_DISMISS_KEY, String(until));
    setInstallPrompt(null);
  }, []);

  return (
    <div
      className="
        min-h-[100dvh] flex flex-col
        bg-gradient-to-br from-blue-50 to-indigo-100
        dark:from-gray-900 dark:to-gray-800
      "
    >
      <header
        className="
          shrink-0 text-center
          px-fluid-4 pt-[max(env(safe-area-inset-top),0.75rem)]
          pb-fluid-2
          landscape-compact:py-1
        "
      >
        <h1
          className="
            font-bold text-gray-800 dark:text-white text-fluid-xl leading-tight
            landscape-compact:sr-only
          "
        >
          Flow-OS
        </h1>
        <p
          className="
            mt-1 text-fluid-sm text-gray-600 dark:text-gray-300
            landscape-compact:hidden
          "
        >
          專注與成長的數位夥伴
        </p>
      </header>

      <main
        className="
          flex-1 min-h-0
          flex items-center justify-center
          px-fluid-3
          py-fluid-2
          pb-[max(env(safe-area-inset-bottom),0.75rem)]
        "
      >
        <Timer />
      </main>

      {/* Install pill anchored to the *header*, not the viewport, so it never
          overlaps the progress ring on the lg two-column layout. The pill
          itself contains a primary action and a small dismiss "×". */}
      {installPrompt && (
        <div
          className="
            fixed left-1/2 -translate-x-1/2
            top-[max(env(safe-area-inset-top),0.5rem)]
            z-40
            inline-flex items-center gap-1
            rounded-full shadow-lg
            bg-indigo-600/95 backdrop-blur
          "
        >
          <button
            onClick={handleInstall}
            aria-label="將 Flow-OS 安裝到裝置"
            className="
              inline-flex items-center gap-2 px-4 py-2 min-h-[2.75rem]
              text-white font-semibold text-fluid-sm
              hover:bg-indigo-700 active:bg-indigo-800 active:scale-95
              focus:outline-none focus:ring-4 focus:ring-indigo-400/60
              rounded-l-full transition
            "
          >
            <span aria-hidden="true">📱</span>
            <span>安裝到裝置</span>
          </button>
          <button
            onClick={handleDismissInstall}
            aria-label="暫時不要安裝（30 天內不再顯示）"
            className="
              px-3 py-2 min-h-[2.75rem]
              text-white/80 hover:text-white text-lg leading-none
              hover:bg-indigo-700 active:bg-indigo-800
              focus:outline-none focus:ring-4 focus:ring-indigo-400/60
              rounded-r-full transition
            "
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
