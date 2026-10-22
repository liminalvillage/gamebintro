// SPDX-License-Identifier: AGPL-3.0-or-later
// vitest's defineConfig = vite's + the typed `test` block below.
import { defineConfig } from "vitest/config";

export default defineConfig({
  build: {
    // Match the other apps: the build lands in `build/` (gitignored).
    outDir: "build",
    target: "es2022",
  },
  test: {
    // Pure-logic specs (font coverage, script integrity, geometry) — no DOM.
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
