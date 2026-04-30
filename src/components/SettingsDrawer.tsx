import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useTimerStore } from '../store/timerStore';

interface Props {
  open: boolean;
  onClose: () => void;
}

const MIN_MIN = 1;
const MAX_MIN = 120;

const clampMinutes = (raw: string, fallback: number): number => {
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) return fallback;
  if (n < MIN_MIN) return MIN_MIN;
  if (n > MAX_MIN) return MAX_MIN;
  return n;
};

const SettingsDrawer: React.FC<Props> = ({ open, onClose }) => {
  const focusDuration = useTimerStore((s) => s.focusDuration);
  const shortBreakDuration = useTimerStore((s) => s.shortBreakDuration);
  const longBreakDuration = useTimerStore((s) => s.longBreakDuration);
  const setDuration = useTimerStore((s) => s.setDuration);

  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Local edit-state — committed onBlur. Lets the user type "999" without
  // the input snapping to 120 mid-keystroke.
  const [draft, setDraft] = useState({
    focus: String(focusDuration),
    shortBreak: String(shortBreakDuration),
    longBreak: String(longBreakDuration),
  });

  useEffect(() => {
    setDraft({
      focus: String(focusDuration),
      shortBreak: String(shortBreakDuration),
      longBreak: String(longBreakDuration),
    });
  }, [focusDuration, shortBreakDuration, longBreakDuration, open]);

  // Focus management: trap focus inside the dialog while open; restore on close.
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement;
    const dialog = dialogRef.current;
    const firstField = dialog?.querySelector<HTMLElement>(
      'input, button, [tabindex]:not([tabindex="-1"])',
    );
    firstField?.focus();
    return () => {
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  // Escape closes; Tab cycles within the dialog.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute('aria-hidden'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const commit = useCallback(
    (kind: 'focus' | 'shortBreak' | 'longBreak') => {
      const fallback =
        kind === 'focus'
          ? focusDuration
          : kind === 'shortBreak'
            ? shortBreakDuration
            : longBreakDuration;
      const next = clampMinutes(draft[kind], fallback);
      setDraft((d) => ({ ...d, [kind]: String(next) }));
      setDuration(kind, next);
    },
    [draft, focusDuration, shortBreakDuration, longBreakDuration, setDuration],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="關閉設定"
        data-testid="settings-backdrop"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="
          absolute right-0 top-0 h-[100dvh] w-full max-w-md
          bg-white dark:bg-gray-900 shadow-2xl
          flex flex-col
          motion-safe:animate-[fadeIn_200ms_ease-out]
          pt-[max(env(safe-area-inset-top),1rem)]
          pb-[max(env(safe-area-inset-bottom),1rem)]
          px-fluid-4
        "
      >
        <div className="flex items-center justify-between mb-fluid-3">
          <h2 id={titleId} className="text-fluid-xl font-bold text-gray-800 dark:text-white">
            設定
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉設定"
            className="
              w-11 h-11 rounded-full text-2xl leading-none
              text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white
              hover:bg-gray-100 dark:hover:bg-gray-800
              focus:outline-none focus:ring-4 focus:ring-indigo-400/60
              transition active:scale-95
            "
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <fieldset className="flex flex-col gap-fluid-4">
          <legend className="sr-only">時長設定</legend>

          <NumberField
            label="專注時間（分鐘）"
            hint={`${MIN_MIN}–${MAX_MIN} 分鐘`}
            value={draft.focus}
            onChange={(v) => setDraft((d) => ({ ...d, focus: v }))}
            onBlur={() => commit('focus')}
          />
          <NumberField
            label="短休息（分鐘）"
            hint={`${MIN_MIN}–${MAX_MIN} 分鐘`}
            value={draft.shortBreak}
            onChange={(v) => setDraft((d) => ({ ...d, shortBreak: v }))}
            onBlur={() => commit('shortBreak')}
          />
          <NumberField
            label="長休息（分鐘）"
            hint={`${MIN_MIN}–${MAX_MIN} 分鐘`}
            value={draft.longBreak}
            onChange={(v) => setDraft((d) => ({ ...d, longBreak: v }))}
            onBlur={() => commit('longBreak')}
          />
        </fieldset>

        <p className="mt-fluid-4 text-fluid-sm text-gray-500 dark:text-gray-400">
          設定會自動儲存到瀏覽器本機資料庫（IndexedDB）。
        </p>
      </div>
    </div>
  );
};

interface FieldProps {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}

const NumberField: React.FC<FieldProps> = ({ label, hint, value, onChange, onBlur }) => {
  const id = useId();
  const hintId = useId();
  return (
    <label htmlFor={id} className="flex flex-col gap-1">
      <span className="text-fluid-base font-semibold text-gray-700 dark:text-gray-200">
        {label}
      </span>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={MIN_MIN}
        max={MAX_MIN}
        step={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-describedby={hint ? hintId : undefined}
        className="
          px-3 py-2 min-h-[2.75rem] rounded-lg
          bg-white dark:bg-gray-800
          border border-gray-300 dark:border-gray-600
          text-gray-900 dark:text-white text-fluid-base
          focus:outline-none focus:ring-4 focus:ring-indigo-400/60 focus:border-indigo-500
          tabular-nums
        "
      />
      {hint && (
        <span id={hintId} className="text-fluid-sm text-gray-500 dark:text-gray-400">
          {hint}
        </span>
      )}
    </label>
  );
};

export default SettingsDrawer;
