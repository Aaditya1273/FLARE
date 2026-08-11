/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        term: {
          bg: "#08090a",
          panel: "#0e1011",
          border: "#1f2426",
          green: "#22c55e",
          amber: "#f59e0b",
          red: "#ef4444",
          muted: "#6b7280",
        },
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
