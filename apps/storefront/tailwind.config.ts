import type { Config } from "tailwindcss"
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // brand 600 = #1753b0 (user's exact blue)
        brand: { 50:"#eef4fc", 100:"#d6e4f6", 200:"#aecaee", 300:"#79a6e1", 400:"#4480d2", 500:"#2563c0", 600:"#1753b0", 700:"#13458f", 800:"#103a76", 900:"#0e3060", 950:"#091e3f" },
        ink:   { 50:"#f7f8fa", 100:"#eef0f4", 200:"#dfe3ea", 300:"#c4cad6", 400:"#9aa3b4", 500:"#6b7384", 600:"#4a5364", 700:"#343c4d", 800:"#1f2533", 900:"#0f1320", 950:"#070912" },
        accent:{ amber:"#f59e0b", green:"#10b981", red:"#ef4444" },
      },
      fontFamily: { sans: ["var(--font-sans)","system-ui","sans-serif"] },
      boxShadow: {
        card: "0 1px 2px rgba(15,19,32,0.04), 0 8px 24px -8px rgba(15,19,32,0.10)",
        cardHover: "0 4px 8px rgba(15,19,32,0.06), 0 24px 48px -12px rgba(23,83,176,0.25)",
        chip: "0 1px 2px rgba(15,19,32,0.06)",
      },
    },
  },
  plugins: [],
} satisfies Config
