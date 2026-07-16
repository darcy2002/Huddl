import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // Vite 8 auto-detects the pnpm workspace root and adds it to fs.allow,
    // so the raw-.ts @huddl/shared package resolves. Uncomment on a 403:
    // fs: { allow: [fileURLToPath(new URL("../..", import.meta.url))] },
  },
});
