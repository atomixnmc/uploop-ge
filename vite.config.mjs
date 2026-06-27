import { defineConfig } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Map @uploop/* to packages/*/src/index.js for direct source resolution
const uploopPackages = [
  "math",
  "geometry",
  "shader",
  "renderer",
  "scene",
  "resources",
  "anim",
  "tween",
  "physics",
  "game-ui",
  "loaders",
  "parallel",
  "director",
  "custom-pipeline",
  "ray-tracing",
];

const alias = {};
for (const pkg of uploopPackages) {
  alias[`@uploop/${pkg}`] = path.resolve(
    __dirname,
    `packages/${pkg}/src/index.js`,
  );
}

export default defineConfig(({ mode }) => ({
  root: "examples",
  base: process.env.VITE_BASE || "/",
  server: {
    port: 3001,
    open: true,
  },
  resolve: {
    conditions: ["import"],
    alias,
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    target: "es2020",
  },
}));
