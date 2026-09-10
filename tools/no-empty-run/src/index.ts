import { read } from "./file.ts";
import { main } from "./main.ts";

process.exitCode = main(process.argv, read, process.stdout, process.stderr);
