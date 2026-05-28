/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          400: '#7c8aff',
          500: '#5b6fff',
          600: '#4a5bd9',
        },
      },
    },
  },
  plugins: [],
};
