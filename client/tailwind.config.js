/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#1d1c1a',
          850: '#232220',
          800: '#262421',
          750: '#2b2926',
          700: '#312e2b',
          600: '#3a3734',
          500: '#48453f',
          400: '#66625c',
          300: '#8b877f',
          200: '#b8b4ab',
          100: '#e9e7e3',
        },
        grass: {
          600: '#5d8536',
          500: '#6f9c41',
          400: '#81b64c',
          300: '#95ca5c',
          200: '#b6e076',
        },
        board: {
          light: '#eeeed2',
          dark: '#769656',
          hl: '#f7f769',
        },
      },
      fontFamily: {
        display: ['"Segoe UI"', 'system-ui', '-apple-system', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px rgba(0,0,0,0.35)',
        pop: '0 12px 40px rgba(0,0,0,0.5)',
      },
      keyframes: {
        popIn: { '0%': { transform: 'scale(.85)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        slideUp: { '0%': { transform: 'translateY(10px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        shake: { '0%,100%': { transform: 'translateX(0)' }, '25%': { transform: 'translateX(-6px)' }, '75%': { transform: 'translateX(6px)' } },
        pulseGlow: { '0%,100%': { boxShadow: '0 0 0 0 rgba(129,182,76,.5)' }, '50%': { boxShadow: '0 0 0 8px rgba(129,182,76,0)' } },
        floatUp: { '0%': { transform: 'translateY(0)', opacity: '1' }, '100%': { transform: 'translateY(-26px)', opacity: '0' } },
      },
      animation: {
        popIn: 'popIn .18s ease-out',
        slideUp: 'slideUp .25s ease-out',
        shake: 'shake .3s ease-in-out',
        pulseGlow: 'pulseGlow 1.6s ease-out infinite',
        floatUp: 'floatUp .9s ease-out forwards',
      },
    },
  },
  plugins: [],
};
