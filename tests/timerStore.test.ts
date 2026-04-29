import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useTimerStore } from '../src/store/timerStore';

const resetStore = () => {
  useTimerStore.setState({
    isRunning: false,
    sessionType: 'focus',
    currentTime: 25 * 60,
    sessionsCompleted: 0,
    focusDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
  });
};

// Cycle tests use real timers because completeSession awaits a Dexie write
// that internally relies on real setTimeout-based transaction scheduling.
describe('timerStore — session cycle', () => {
  beforeEach(() => {
    resetStore();
  });

  afterEach(() => {
    useTimerStore.getState().resetTimer();
  });

  it('rotates focus → shortBreak; long break only after the 4th focus', async () => {
    const get = () => useTimerStore.getState();

    // focus #1 → shortBreak
    expect(get().sessionType).toBe('focus');
    await get().completeSession();
    expect(get().sessionType).toBe('shortBreak');
    expect(get().sessionsCompleted).toBe(1);

    // shortBreak → focus
    await get().completeSession();
    expect(get().sessionType).toBe('focus');
    expect(get().sessionsCompleted).toBe(1);

    // focus #2 → shortBreak
    await get().completeSession();
    expect(get().sessionType).toBe('shortBreak');
    expect(get().sessionsCompleted).toBe(2);

    await get().completeSession();
    expect(get().sessionType).toBe('focus');

    // focus #3 → shortBreak
    await get().completeSession();
    expect(get().sessionType).toBe('shortBreak');
    expect(get().sessionsCompleted).toBe(3);

    await get().completeSession();
    expect(get().sessionType).toBe('focus');

    // focus #4 → longBreak
    await get().completeSession();
    expect(get().sessionType).toBe('longBreak');
    expect(get().sessionsCompleted).toBe(4);

    // longBreak → focus, counter unchanged
    await get().completeSession();
    expect(get().sessionType).toBe('focus');
    expect(get().sessionsCompleted).toBe(4);
  });
});

// Duration tests need fake timers so we can advance through the 250ms ticker
// without burning real wall-clock seconds. These tests never call
// completeSession, so Dexie is not involved.
describe('timerStore — setDuration / pause preservation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetStore();
  });

  afterEach(() => {
    useTimerStore.getState().resetTimer();
    vi.useRealTimers();
  });

  it('resets currentTime to the new session total when truly idle', () => {
    expect(useTimerStore.getState().currentTime).toBe(25 * 60);
    useTimerStore.getState().setDuration('focus', 30);
    expect(useTimerStore.getState().focusDuration).toBe(30);
    expect(useTimerStore.getState().currentTime).toBe(30 * 60);
  });

  it('preserves remaining time when increasing duration during a paused focus', () => {
    const store = useTimerStore.getState();
    store.startTimer();
    vi.advanceTimersByTime(10 * 60 * 1000);
    expect(useTimerStore.getState().currentTime).toBe(15 * 60);

    useTimerStore.getState().pauseTimer();
    expect(useTimerStore.getState().isRunning).toBe(false);
    expect(useTimerStore.getState().currentTime).toBe(15 * 60);

    useTimerStore.getState().setDuration('focus', 30);
    expect(useTimerStore.getState().focusDuration).toBe(30);
    expect(useTimerStore.getState().currentTime).toBe(15 * 60);
  });

  it('clamps remaining time when shrinking duration below current', () => {
    const store = useTimerStore.getState();
    store.startTimer();
    vi.advanceTimersByTime(10 * 60 * 1000);
    store.pauseTimer();
    expect(useTimerStore.getState().currentTime).toBe(15 * 60);

    useTimerStore.getState().setDuration('focus', 10);
    expect(useTimerStore.getState().currentTime).toBe(10 * 60);
  });

  it('does not touch currentTime while running', () => {
    const store = useTimerStore.getState();
    store.startTimer();
    vi.advanceTimersByTime(5 * 60 * 1000);
    const beforeChange = useTimerStore.getState().currentTime;
    expect(beforeChange).toBe(20 * 60);

    useTimerStore.getState().setDuration('focus', 30);
    expect(useTimerStore.getState().focusDuration).toBe(30);
    expect(useTimerStore.getState().currentTime).toBe(beforeChange);
  });

  it('resetTimer brings the display back to the current session total', () => {
    const store = useTimerStore.getState();
    store.startTimer();
    vi.advanceTimersByTime(7 * 60 * 1000);
    expect(useTimerStore.getState().currentTime).toBe(18 * 60);

    store.resetTimer();
    expect(useTimerStore.getState().isRunning).toBe(false);
    expect(useTimerStore.getState().currentTime).toBe(25 * 60);
  });
});
