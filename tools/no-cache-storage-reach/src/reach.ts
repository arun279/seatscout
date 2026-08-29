import { spelled } from "./escapes.ts";

export const NAME = "caches";
export const WRITER = "apps/web/src/worker/cache.ts";

const STUBS = [
  "apps/web/src/worker/cache.test.ts",
  "apps/web/src/worker/sw.test.ts",
];

const STUB = 'vi.stubGlobal("caches",';

export type Read = (path: string) => string;

const sourceOf = (path: string, read: Read): string => {
  const source = spelled(read(path));
  return STUBS.includes(path) ? source.replaceAll(STUB, "") : source;
};

export const tracked = (listing: string): readonly string[] =>
  listing.split("\n").filter((path) => path !== "");

export const reaching = (
  paths: readonly string[],
  read: Read,
): readonly string[] =>
  paths.filter(
    (path) => path !== WRITER && sourceOf(path, read).includes(NAME),
  );

export const refusal = (offenders: readonly string[]): string =>
  `Refusing ${offenders.length} file(s) that name Cache Storage:\n${offenders
    .map((path) => `  ${path}`)
    .join(
      "\n",
    )}\n\nCache Storage is reached only through ${WRITER}, whose writer takes no\nargument and caches the build's own output. Availability changes minute to minute,\nso a cached seat is a lie with a plausible face. CONTRIBUTING.md says why.\n`;
