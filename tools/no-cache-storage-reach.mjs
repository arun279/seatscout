import { execFileSync } from "node:child_process";
import { exit } from "node:process";

const WRITER = "apps/web/src/worker/cache.ts";
const STUB = 'vi.stubGlobal("caches",';

const git = (...args) => execFileSync("git", args, { encoding: "utf8" });

const offenders = git("ls-files", "--", "apps/web", "apps/proxy")
  .trim()
  .split("\n")
  .filter(
    (path) =>
      path !== WRITER &&
      git("show", `:${path}`).replaceAll(STUB, "").includes("caches"),
  );

if (offenders.length > 0) {
  console.error(
    `Refusing ${offenders.length} file(s) that name Cache Storage:\n` +
      offenders.map((path) => `  ${path}`).join("\n") +
      `\n\nCache Storage is reached only through ${WRITER}, whose writer takes no` +
      "\nargument and caches the build's own output. Availability changes minute to minute," +
      "\nso a cached seat is a lie with a plausible face. CONTRIBUTING.md says why.",
  );
  exit(1);
}
