/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#FAF7F1",
        surface: "#FFFFFF",
        "surface-raised": "#F4EEE1",
        border: "#E7DFCC",
        "border-strong": "#D9CBA3",
        ink: "#231F1A",
        "ink-muted": "#8A8070",
        "ink-faint": "#B3A992",
        gold: {
          DEFAULT: "#AD8A3E",
          dim: "#8F6C2E",
          deep: "#6B4E1E",
          bg: "#F3E9D2",
        },
        emerald: {
          DEFAULT: "#3F6B52",
          dim: "#315340",
          bg: "#E7EFE7",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "sans-serif"],
        serif: ["Fraunces", "Georgia", "serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(90,70,20,0.05), 0 10px 30px -12px rgba(60,45,10,0.12)",
        card: "0 1px 3px rgba(90,70,20,0.06)",
      },
    },
  },
  plugins: [],
};
