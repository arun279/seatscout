import { defineConfig, type UserConfig } from "vite";
import { shellFilesIn } from "./shell-files.js";

const OUT = "dist";

const page: UserConfig = {
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: () => "index.js",
      cssFileName: "index",
    },
  },
};

const worker = async (): Promise<UserConfig> => ({
  define: { SHELL_FILES: JSON.stringify(await shellFilesIn(OUT)) },
  build: {
    emptyOutDir: false,
    lib: {
      entry: "src/worker/sw.ts",
      formats: ["es"],
      fileName: () => "sw.js",
    },
  },
});

export default defineConfig(({ mode }) =>
  mode === "worker" ? worker() : page,
);
