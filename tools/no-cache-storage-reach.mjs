import { execFileSync } from "node:child_process";
import { exit } from "node:process";

const APPS = "apps";
const WRITER = "apps/web/src/worker/cache.ts";
const STUBS = [
  "apps/web/src/worker/cache.test.ts",
  "apps/web/src/worker/sw.test.ts",
];
const STUB = 'vi.stubGlobal("caches",';
const ESCAPE =
  /\\u\{([0-9a-fA-F]+)\}|\\u([0-9a-fA-F]{4})|\\x([0-9a-fA-F]{2})|\\(?:\r\n|[\n\r\u2028\u2029])|\\(.)/g;

const HIGHEST = 0x10ffff;

const git = (...args) =>
  execFileSync("git", args, { encoding: "utf8", maxBuffer: Infinity });

const decoded = (match, braced, plain, hex, literal) => {
  const digits = braced ?? plain ?? hex;
  if (digits === undefined) return literal ?? "";
  const point = Number.parseInt(digits, 16);
  return point > HIGHEST ? match : String.fromCodePoint(point);
};

const spelled = (path) => {
  const source = git("show", `:${path}`).replace(ESCAPE, decoded);
  return STUBS.includes(path) ? source.replaceAll(STUB, "") : source;
};

const offenders = git("ls-files", "--", APPS)
  .trim()
  .split("\n")
  .filter((path) => path !== WRITER && spelled(path).includes("caches"));

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
