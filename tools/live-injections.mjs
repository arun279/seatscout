import { glob, readFile } from "node:fs/promises";

const SETUP = "tools/live-answers.mjs";

const namesIn = (source, call) =>
  [...source.matchAll(new RegExp(`${call}\\("([A-Za-z]+)"`, "g"))].map(
    (found) => found[1],
  );

const provided = new Set(namesIn(await readFile(SETUP, "utf8"), "provide"));
const missing = [];
for await (const file of glob("{apps,packages,tools}/*/**/*.live.test.ts"))
  for (const name of namesIn(await readFile(file, "utf8"), "inject"))
    if (!provided.has(name)) missing.push(`${file} injects ${name}`);

if (missing.length > 0) {
  process.stderr.write(
    `${SETUP} provides ${[...provided].join(", ")}, and the live suite asks for more:\n${missing.map((line) => `  ${line}\n`).join("")}`,
  );
  process.exit(1);
}
process.stdout.write(
  `${SETUP} provides every value the live suite injects: ${[...provided].join(", ")}\n`,
);
