import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// mode "artifact" — один самодостатній index.html (для claude.ai Artifact або офлайн-файлу)
export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: [react(), ...(mode === "artifact" ? [viteSingleFile()] : [])],
  build: { outDir: mode === "artifact" ? "dist-artifact" : "dist" },
}));
