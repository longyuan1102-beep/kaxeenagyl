/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fff4e6',
          100: '#ffe0b2',
          200: '#ffcc80',
          300: '#ffb84d',
          400: '#ffa726',
          500: '#ff8a00', // 主色
          600: '#ff7700',
          700: '#ff6600',
          800: '#ff5500',
          900: '#ff4400',
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
