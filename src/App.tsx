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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">Flow-OS</h1>
          <p className="text-gray-600 dark:text-gray-300">專注與成長的數位夥伴</p>
        </header>
        <main>
          <Timer />
        </main>
      </div>
    </div>
  );
};

export default App;
