import type { Config } from "tailwindcss";

// Every colour reads from CSS variables defined in src/styles/tokens.css.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "var(--c-offwhite)",
        brand: "var(--c-blue)",
        ink: "var(--c-navy)",
        "ink-soft": "var(--c-ink-soft)",
        line: "var(--c-line)",
        surface: "var(--c-surface)",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      maxWidth: { page: "1180px" },
    },
  },
  plugins: [],
};
export default config;
