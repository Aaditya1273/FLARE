/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        term: {
          bg: "rgb(var(--c-bg) / <alpha-value>)",
          panel: "rgb(var(--c-panel) / <alpha-value>)",
          border: "rgb(var(--c-border) / 0.12)",
          text: "rgb(var(--c-text) / <alpha-value>)",
          surface: "rgb(var(--c-surface) / <alpha-value>)",
          invertBg: "rgb(var(--c-invert-bg) / <alpha-value>)",
          invertText: "rgb(var(--c-invert-text) / <alpha-value>)",
          green: "#22c55e",
          violet: "#8b5cf6",
          amber: "#f59e0b",
          red: "#ef4444",
          muted: "rgb(var(--c-muted) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "var(--font-inter)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      backgroundImage: {
        brand: "linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #22c55e 100%)",
        intelligence: "linear-gradient(115deg, #fa8e53 0%, #e75a8c 28%, #a95ff0 55%, #5b8def 78%, #4fc9e0 100%)",
        "intelligence-conic":
          "conic-gradient(from 0deg, #fa8e53, #e75a8c, #a95ff0, #5b8def, #4fc9e0, #fa8e53)",
      },
      keyframes: {
        "glow-spin": {
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "glow-spin": "glow-spin 14s linear infinite",
      },
    },
  },
  plugins: [],
};
