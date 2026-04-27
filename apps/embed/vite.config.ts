import { defineConfig } from "vite";
import { copyFileSync, mkdirSync } from "fs";
import { resolve } from "path";

export default defineConfig({
  publicDir: "public",
  build: {
    target: "esnext",
    lib: {
      entry: "src/index.ts",
      name: "ChatbotWidget",
      formats: ["iife"],
      fileName: () => "widget.js",
    },
    rollupOptions: {
      output: {
        extend: true,
      },
    },
  },
  plugins: [
    {
      name: "copy-to-widget-public",
      writeBundle() {
        const src = resolve(__dirname, "dist/widget.js");
        const destDir = resolve(__dirname, "../widget/public");
        const dest = resolve(destDir, "widget.js");

        try {
          mkdirSync(destDir, { recursive: true });
          copyFileSync(src, dest);
          console.log("\n✅ widget.js copied to apps/widget/public/widget.js");
        } catch (error) {
          console.error("\n❌ Failed to copy widget.js:", error);
        }
      },
    },
  ],
});
