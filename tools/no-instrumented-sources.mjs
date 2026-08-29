import { readFileSync } from "node:fs";
import { argv, exit } from "node:process";

const MARKERS = ["stryMutAct_", "stryNamespace", "stryCov_", "@ts-nocheck"];

const offenders = argv.slice(2).filter((path) => {
  const source = readFileSync(path, "utf8");
  return MARKERS.some((marker) => source.includes(marker));
});

if (offenders.length > 0) {
  console.error(
    `Refusing ${offenders.length} file(s) carrying mutation-test instrumentation:\n` +
      offenders.map((path) => `  ${path}`).join("\n") +
      "\n\nThe mutation runner rewrites sources in place. Restore them with" +
      "\n  git restore <paths>\nand rebuild before committing.",
  );
  exit(1);
}
