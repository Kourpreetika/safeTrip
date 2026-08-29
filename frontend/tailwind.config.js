/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#F7C948",
        header: "#111111",
        ink: "#1A1A1A",
        surface: "#FAFAF8",
        muted: "#6B6B6B",
        line: "#E6E6E4",
        sos: "#DC2626",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(17, 17, 17, 0.06), 0 8px 24px rgba(17, 17, 17, 0.04)",
      },
    },
  },
  plugins: [],
};
