import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@core": path.resolve(__dirname, "./src/core"),
      "@ui": path.resolve(__dirname, "./src/ui"),
    },
  },
  build: {
    target: "ES2020",
    outDir: "dist",
    sourcemap: false,
    minify: "terser",
  },
  server: {
    port: 5173,
    host: true,
  },
});
