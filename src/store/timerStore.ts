import { create } from 'zustand';
import { eventBus } from '../utils/eventBus';

export type SessionType = 'focus' | 'shortBreak' | 'longBreak';

interface TimerState {
  isRunning: boolean;
  sessionType: SessionType;
  currentTime: number;
  focusDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  sessionsCompleted: number;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  completeSession: () => Promise<void>;
  setDuration: (type: SessionType, minutes: number) => void;
}

const TICK_MS = 250;

let tickHandle: ReturnType<typeof setInterval> | null = null;
let targetEndMs: number | null = null;
let realStartMs: number | null = null;

const stopTicker = () => {
  if (tickHandle !== null) {
    clearInterval(tickHandle);
    tickHandle = null;
  }
};

const sessionDurationSec = (s: TimerState): number => {
  const minutes =
    s.sessionType === 'focus'
      ? s.focusDuration
      : s.sessionType === 'shortBreak'
        ? s.shortBreakDuration
        : s.longBreakDuration;
  return minutes * 60;
};

export const useTimerStore = create<TimerState>((set, get) => ({
  isRunning: false,
  sessionType: 'focus',
  currentTime: 25 * 60,
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsCompleted: 0,

  startTimer: () => {
    stopTicker();
    const { currentTime } = get();
    const now = Date.now();
    targetEndMs = now + currentTime * 1000;
    if (realStartMs === null) realStartMs = now;
    set({ isRunning: true });
    eventBus.emit('TIMER_START', { duration: currentTime });

    tickHandle = setInterval(() => {
      if (targetEndMs === null) return;
      const remainingSec = Math.max(0, Math.ceil((targetEndMs - Date.now()) / 1000));
      if (remainingSec <= 0) {
        stopTicker();
        set({ currentTime: 0 });
        void get().completeSession();
        return;
      }
      if (remainingSec !== get().currentTime) {
        set({ currentTime: remainingSec });
      }
    }, TICK_MS);
  },

  pauseTimer: () => {
    stopTicker();
    targetEndMs = null;
    set({ isRunning: false });
    eventBus.emit('TIMER_PAUSE', {});
  },

  resetTimer: () => {
    stopTicker();
    targetEndMs = null;
    realStartMs = null;
    const total = sessionDurationSec(get());
    set({ isRunning: false, currentTime: total });
  },

  completeSession: async () => {
    stopTicker();
    targetEndMs = null;
    const state = get();
    const totalSec = sessionDurationSec(state);
    const startTime = realStartMs ? new Date(realStartMs) : new Date(Date.now() - totalSec * 1000);
    const endTime = new Date();

    try {
      const { DataService } = await import('../utils/database');
      await DataService.addSession({
        startTime,
        endTime,
        duration: totalSec,
        type: state.sessionType === 'focus' ? 'focus' : 'break',
        completed: true,
      });
    } catch (error) {
      console.error('Failed to save session:', error);
    }

    realStartMs = null;
    set({ isRunning: false });

    if (state.sessionType === 'focus') {
      const completed = state.sessionsCompleted + 1;
      const nextType: SessionType = completed % 4 === 0 ? 'longBreak' : 'shortBreak';
      const nextSec =
        nextType === 'longBreak' ? state.longBreakDuration * 60 : state.shortBreakDuration * 60;
      set({ sessionsCompleted: completed, sessionType: nextType, currentTime: nextSec });
      eventBus.emit('TIMER_COMPLETE', { sessionType: 'focus' });
    } else {
      set({ sessionType: 'focus', currentTime: state.focusDuration * 60 });
      eventBus.emit('TIMER_COMPLETE', { sessionType: 'break' });
    }
  },

  setDuration: (type, minutes) => {
    const newTotalSec = minutes * 60;
    const updates: Partial<TimerState> = {};
    if (type === 'focus') updates.focusDuration = minutes;
    if (type === 'shortBreak') updates.shortBreakDuration = minutes;
    if (type === 'longBreak') updates.longBreakDuration = minutes;
    set(updates);

    const s = get();
    if (s.isRunning || s.sessionType !== type) return;

    if (realStartMs === null) {
      // truly idle (fresh or just reset) — sync display to new total
      set({ currentTime: newTotalSec });
    } else {
      // paused mid-session — keep elapsed progress; clamp if shrunk
      set({ currentTime: Math.min(s.currentTime, newTotalSec) });
    }
  },
}));
