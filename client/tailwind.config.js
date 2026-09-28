/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        // ASIATECH SYNC brand palette
        forest: "#6C8976", // muted green brand tone
        navy: "#0F1E35", // body text / structure
        gray: "#E8EEF5", // light surfaces
        gold: "#ABD1B5", // soft mint accent for active states and highlights
        cream: "#E6EFE6", // mint-cream page background
        coral: "#E74C3C", // warnings and alerts
        dimGray: "#596869",
        reseda: "#6C8976",
        cambridge: "#79B791",
        celadon: "#ABD1B5",
        mintCream: "#E6EFE6",
      },
      fontFamily: {
        display: ['"Bespoke Serif"', "Georgia", "serif"],
        body: ['"Bespoke Serif"', "Georgia", "serif"],
        bespoke: ['"Bespoke Serif"', "Georgia", "serif"],
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.875rem", { lineHeight: "1.25rem" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
        lg: ["1.125rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
        "4xl": ["2.25rem", { lineHeight: "2.5rem" }],
      },
      boxShadow: {
        sm: "0 2px 8px -2px rgba(15, 30, 53, 0.15)",
        base: "0 4px 12px -4px rgba(15, 30, 53, 0.2)",
        card: "0 8px 24px -8px rgba(15, 30, 53, 0.3)",
        lg: "0 12px 32px -12px rgba(15, 30, 53, 0.4)",
        xl: "0 16px 40px -16px rgba(15, 30, 53, 0.5)",
        "2xl": "0 20px 48px -20px rgba(15, 30, 53, 0.6)",
      },
      spacing: {
        xs: "0.25rem",
        sm: "0.5rem",
        md: "0.75rem",
        lg: "1rem",
        xl: "1.25rem",
        "2xl": "1.5rem",
      },
    },
  },
  plugins: [],
};
