import { defineConfig } from "tsup";

// No CSS loader override needed: src/style.ts imports the generated
// src/generated-style.ts (a plain string constant produced by
// scripts/generate-css.mjs from src/style.css), not a .css file directly.
// See scripts/generate-css.mjs for why.
export default defineConfig({
    entry: ["src/index.ts"],
    format: ["esm"],
    dts: true,
    clean: true,
});