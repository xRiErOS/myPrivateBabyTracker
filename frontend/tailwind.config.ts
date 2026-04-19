import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ground: "var(--color-base)",
        surface0: "var(--color-surface0)",
        surface1: "var(--color-surface1)",
        surface2: "var(--color-surface2)",
        overlay0: "var(--color-overlay0)",
        text: "var(--color-text)",
        subtext0: "var(--color-subtext0)",
        subtext1: "var(--color-subtext1)",
        mauve: "var(--color-mauve)",
        sapphire: "var(--color-sapphire)",
        green: "var(--color-green)",
        yellow: "var(--color-yellow)",
        peach: "var(--color-peach)",
        red: "var(--color-red)",
        maroon: "var(--color-maroon)",
        pink: "var(--color-pink)",
        lavender: "var(--color-lavender)",
        blue: "var(--color-blue)",
        sky: "var(--color-sky)",
        teal: "var(--color-teal)",
        flamingo: "var(--color-flamingo)",
        rosewater: "var(--color-rosewater)",
      },
      fontFamily: {
        headline: ["Space Grotesk", "sans-serif"],
        body: ["Manrope", "sans-serif"],
        label: ["Inter Tight", "sans-serif"],
      },
      borderRadius: {
        card: "1rem",
      },
    },
  },
  plugins: [],
} satisfies Config;
