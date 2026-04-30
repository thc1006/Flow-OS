import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  focus: 'text-indigo-300 dark:text-indigo-400',
  shortBreak: 'text-emerald-300 dark:text-emerald-400',
  longBreak: 'text-sky-300 dark:text-sky-400',
};

const STROKE_LENGTH = 2 * Math.PI * 45;
const RESET_CONFIRM_MS = 4500;

const easedScale = (p: number): number => 1 + (1 - (1 - p) * (1 - p)) * 0.6;

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

type Notice = 'notification-denied' | 'reset-confirm' | null;

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

  // Two announcers:
  //   - statusMessage = SR-only run-state changes (focus/break, run/pause)
  //   - notice = visible feedback strip (notification denied, reset confirm)
  const [statusMessage, setStatusMessage] = useState('');
  useEffect(() => {
    setStatusMessage(
      isRunning
        ? `${SESSION_LABEL[sessionType]}已開始`
        : `${SESSION_LABEL[sessionType]}已暫停或就緒`,
    );
  }, [isRunning, sessionType]);

  // Single source of truth for the reset arm-and-confirm state. Notice is
  // *derived* from `resetArmed` so the visible state can never go out of
  // sync with the ref-style arming flag — the previous implementation kept
  // them in two timers and the visible "重設" label could appear while the
  // ref still considered itself armed, causing a destructive double-action.
  const [notice, setNotice] = useState<Notice>(null);
  const [resetArmed, setResetArmed] = useState(false);
  const noticeTimerRef = useRef<number | null>(null);
  const armedTimerRef = useRef<number | null>(null);
  const clearTimer = (ref: React.MutableRefObject<number | null>) => {
    if (ref.current !== null) {
      window.clearTimeout(ref.current);
      ref.current = null;
    }
  };
  useEffect(
    () => () => {
      clearTimer(noticeTimerRef);
      clearTimer(armedTimerRef);
    },
    [],
  );

  const showNotice = useCallback((kind: Exclude<Notice, null>, ttlMs = 4500) => {
    setNotice(kind);
    clearTimer(noticeTimerRef);
    noticeTimerRef.current = window.setTimeout(() => {
      setNotice((cur) => (cur === kind ? null : cur));
      noticeTimerRef.current = null;
    }, ttlMs);
  }, []);

  // Single primary action: identical DOM node, label/colour swap on isRunning.
  const handlePrimary = useCallback(async () => {
    if (isRunning) {
      pauseTimer();
      return;
    }
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        try {
          const result = await Notification.requestPermission();
          if (result !== 'granted') showNotice('notification-denied');
        } catch {
          showNotice('notification-denied');
        }
      } else if (Notification.permission === 'denied') {
        showNotice('notification-denied');
      }
    }
    startTimer();
  }, [isRunning, pauseTimer, startTimer, showNotice]);

  // Reset is destructive in mid-session. First click arms; second click
  // within the confirm window actually resets. Both timers (visual notice
  // and armed-state) advance together so they cannot disagree.
  const handleReset = useCallback(() => {
    if (resetArmed) {
      // confirm: cancel both timers, perform the reset
      clearTimer(armedTimerRef);
      clearTimer(noticeTimerRef);
      setResetArmed(false);
      setNotice(null);
      resetTimer();
      return;
    }
    const midSession = currentTime > 0 && currentTime < totalSeconds;
    if (!midSession) {
      // nothing to lose, reset immediately
      resetTimer();
      return;
    }
    // arm: schedule a single timer; both visible notice and armed flag
    // share the same lifetime
    setResetArmed(true);
    setNotice('reset-confirm');
    clearTimer(armedTimerRef);
    clearTimer(noticeTimerRef);
    armedTimerRef.current = window.setTimeout(() => {
      setResetArmed(false);
      setNotice((cur) => (cur === 'reset-confirm' ? null : cur));
      armedTimerRef.current = null;
    }, RESET_CONFIRM_MS);
  }, [resetArmed, currentTime, totalSeconds, resetTimer]);

  // If the running state changes (session completes, user pauses) clear any
  // pending arm so a stale "armed" flag can't fire after the user has moved on.
  useEffect(() => {
    if (isRunning && resetArmed) {
      clearTimer(armedTimerRef);
      setResetArmed(false);
      setNotice((cur) => (cur === 'reset-confirm' ? null : cur));
    }
  }, [isRunning, resetArmed]);

  return (
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
        {/* BADGE — stable DOM (no key remount); icon + label fade via CSS only.
            Reduced-motion users get the colour swap with no opacity tween,
            and the SR experience is unaffected because the node persists. */}
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

        {/* SR-only run-state announcer */}
        <div className="sr-only" role="status" aria-live="polite">
          {statusMessage}
        </div>

        {/* RING — single DOM, relocated by grid-area on @lg/timer */}
        <div
          data-testid="progress-ring"
          className="relative shrink-0 w-fluid-ring h-fluid-ring [grid-area:ring]"
        >
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              className="text-gray-200 dark:text-gray-700"
              strokeWidth="6"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
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
              style={{ transform: `scale(${easedScale(progress)})` }}
              aria-hidden="true"
            >
              🌱
            </span>
          </div>
        </div>

        {/* CONTROLS */}
        <div
          className="
            grid w-full max-w-md gap-fluid-2
            grid-cols-[minmax(0,2fr)_minmax(0,1fr)]
            [grid-area:controls]
          "
        >
          <button
            onClick={handlePrimary}
            aria-label={isRunning ? '暫停計時' : '開始計時'}
            aria-pressed={isRunning}
            className={`
              px-fluid-4 py-fluid-2 min-h-[2.75rem] active:scale-95 text-white font-semibold
              rounded-lg shadow-lg transition focus:outline-none focus:ring-4
              text-fluid-base
              ${
                isRunning
                  ? 'bg-amber-700 hover:bg-amber-800 active:bg-amber-900 focus:ring-amber-400/60'
                  : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 focus:ring-indigo-400/60'
              }
            `}
          >
            {isRunning ? '暫停' : '開始'}
          </button>

          <button
            onClick={handleReset}
            aria-label={resetArmed ? '再次按下確認重設' : '重設計時'}
            className={`
              px-fluid-3 py-fluid-2 min-h-[2.75rem] active:scale-95 text-white font-semibold
              rounded-lg shadow-lg transition focus:outline-none focus:ring-4
              text-fluid-base
              ${
                resetArmed
                  ? 'bg-red-700 hover:bg-red-800 active:bg-red-900 focus:ring-red-400/60'
                  : 'bg-slate-600 hover:bg-slate-700 active:bg-slate-800 focus:ring-slate-300/60'
              }
            `}
          >
            {resetArmed ? '確認' : '重設'}
          </button>
        </div>
      </div>

      <div
        role="status"
        aria-live="polite"
        data-testid="timer-notice"
        className="
          mt-fluid-3 min-h-[1.5rem] text-center text-fluid-sm
          @lg/timer:text-left
          text-amber-800 dark:text-amber-300
        "
      >
        {notice === 'notification-denied' &&
          '通知未啟用，session 結束時不會自動提示。需開啟請於瀏覽器網址列旁的權限設定調整。'}
        {notice === 'reset-confirm' && '再按一次「確認」以放棄目前進度。'}
      </div>
    </div>
  );
};

export default Timer;
