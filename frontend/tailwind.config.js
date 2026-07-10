/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f7941d',   /* exact logo orange */
          600: '#e07800',
          700: '#c26200',
          800: '#9a4d00',
          900: '#7c3a00',
          950: '#431f00',
        },
      },
    },
  },
  plugins: [],
};
