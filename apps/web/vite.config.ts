import { defineConfig } from "vite";

export default defineConfig({
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: {
    lib: {
      entry: { index: "src/index.ts", sw: "src/worker/sw.ts" },
      formats: ["es"],
      fileName: (_format, entry) => `${entry}.js`,
    },
  },
});
