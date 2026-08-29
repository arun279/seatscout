import { writeFileSync } from "node:fs";
import { main } from "./main.js";
import { measureWith } from "./measure.js";
import { run } from "./shell.js";

process.exitCode = main(
  process.argv,
  measureWith(run),
  writeFileSync,
  process.stdout,
);
