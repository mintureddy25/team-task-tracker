/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm paper canvas + ink — an editorial "ledger" palette.
        paper: '#f4f1e9',
        bone: '#fbf9f3',
        ink: {
          DEFAULT: '#1a1916',
          soft: '#3d3a33',
          900: '#13120f',
        },
        muted: '#78736a',
        faint: '#a8a296',
        line: '#ddd7c9',
        'line-strong': '#cbc4b2',
        // Muted, sophisticated semantic signals (re-mapped off neon defaults).
        signal: {
          stone: '#6b6459',
          cobalt: '#3a557f',
          ochre: '#9c7430',
          moss: '#52743f',
          brick: '#9d433b',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"Hanken Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        // Crisp "printed card" offset — flat, editorial, not the usual soft blur.
        card: '3px 3px 0 0 rgba(26, 25, 22, 0.06)',
        'card-hover': '5px 5px 0 0 rgba(26, 25, 22, 0.10)',
        pop: '6px 6px 0 0 rgba(26, 25, 22, 0.12)',
      },
      borderRadius: {
        card: '4px',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.97) translateY(6px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fade-in 0.4s ease both',
        'pop-in': 'pop-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  plugins: [],
};
