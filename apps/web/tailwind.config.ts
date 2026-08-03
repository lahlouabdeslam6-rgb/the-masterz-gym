import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#11110f",
        sand: "#f2eee5",
        gold: "#c99a42",
      },
    },
  },
  plugins: [],
} satisfies Config;
