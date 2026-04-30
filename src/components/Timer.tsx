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
    // @container with named scope `timer` lets us style based on the wrapper's
    // own width, not the viewport — the same component works in a sidebar.
    // `[container-type:inline-size]` is set explicitly as a defence: if the
    // plugin's default ever changes or another rule overrides container-type,
    // this still pins the timer to size-based queries.
    <div className="@container/timer [container-type:inline-size] w-full max-w-5xl">
      <div
        className="
          grid w-full
          grid-cols-1 gap-y-fluid-3
          [grid-template-areas:'badge''clock''ring''controls']
          justify-items-center
          @lg/timer:grid-cols-[minmax(0,1fr)_auto]
          @lg/timer:grid-rows-[auto_auto_auto]
          @lg/timer:gap-x-fluid-6
          @lg/timer:[grid-template-areas:'badge_ring''clock_ring''controls_ring']
          @lg/timer:justify-items-start
          @lg/timer:items-center
          landscape-compact:grid-cols-[minmax(0,1fr)_auto]
          landscape-compact:grid-rows-[auto_auto_auto]
          landscape-compact:gap-x-fluid-4
          landscape-compact:gap-y-fluid-2
          landscape-compact:[grid-template-areas:'badge_ring''clock_ring''controls_ring']
          landscape-compact:justify-items-start
          landscape-compact:items-center
        "
      >
        {/* BADGE */}
        <div
          data-decorative-color
          className={`
            inline-flex items-center gap-2 rounded-full text-white font-semibold tracking-wide shadow-sm
            px-fluid-3 py-fluid-1 text-fluid-base
            transition-colors duration-300
            [grid-area:badge]
            ${SESSION_BG[sessionType]}
          `}
        >
          <span aria-hidden="true">{SESSION_ICON[sessionType]}</span>
          <span>{SESSION_LABEL[sessionType]}</span>
        </div>

        {/* CLOCK */}
        <div
          className="
            font-mono font-bold text-gray-800 dark:text-white tabular-nums
            text-fluid-display
            [grid-area:clock]
          "
          aria-label={`剩餘時間 ${display}`}
        >
          {display}
        </div>

        {/* SR-only status announcer */}
        <div className="sr-only" role="status" aria-live="polite">
          {statusMessage}
        </div>

        {/* RING — single DOM, just relocated by grid-area in @lg/timer */}
        <div
          className="
            relative shrink-0
            w-fluid-ring h-fluid-ring
            [grid-area:ring]
          "
        >
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
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
              className={`transition-[stroke-dashoffset] duration-300 ease-linear ${SESSION_TEXT[sessionType]}`}
            />
          </svg>
          <div
            data-decorative
            className="absolute inset-0 flex items-center justify-center text-fluid-2xl"
          >
            <span
              className="transition-transform duration-300"
              style={{ transform: `scale(${1 + progress * 0.5})` }}
              aria-hidden="true"
            >
              🌱
            </span>
          </div>
        </div>

        {/* CONTROLS — Fitts' law: primary CTA larger than secondary */}
        <div
          className="
            grid w-full max-w-md gap-fluid-2
            grid-cols-[minmax(0,2fr)_minmax(0,1fr)]
            [grid-area:controls]
          "
        >
          {!isRunning ? (
            <button
              onClick={handleStart}
              className="
                px-fluid-4 py-fluid-2 min-h-[2.75rem] active:scale-95 text-white font-semibold
                rounded-lg shadow-lg transition focus:outline-none focus:ring-4
                bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-400/60
                text-fluid-base
              "
              aria-label="開始計時"
            >
              開始
            </button>
          ) : (
            <button
              onClick={pauseTimer}
              className="
                px-fluid-4 py-fluid-2 min-h-[2.75rem] active:scale-95 text-white font-semibold
                rounded-lg shadow-lg transition focus:outline-none focus:ring-4
                bg-amber-700 hover:bg-amber-800 focus:ring-amber-400/60
                text-fluid-base
              "
              aria-label="暫停計時"
            >
              暫停
            </button>
          )}

          <button
            onClick={resetTimer}
            className="
              px-fluid-3 py-fluid-2 min-h-[2.75rem] active:scale-95 text-white font-semibold
              rounded-lg shadow-lg transition focus:outline-none focus:ring-4
              bg-slate-600 hover:bg-slate-700 focus:ring-slate-300/60
              text-fluid-base
            "
            aria-label="重設計時"
          >
            重設
          </button>
        </div>
      </div>
    </div>
  );
};

export default Timer;
