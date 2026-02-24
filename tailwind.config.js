/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sidebar: {
          dark: '#1f2937', // gray-800 (cor dos cards)
          darker: '#374151', // gray-700
          hover: '#374151', // gray-700
        },
        background: {
          dark: '#020617', // cor antiga da sidebar para fundo das abas
        },
      },
    },
  },
  plugins: [],
}

