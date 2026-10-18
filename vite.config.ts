import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base exacta de GitHub Pages: https://coiponorte.github.io/Raton-Kagero/
// Se mantiene viteSingleFile para que todo el JS/CSS quede embebido en un
// único index.html y no haya rutas absolutas que rompan el despliegue.
export default defineConfig({
  base: "/Raton-Kagero/",
  plugins: [react(), tailwindcss(), viteSingleFile()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    host: true,
  },
  preview: {
    port: 4173,
    strictPort: false,
  },
});
