import React, { useEffect, useRef } from 'react';
import { useTimerStore } from '../store/timerStore';
import { addButtonInteraction } from '../utils/interactions';

const Timer: React.FC = () => {
  const {
    isRunning,
    currentTime,
    sessionType,
    focusDuration,
    shortBreakDuration,
    longBreakDuration,
    startTimer,
    pauseTimer,
    resetTimer
  } = useTimerStore();

  const startButtonRef = useRef<HTMLButtonElement>(null);
  const pauseButtonRef = useRef<HTMLButtonElement>(null);
  const resetButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    [startButtonRef, pauseButtonRef, resetButtonRef].forEach(ref => {
      if (ref.current) addButtonInteraction(ref.current);
    });
  }, []);

  const totalSeconds = sessionType === 'focus'
    ? focusDuration * 60
    : sessionType === 'shortBreak'
      ? shortBreakDuration * 60
      : longBreakDuration * 60;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getSessionLabel = (): string => {
    switch (sessionType) {
      case 'focus': return '專注時間';
      case 'shortBreak': return '短休息';
      case 'longBreak': return '長休息';
      default: return '專注時間';
    }
  };

  const getThemeColor = (): string => {
    switch (sessionType) {
      case 'focus': return 'bg-red-500';
      case 'shortBreak': return 'bg-green-500';
      case 'longBreak': return 'bg-blue-500';
      default: return 'bg-red-500';
    }
  };

  const getTextColor = (): string => {
    switch (sessionType) {
      case 'focus': return 'text-red-500';
      case 'shortBreak': return 'text-green-500';
      case 'longBreak': return 'text-blue-500';
      default: return 'text-red-500';
    }
  };

  const progress = totalSeconds > 0 ? (totalSeconds - currentTime) / totalSeconds : 0;
  const strokeDasharray = 2 * Math.PI * 45;
  const strokeDashoffset = strokeDasharray * (1 - progress);

  return (
    <div className="flex flex-col items-center space-y-8 p-8">
      {/* Session Type Indicator */}
      <div className={`px-6 py-2 rounded-full text-white font-semibold ${getThemeColor()}`}>
        {getSessionLabel()}
      </div>

      {/* Timer Display */}
      <div 
        className="text-8xl font-mono font-bold text-gray-800 dark:text-white"
        aria-live="polite"
        aria-label={`剩餘時間 ${formatTime(currentTime)}`}
      >
        {formatTime(currentTime)}
      </div>

      {/* Progress Ring */}
      <div className="relative w-64 h-64">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#e5e7eb"
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
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className={`transition-all duration-1000 ${getTextColor()}`}
          />
        </svg>
        
        {/* Plant Growth Visualization */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div 
            className="text-4xl transition-transform duration-300"
            style={{ 
              transform: `scale(${1 + progress * 0.5})` 
            }}
          >
            🌱
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex space-x-4">
        {!isRunning ? (
          <button
            ref={startButtonRef}
            onClick={startTimer}
            className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg shadow-lg transition-all duration-150 focus-ring focus:ring-green-300"
            aria-label="開始計時"
          >
            開始
          </button>
        ) : (
          <button
            ref={pauseButtonRef}
            onClick={pauseTimer}
            className="px-8 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg shadow-lg transition-all duration-150 focus-ring focus:ring-yellow-300"
            aria-label="暫停計時"
          >
            暫停
          </button>
        )}
        
        <button
          ref={resetButtonRef}
          onClick={resetTimer}
          className="px-8 py-3 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg shadow-lg transition-all duration-150 focus-ring focus:ring-gray-300"
          aria-label="重設計時"
        >
          重設
        </button>
      </div>
    </div>
  );
};

export default Timer;
