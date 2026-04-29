import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTimerStore, type SessionType } from '../store/timerStore';

const SESSION_LABEL: Record<SessionType, string> = {
  focus: '專注時間',
  shortBreak: '短休息',
  longBreak: '長休息',
};

const SESSION_ICON: Record<SessionType, string> = {
  focus: '🎯',
  shortBreak: '☕',
  longBreak: '🌙',
};

// All AA-compliant against white text (≥ 4.65:1)
// focus      indigo-600  5.20:1
// shortBreak emerald-700 5.18:1
// longBreak  sky-700     5.69:1
const SESSION_BG: Record<SessionType, string> = {
  focus: 'bg-indigo-600',
  shortBreak: 'bg-emerald-700',
  longBreak: 'bg-sky-700',
};

const SESSION_TEXT: Record<SessionType, string> = {
  focus: 'text-indigo-600',
  shortBreak: 'text-emerald-700',
  longBreak: 'text-sky-700',
};

const STROKE_LENGTH = 2 * Math.PI * 45;

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const Timer: React.FC = () => {
  const isRunning = useTimerStore((s) => s.isRunning);
  const currentTime = useTimerStore((s) => s.currentTime);
  const sessionType = useTimerStore((s) => s.sessionType);
  const focusDuration = useTimerStore((s) => s.focusDuration);
  const shortBreakDuration = useTimerStore((s) => s.shortBreakDuration);
  const longBreakDuration = useTimerStore((s) => s.longBreakDuration);
  const startTimer = useTimerStore((s) => s.startTimer);
  const pauseTimer = useTimerStore((s) => s.pauseTimer);
  const resetTimer = useTimerStore((s) => s.resetTimer);

  const totalSeconds = useMemo(() => {
    const minutes =
      sessionType === 'focus'
        ? focusDuration
        : sessionType === 'shortBreak'
          ? shortBreakDuration
          : longBreakDuration;
    return minutes * 60;
  }, [sessionType, focusDuration, shortBreakDuration, longBreakDuration]);

  const progress = totalSeconds > 0 ? (totalSeconds - currentTime) / totalSeconds : 0;
  const strokeDashoffset = STROKE_LENGTH * (1 - progress);

  const display = formatTime(currentTime);

  // Status announcer: fires only on session/run transitions, not every second
  const [statusMessage, setStatusMessage] = useState('');
  useEffect(() => {
    setStatusMessage(
      isRunning
        ? `${SESSION_LABEL[sessionType]}已開始`
        : `${SESSION_LABEL[sessionType]}已暫停或就緒`,
    );
  }, [isRunning, sessionType]);

  const handleStart = useCallback(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission();
    }
    startTimer();
  }, [startTimer]);

  return (
    <div className="flex flex-col items-center space-y-8 p-8">
      <div
        className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm md:text-base
                    text-white font-semibold tracking-wide shadow-sm
                    transition-colors duration-300 motion-reduce:transition-none
                    ${SESSION_BG[sessionType]}`}
      >
        <span aria-hidden="true">{SESSION_ICON[sessionType]}</span>
        <span>{SESSION_LABEL[sessionType]}</span>
      </div>

      <div
        className="text-8xl font-mono font-bold text-gray-800 dark:text-white tabular-nums"
        aria-label={`剩餘時間 ${display}`}
      >
        {display}
      </div>

      <div className="sr-only" role="status" aria-live="polite">
        {statusMessage}
      </div>

      <div className="relative w-64 h-64">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            className="text-gray-200 dark:text-gray-700"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={STROKE_LENGTH}
            strokeDashoffset={strokeDashoffset}
            className={`transition-[stroke-dashoffset] duration-300 ease-linear motion-reduce:transition-none ${SESSION_TEXT[sessionType]}`}
          />
        </svg>

        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="text-4xl transition-transform duration-300 motion-reduce:transition-none"
            style={{ transform: `scale(${1 + progress * 0.5})` }}
            aria-hidden="true"
          >
            🌱
          </div>
        </div>
      </div>

      <div className="flex space-x-4">
        {!isRunning ? (
          <button
            onClick={handleStart}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95
                       text-white font-semibold rounded-lg shadow-lg transition
                       focus:outline-none focus:ring-4 focus:ring-indigo-400/60"
            aria-label="開始計時"
          >
            開始
          </button>
        ) : (
          <button
            onClick={pauseTimer}
            className="px-8 py-3 bg-amber-700 hover:bg-amber-800 active:scale-95
                       text-white font-semibold rounded-lg shadow-lg transition
                       focus:outline-none focus:ring-4 focus:ring-amber-400/60"
            aria-label="暫停計時"
          >
            暫停
          </button>
        )}

        <button
          onClick={resetTimer}
          className="px-8 py-3 bg-slate-600 hover:bg-slate-700 active:scale-95
                     text-white font-semibold rounded-lg shadow-lg transition
                     focus:outline-none focus:ring-4 focus:ring-slate-300/60"
          aria-label="重設計時"
        >
          重設
        </button>
      </div>
    </div>
  );
};

export default Timer;
