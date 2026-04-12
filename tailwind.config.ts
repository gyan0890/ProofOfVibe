import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        base: "#080810",
        surface: "rgba(255,255,255,0.04)",
        "vibe-architect": "#7F77DD",
        "vibe-degen": "#D85A30",
        "vibe-ghost": "#888780",
        "vibe-builder": "#1D9E75",
        "vibe-whale": "#185FA5",
        "vibe-socialite": "#D4537E",
        "vibe-oracle": "#BA7517",
      },
      fontFamily: {
        card: ["Space Grotesk", "sans-serif"],
        ui: ["Inter", "sans-serif"],
      },
      animation: {
        "aura-rotate": "aura-rotate 20s linear infinite",
        "aura-pulse": "aura-pulse 3s ease-in-out infinite",
        "aura-halo": "aura-halo 4s ease-in-out infinite",
        shimmer: "shimmer 1.5s infinite",
        "float-in": "float-in 0.15s ease-out forwards",
        "card-flip": "card-flip 0.8s cubic-bezier(0.23,1,0.32,1) forwards",
        shake: "shake 0.4s ease-in-out",
      },
      backdropBlur: {
        card: "12px",
      },
    },
  },
  plugins: [],
};
export default config;
