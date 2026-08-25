/** @type {import('tailwindcss').Config} */
// Tailwind theme extended with the SatQuery AI design tokens so the palette
// and typefaces are available as utility classes (e.g. text-cyan, font-display).
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        void: "#05070D",
        deep: "#070B14",
        panel: "#0B1120",
        raised: "#0F1627",
        line: "#1A2540",
        lineBright: "#2A3B5C",
        ink: "#E9F0FB",
        muted: "#8896B2",
        faint: "#5A6885",
        cyan: "#4FD8EE",
        cyanDim: "#2AA7BE",
        signal: "#4C86F5",
        amber: "#E8A64C",
      },
      fontFamily: {
        display: ["Sora", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "monospace"],
      },
      maxWidth: {
        content: "1200px",
      },
    },
  },
  plugins: [],
};
