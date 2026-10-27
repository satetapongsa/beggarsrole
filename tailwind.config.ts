import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        night: {
          950: "#0b0907",
          900: "#14110d",
          800: "#1e1914",
          700: "#2a231b",
          600: "#3a3026",
        },
        lamp: {
          300: "#ffd28a",
          400: "#ffb547",
          500: "#f59e0b",
          600: "#d97706",
        },
      },
      fontFamily: {
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        pixel: ["var(--font-pixel)", "var(--font-body)", "monospace"],
      },
      keyframes: {
        pulseCrit: {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
        slideUp: {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        toastIn: {
          "0%": { transform: "translateY(-20px)", opacity: "0" },
          "15%,85%": { transform: "translateY(0)", opacity: "1" },
          "100%": { transform: "translateY(-20px)", opacity: "0" },
        },
        spinFlag: {
          "0%": { transform: "rotateY(0deg) scale(0.6)" },
          "100%": { transform: "rotateY(1440deg) scale(1)" },
        },
        popIn: {
          "0%": { transform: "scale(0.6)", opacity: "0" },
          "70%": { transform: "scale(1.08)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        flicker: {
          "0%,100%": { opacity: "0.85" },
          "45%": { opacity: "1" },
          "50%": { opacity: "0.6" },
          "55%": { opacity: "1" },
        },
      },
      animation: {
        pulseCrit: "pulseCrit 0.9s ease-in-out infinite",
        slideUp: "slideUp 0.35s ease-out",
        fadeIn: "fadeIn 0.4s ease-out",
        toast: "toastIn 3.2s ease-in-out forwards",
        spinFlag: "spinFlag 2.2s cubic-bezier(.2,.7,.3,1) forwards",
        popIn: "popIn 0.5s ease-out both",
        flicker: "flicker 3s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
