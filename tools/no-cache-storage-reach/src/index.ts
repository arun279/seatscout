import { listing, staged } from "./git.ts";
import { main } from "./main.ts";

process.exitCode = main(process.argv, listing, staged, process.stderr);
