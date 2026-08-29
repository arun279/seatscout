import { list, read } from "./files.ts";
import { main } from "./main.ts";

process.exitCode = await main(
  process.argv,
  read,
  list,
  process.stdout,
  process.stderr,
);
