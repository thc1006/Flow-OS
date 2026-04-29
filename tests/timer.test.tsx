import { act, render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Timer from '../src/components/Timer';
import { useTimerStore } from '../src/store/timerStore';

describe('Timer Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useTimerStore.setState({
      isRunning: false,
      sessionType: 'focus',
      currentTime: 25 * 60,
      sessionsCompleted: 0,
    });
  });

  afterEach(() => {
    act(() => {
      useTimerStore.getState().resetTimer();
    });
    vi.useRealTimers();
  });

  it('renders with initial 25:00 focus state', () => {
    render(<Timer />);
    expect(screen.getByLabelText('剩餘時間 25:00')).toBeInTheDocument();
    expect(screen.getByText('專注時間')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '開始計時' })).toBeInTheDocument();
  });

  it('toggles to pause button when start is clicked', () => {
    render(<Timer />);
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: '開始計時' }));
    });
    expect(screen.getByRole('button', { name: '暫停計時' })).toBeInTheDocument();
  });

  it('exposes accessible labels and a polite status region', () => {
    render(<Timer />);
    expect(screen.getByLabelText(/剩餘時間/)).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
    const startButton = screen.getByRole('button', { name: '開始計時' });
    startButton.focus();
    expect(startButton).toHaveFocus();
  });
});
