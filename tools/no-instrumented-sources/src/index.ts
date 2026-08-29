import { readFileSync } from "node:fs";
import { main } from "./main.ts";

process.exitCode = main(
  process.argv,
  (path) => readFileSync(path, "utf8"),
  process.stderr,
);
