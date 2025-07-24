import { create } from 'zustand';
import { eventBus } from '../utils/eventBus';
import { DataService } from '../utils/database';

interface TimerState {
  isRunning: boolean;
  currentTime: number;
  sessionType: 'focus' | 'shortBreak' | 'longBreak';
  focusDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  sessionsCompleted: number;
  
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  completeSession: () => void;
  setDuration: (type: 'focus' | 'shortBreak' | 'longBreak', minutes: number) => void;
}

export const useTimerStore = create<TimerState>((set, get) => {
  let timerInterval: ReturnType<typeof setInterval> | null = null;

  const clearExistingInterval = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  };

  return {
    isRunning: false,
    currentTime: 25 * 60,
    sessionType: 'focus',
    focusDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    sessionsCompleted: 0,

    startTimer: () => {
      clearExistingInterval();
      const { currentTime } = get();
      set({ isRunning: true });
      eventBus.emit('TIMER_START', { duration: currentTime });
      
      timerInterval = setInterval(() => {
        const { currentTime: t } = get();
        if (t <= 0) {
          clearExistingInterval();
          get().completeSession();
          return;
        }
        set({ currentTime: t - 1 });
      }, 1000);
    },

    pauseTimer: () => {
      clearExistingInterval();
      set({ isRunning: false });
      eventBus.emit('TIMER_PAUSE', {});
    },

    resetTimer: () => {
      clearExistingInterval();
      const { sessionType, focusDuration, shortBreakDuration, longBreakDuration } = get();
      const durations = { 
        focus: focusDuration, 
        shortBreak: shortBreakDuration, 
        longBreak: longBreakDuration 
      };
      set({ isRunning: false, currentTime: durations[sessionType] * 60 });
    },

    completeSession: async () => {
      clearExistingInterval();
      const { sessionType, focusDuration, shortBreakDuration, longBreakDuration, sessionsCompleted } = get();
      
      // 寫入資料庫
      try {
        await DataService.addSession({
          startTime: new Date(Date.now() - ((sessionType === 'focus' ? focusDuration : sessionType === 'shortBreak' ? shortBreakDuration : longBreakDuration) * 60) * 1000),
          endTime: new Date(),
          duration: sessionType === 'focus' ? focusDuration * 60 : sessionType === 'shortBreak' ? shortBreakDuration * 60 : longBreakDuration * 60,
          type: sessionType === 'focus' ? 'focus' : 'break',
          completed: true
        });
      } catch (error) {
        console.error('Failed to save session:', error);
      }
      
      set({ isRunning: false });

      if (sessionType === 'focus') {
        set({ sessionsCompleted: sessionsCompleted + 1 });
        eventBus.emit('TIMER_COMPLETE', { sessionType: 'focus' });
        const nextType = (sessionsCompleted + 1) % 4 === 0 ? 'longBreak' : 'shortBreak';
        const nextDuration = nextType === 'longBreak' ? longBreakDuration : shortBreakDuration;
        set({ sessionType: nextType, currentTime: nextDuration * 60 });
      } else {
        eventBus.emit('TIMER_COMPLETE', { sessionType: 'break' });
        set({ sessionType: 'focus', currentTime: focusDuration * 60 });
      }
    },

    setDuration: (type, minutes) => {
      const updates: Partial<TimerState> = {};
      if (type === 'focus') updates.focusDuration = minutes;
      if (type === 'shortBreak') updates.shortBreakDuration = minutes;
      if (type === 'longBreak') updates.longBreakDuration = minutes;
      set(updates);
    }
  };
});
