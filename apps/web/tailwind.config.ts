import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#030609",
        foreground: "#ffffff",
        primary: {
          DEFAULT: "#00d4ff", // cyan
          dark: "#00b3d6",
        },
        secondary: {
          DEFAULT: "#0047ff", // electric blue
          dark: "#003bcf",
        },
        surface: "#0a0f14",
        "surface-hover": "#101923",
        border: "#1f2b35",
      },
      fontFamily: {
        display: ["var(--font-display)"],
      },
    },
  },
  plugins: [],
} satisfies Config;
