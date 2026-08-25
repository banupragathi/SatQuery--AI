import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite config for the SatQuery AI frontend.
// The dev server runs on http://localhost:5173 and the FastAPI backend on
// http://localhost:8000 (see src/services/api.js for the base URL).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
