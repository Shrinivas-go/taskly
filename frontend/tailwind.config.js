/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#6957d9',
          hover: '#5d4bcf',
          light: '#f0eefc',
          dark: '#332d59',
          border: '#d9d3ff',
        },
        priority: {
          p1: '#e15d62',
          p2: '#e0913e',
          p3: '#5e94d7',
          p4: '#9ba0a9',
        },
      },
      borderRadius: {
        DEFAULT: '0.5rem',
      },
    },
  },
  plugins: [],
};
