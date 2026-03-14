/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "SF Pro Text",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      colors: {
        apple: {
          bg: "#FBFBFD",
          surface: "#F5F5F7",
          card: "#FFFFFF",
          text: "#1D1D1F",
          secondary: "#6E6E73",
          tertiary: "#86868B",
          blue: "#0071E3",
          "blue-dark": "#0077ED",
          green: "#30D158",
          orange: "#FF9F0A",
          red: "#FF3B30",
          border: "rgba(0,0,0,0.08)",
        },
      },
      boxShadow: {
        card: "0 2px 20px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)",
        "card-hover": "0 8px 40px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06)",
        input: "0 0 0 4px rgba(0,113,227,0.15)",
        verdict: "0 20px 60px rgba(0,0,0,0.15)",
      },
      borderRadius: {
        "2xl": "20px",
        "3xl": "28px",
        "4xl": "36px",
      },
      animation: {
        "fade-up": "fadeUp 0.5s ease forwards",
        "fade-in": "fadeIn 0.4s ease forwards",
        "scale-in": "scaleIn 0.3s ease forwards",
        "slide-right": "slideRight 0.4s ease forwards",
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "spin-slow": "spin 2s linear infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        slideRight: {
          "0%": { opacity: "0", transform: "translateX(-16px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [],
};
