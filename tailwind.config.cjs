/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      // Fluid scales — every step is `clamp(min, fluid, max)`.
      // The fluid term blends a viewport (vw) and container (cqi) factor so
      // the same token works whether the parent uses container-queries or not.
      fontSize: {
        'fluid-sm': 'clamp(0.75rem, 0.6vw + 0.6rem, 0.95rem)',
        'fluid-base': 'clamp(0.875rem, 0.7vw + 0.7rem, 1.1rem)',
        'fluid-lg': 'clamp(1rem, 0.8vw + 0.85rem, 1.5rem)',
        'fluid-xl': 'clamp(1.25rem, 1.5vw + 0.85rem, 2.25rem)',
        'fluid-2xl': 'clamp(1.5rem, 2vw + 1rem, 2.75rem)',
        // Display digits for the timer — capped so 4K monitors don't get a 200px clock.
        'fluid-display': [
          'clamp(3rem, 8vw + 1rem, 8rem)',
          { lineHeight: '1', letterSpacing: '-0.02em' },
        ],
      },
      spacing: {
        'fluid-1': 'clamp(0.25rem, 0.4vw + 0.1rem, 0.5rem)',
        'fluid-2': 'clamp(0.5rem, 0.8vw + 0.25rem, 1rem)',
        'fluid-3': 'clamp(0.75rem, 1.2vw + 0.4rem, 1.5rem)',
        'fluid-4': 'clamp(1rem, 1.6vw + 0.5rem, 2rem)',
        'fluid-6': 'clamp(1.25rem, 2.5vw + 0.5rem, 3rem)',
        'fluid-ring': 'clamp(9rem, 24vw, 18rem)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/container-queries'),
    function ({ addVariant }) {
      // Phones rotated to landscape: short height + landscape + touch input.
      // The `pointer: coarse` clause prevents desktop users who shrink their
      // window vertically from being treated as a phone.
      addVariant(
        'landscape-compact',
        '@media (max-height: 500px) and (orientation: landscape) and (pointer: coarse)',
      );
    },
  ],
};
