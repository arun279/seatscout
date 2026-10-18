import { existsSync, readdirSync, readFileSync } from "node:fs";
import { findings } from "./findings.ts";
import { judgedFrom } from "./results.ts";

const [dir = "", run = ""] = process.argv.slice(2);

const { found, body } = findings(
  judgedFrom(
    dir,
    (path) => (existsSync(path) ? readFileSync(path, "utf8") : null),
    (path) => (existsSync(path) ? readdirSync(path) : []),
  ),
  run,
);

process.stdout.write(`${body}\n`);
process.exitCode = found ? 2 : 0;
