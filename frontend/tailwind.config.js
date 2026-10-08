/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#0F6657",
        secondary: "#00AD8F",
        warning: "#FBA808",
        danger: "#EF5350",
        page: "#F8FAFC",
        ink: "#01000D",
      },
      boxShadow: {
        card: "0 1px 3px rgba(1, 0, 13, 0.06)",
      },
    },
  },
  plugins: [],
};
