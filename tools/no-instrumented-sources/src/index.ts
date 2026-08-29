import { listing } from "./git.ts";
import { read } from "./file.ts";
import { main } from "./main.ts";

process.exitCode = main(process.argv, listing, read, process.stderr);
