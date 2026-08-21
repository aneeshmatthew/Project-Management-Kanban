import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#0B0E14",
        panel: "#12161F",
        border: "#232A35",
        ink: "#E6E9EF",
        muted: "#7C8797",
        priority: {
          urgent: "#F0546B",
          high: "#E8A33D",
          medium: "#5B8DEF",
          low: "#4FD1C5",
          none: "#3A4250",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
