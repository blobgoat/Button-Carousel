import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

// Alias the package name straight to the local package source so the
// example always exercises the current in-repo implementation with no
// separate build/link step required during development.
export default defineConfig({
  resolve: {
    alias: {
      "button-carousel": fileURLToPath(new URL("../src/index.ts", import.meta.url)),
    },
  },
});
