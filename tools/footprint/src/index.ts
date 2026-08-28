import { writeFileSync } from "node:fs";
import { main } from "./main.js";
import { measureWith } from "./measure.js";
import { shell } from "./shell.js";

process.exitCode = main(
  process.argv,
  measureWith(shell),
  writeFileSync,
  process.stdout,
);
