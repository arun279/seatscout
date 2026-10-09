import { blankAll } from "./blank-tree.js";

process.exitCode = blankAll(process.argv, process.stderr);
