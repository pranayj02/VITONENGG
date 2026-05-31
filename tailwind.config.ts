import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        viton: {
          navy: "#1a2744",
          red: "#d4222a",
          "red-hover": "#b81c22",
          "red-active": "#9a161b",
          "navy-light": "#243259",
          "navy-muted": "#3d4f7a",
        },
      },
    },
  },
  plugins: [],
};

export default config;
