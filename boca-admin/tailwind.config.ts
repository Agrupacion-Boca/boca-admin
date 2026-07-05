import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bombonera: "#0B2D6B",
        "bombonera-deep": "#071B42",
        oro: "#FFC72C",
        "oro-soft": "#FFE08A",
      },
    },
  },
  plugins: [],
};
export default config;
