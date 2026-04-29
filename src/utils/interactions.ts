export const playSuccessAnimation = async (): Promise<void> => {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  try {
    const { default: confetti } = await import('canvas-confetti');
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10B981', '#34D399', '#6EE7B7'],
    });
  } catch (error) {
    console.warn('confetti failed:', error);
  }
};
