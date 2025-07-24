import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Timer from '../src/components/Timer';

describe('Timer Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render timer with initial state', () => {
    render(<Timer />);
    
    expect(screen.getByText('25:00')).toBeInTheDocument();
    expect(screen.getByText('專注時間')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '開始計時' })).toBeInTheDocument();
  });

  it('should start timer when start button is clicked', async () => {
    render(<Timer />);
    
    const startButton = screen.getByRole('button', { name: '開始計時' });
    fireEvent.click(startButton);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '暫停計時' })).toBeInTheDocument();
    });
  });

  it('should be accessible', async () => {
    render(<Timer />);
    
    // 檢查 ARIA 標籤
    expect(screen.getByLabelText(/剩餘時間/)).toBeInTheDocument();
    
    // 檢查按鈕焦點
    const startButton = screen.getByRole('button', { name: '開始計時' });
    startButton.focus();
    expect(startButton).toHaveFocus();
  });
});
