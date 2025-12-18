/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Палитра Things 3 Dark Mode
        bg: {
          DEFAULT: "#1a1c20", // Глубокий темный фон
          sidebar: "#141518", // Чуть темнее для меню
          card: "#232529",    // Цвет карточек
        },
        text: {
          primary: "#ffffff",
          secondary: "#9ca3af",
        },
        accent: {
          blue: "#3689e6",    // Тот самый синий цвет Things
          blueHover: "#2b74c7",
        },
        border: {
          subtle: "#2f3136",
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}