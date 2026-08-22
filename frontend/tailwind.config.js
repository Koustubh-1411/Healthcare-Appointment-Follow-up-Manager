/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0f6e5c',
          dark: '#0b5346',
          light: '#e6f3f0',
        },
      },
    },
  },
  plugins: [],
};
