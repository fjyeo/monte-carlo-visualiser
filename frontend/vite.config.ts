import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * Vite configuration for the Monte Carlo Visualiser frontend.
 *
 * - react()         : enables JSX transform and React Fast Refresh in dev
 * - tailwindcss()   : Tailwind v4 Vite plugin (no tailwind.config.js needed)
 * - server.proxy    : forwards /api/* requests to the FastAPI backend during
 *                     development so the browser never sees CORS issues
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Any request starting with /api is forwarded to the Python backend.
      // The rewrite strips the /api prefix before the request hits FastAPI,
      // so /api/health becomes /health (matching the backend route).
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
