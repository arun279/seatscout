import { writeFileSync } from "node:fs";
import { read } from "./file.js";
import { main } from "./main.js";
import { measureWith } from "./measure.js";
import { run } from "./shell.js";

process.exitCode = main(
  process.argv,
  measureWith(run, read),
  writeFileSync,
  process.stdout,
);
