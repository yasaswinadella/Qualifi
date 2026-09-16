/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        obsidian: '#08090d',
        card: '#12151f',
        borderSubtle: '#1e2333',
        brandIndigo: '#6366f1',
        brandEmerald: '#10b981',
        brandAmber: '#f59e0b',
        brandRose: '#f43f5e',
        brandCyan: '#06b6d4',
        brandPurple: '#a855f7'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif']
      }
    }
  },
  plugins: []
};
