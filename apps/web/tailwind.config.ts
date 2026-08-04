import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#050505",
        foreground: "#ffffff",
        primary: {
          DEFAULT: "#00d4ff", // cyan
          dark: "#00b3d6",
        },
        secondary: {
          DEFAULT: "#0047ff", // electric blue
          dark: "#003bcf",
        },
        surface: "#121212",
        "surface-hover": "#1e1e1e",
        border: "#262626"
      },
    },
  },
  plugins: [],
} satisfies Config;
