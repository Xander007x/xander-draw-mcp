import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3300,
    host: "0.0.0.0",
    proxy: {
      // Proxy API requests to the MCP ingest server
      "/api": {
        target: "http://localhost:3200",
        changeOrigin: true,
      },
      // Proxy WebSocket connections
      "/ws": {
        target: "ws://localhost:3200",
        ws: true,
      },
    },
  },
  define: {
    "process.env.IS_PREACT": JSON.stringify("false"),
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
