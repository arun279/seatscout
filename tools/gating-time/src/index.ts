import { main } from "./main.ts";
import { read } from "./shell.ts";

process.exitCode = main(process.argv, read, process.stdout, process.stderr);
