/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        phantom: {
          bg: '#050a07',
          forest: '#0c1a11',
          deepForest: '#122519',
          deep: '#030604',
          surface: '#0d1812',
          elevated: '#14241b',
          border: '#1b3324',
          text: '#EEF4EF',
          muted: '#A5B8AA',
          subtle: '#6A8070',
          lava: '#F5B731',
          lavaDeep: '#D48B17',
          highlight: '#FFD166',
          amber: '#F5B731',
          indigo: '#6366F1',
        },
      },
      fontFamily: {
        serif: ['Instrument Serif', 'Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['Roboto', 'Outfit', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Geist Mono', 'ui-monospace', 'monospace'],
      },

    },
  },
  plugins: [],
}

