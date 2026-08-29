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
  `Refusing ${offenders.length} file(s) carrying mutation-test instrumentation:\n${offenders
    .map((path) => `  ${path}`)
    .join(
      "\n",
    )}\n\nThe mutation runner rewrites sources in place. Restore them with\n  git restore <paths>\nand rebuild before committing.\n\n${DECLARING} is the one file allowed to spell a marker, because it is\nwhere the list is written down. Everything else is judged, tests included.\n`;
