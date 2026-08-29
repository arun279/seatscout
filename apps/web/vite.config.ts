import { defineConfig } from "vite";

export default defineConfig({
  appType: "mpa",
  build: {
    lib: {
      entry: { index: "src/index.ts", sw: "src/sw.ts" },
      formats: ["es"],
      fileName: (_format, entry) => `${entry}.js`,
    },
  },
});
