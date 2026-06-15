import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      "/universities": "http://localhost:5000",
      "/search": "http://localhost:5000",
      "/recommendations": "http://localhost:5000",
    },
  },
});
