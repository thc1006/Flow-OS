import { useEffect } from 'react';
import Timer from './components/Timer';
import { eventBus } from './utils/eventBus';

const App: React.FC = () => {
  useEffect(() => {
    const handler = (data: { sessionType: 'focus' | 'break' }) => {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      const message =
        data.sessionType === 'focus'
          ? '專注時間結束！該休息了 🎉'
          : '休息結束！準備開始專注 💪';
      try {
        new Notification('Flow-OS', { body: message, tag: 'flow-os-timer' });
      } catch (error) {
        console.warn('Notification failed:', error);
      }
    };
    eventBus.on('TIMER_COMPLETE', handler);
    return () => eventBus.off('TIMER_COMPLETE', handler);
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
          px-4 pt-[max(env(safe-area-inset-top),1rem)]
          pb-3 sm:pb-4 lg:pb-6
        "
      >
        <h1
          className="
            font-bold text-gray-800 dark:text-white
            text-2xl sm:text-3xl lg:text-4xl
            leading-tight
          "
        >
          Flow-OS
        </h1>
        <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-300">
          專注與成長的數位夥伴
        </p>
      </header>

      <main
        className="
          flex-1 min-h-0
          flex items-center justify-center
          px-3 sm:px-6
          pb-[max(env(safe-area-inset-bottom),0.75rem)]
        "
      >
        <Timer />
      </main>
    </div>
  );
};

export default App;
