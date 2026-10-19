/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        buk: {
          navy: {
            DEFAULT: '#002147',
            dark: '#00142b',
            light: '#0a3666',
          },
          gold: {
            DEFAULT: '#C5A059',
            light: '#E2C785',
            dark: '#9E7A32',
          },
          green: {
            DEFAULT: '#006837',
            light: '#009245',
            dark: '#004724',
          },
          slate: {
            50: '#F8FAFC',
            100: '#F1F5F9',
            200: '#E2E8F0',
            300: '#CBD5E1',
            800: '#1E293B',
            900: '#0F172A',
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
