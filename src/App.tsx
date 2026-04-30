import { useCallback, useEffect, useState } from 'react';
import Timer from './components/Timer';
import { eventBus } from './utils/eventBus';

// BeforeInstallPromptEvent is non-standard; type it minimally for what we need.
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const App: React.FC = () => {
  useEffect(() => {
    const handler = (data: { sessionType: 'focus' | 'break' }) => {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      const message =
        data.sessionType === 'focus' ? '專注時間結束！該休息了 🎉' : '休息結束！準備開始專注 💪';
      try {
        new Notification('Flow-OS', { body: message, tag: 'flow-os-timer' });
      } catch (error) {
        console.warn('Notification failed:', error);
      }
    };
    eventBus.on('TIMER_COMPLETE', handler);
    return () => eventBus.off('TIMER_COMPLETE', handler);
  }, []);

  // PWA install prompt — capture the event, expose a button, swallow the
  // browser's auto-banner. Hide once installed or dismissed.
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => setInstallPrompt(null);
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
      if (outcome) setInstallPrompt(null);
    } catch (error) {
      console.warn('Install prompt failed:', error);
    }
  }, [installPrompt]);

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
        {/* h1 always present in DOM for SR; visually hidden on landscape phones */}
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

      {installPrompt && (
        <button
          onClick={handleInstall}
          aria-label="將 Flow-OS 安裝到裝置"
          className="
            fixed right-4 top-[max(env(safe-area-inset-top),1rem)] z-40
            inline-flex items-center gap-2 px-4 py-2 min-h-[2.75rem]
            rounded-lg shadow-lg text-white font-semibold text-fluid-sm
            bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
            focus:outline-none focus:ring-4 focus:ring-indigo-400/60
            transition active:scale-95
          "
        >
          <span aria-hidden="true">📱</span>
          <span>安裝到裝置</span>
        </button>
      )}
    </div>
  );
};

export default App;
