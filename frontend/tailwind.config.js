/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        makita: {
          blue: '#003087',
          teal: '#009B96',
        },
      },
    },
  },
  plugins: [],
};
