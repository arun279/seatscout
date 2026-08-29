import { CLAIMS } from "./claims.ts";
import { read } from "./file.ts";
import { main } from "./main.ts";

process.exitCode = main(CLAIMS, read, process.stdout, process.stderr);
