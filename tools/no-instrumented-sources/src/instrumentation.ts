export const MARKERS = [
  "stryMutAct_",
  "stryNamespace",
  "stryCov_",
  "@ts-nocheck",
];

export const DECLARING = "tools/no-instrumented-sources/src/instrumentation.ts";

export type Read = (path: string) => string;

export const carrying = (
  paths: readonly string[],
  read: Read,
): readonly string[] =>
  paths.filter(
    (path) =>
      path !== DECLARING &&
      MARKERS.some((marker) => read(path).includes(marker)),
  );

export const refusal = (offenders: readonly string[]): string =>
  `Refusing ${offenders.length} file(s) that have opted out of being judged:\n${offenders
    .map((path) => `  ${path}`)
    .join(
      "\n",
    )}\n\nThe markers are ${MARKERS.join(", ")}: what the mutation runner leaves\nbehind when it rewrites a source in place, and the directive that turns the compiler\noff for a whole file, which Biome's noTsIgnore does not reach because that rule covers\nts-ignore alone. Restore a rewritten source with\n  git restore <paths>\nand rebuild before committing.\n\n${DECLARING} is the one file allowed to spell a marker,\nbecause it is where the list is written down. A fixture that has to carry one lives\noutside src under a .txt suffix, where neither this check nor a compiler reads it.\n`;
