import { main } from "./main.ts";
import { git } from "./run.ts";

process.exitCode = main(process.argv, git, process.stderr);
