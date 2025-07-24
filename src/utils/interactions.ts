import confetti from 'canvas-confetti';
import { eventBus } from './eventBus';

class SoundManager {
  private context: AudioContext | null = null;
  private sounds: Map<string, AudioBuffer> = new Map();
  private enabled: boolean = true;
  private volume: number = 0.5;

  constructor() {
    this.initAudioContext();
  }

  private async initAudioContext() {
    try {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
      await this.loadSounds();
    } catch (error) {
      console.warn('Audio context initialization failed:', error);
    }
  }

  private async loadSounds() {
    const soundFiles = {
      complete: '/sounds/complete.mp3',
      tick: '/sounds/tick.mp3',
      notification: '/sounds/notification.mp3'
    };

    for (const [name, url] of Object.entries(soundFiles)) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          if (this.context) {
            const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
            this.sounds.set(name, audioBuffer);
          }
        }
      } catch (error) {
        console.warn(`Failed to load sound: ${name}`, error);
      }
    }
  }

  play(soundName: string) {
    if (!this.enabled || !this.context) return;
    
    const buffer = this.sounds.get(soundName);
    if (!buffer) return;

    try {
      const source = this.context.createBufferSource();
      const gainNode = this.context.createGain();
      
      source.buffer = buffer;
      gainNode.gain.value = this.volume;
      
      source.connect(gainNode);
      gainNode.connect(this.context.destination);
      source.start();
    } catch (error) {
      console.warn('Failed to play sound:', error);
    }
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  toggle() {
    this.enabled = !this.enabled;
  }
}

export const soundManager = new SoundManager();

export const playSuccessAnimation = () => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  if (!prefersReducedMotion) {
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10B981', '#34D399', '#6EE7B7']
    });
  }
  
  soundManager.play('complete');
};

export const addButtonInteraction = (element: HTMLElement) => {
  element.classList.add('button-interactive');
  
  element.addEventListener('mousedown', () => {
    element.style.transform = 'scale(0.95) translateY(2px)';
  });
  
  element.addEventListener('mouseup', () => {
    element.style.transform = 'scale(1) translateY(0)';
  });
  
  element.addEventListener('mouseleave', () => {
    element.style.transform = 'scale(1) translateY(0)';
  });
};

eventBus.on('TIMER_COMPLETE', (data) => {
  if (data.sessionType === 'focus') {
    playSuccessAnimation();
    eventBus.emit('PLANT_GROWTH', { level: 1 });
  }
});
