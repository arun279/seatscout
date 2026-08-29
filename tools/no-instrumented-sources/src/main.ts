import { carrying, type Read, refusal } from "./instrumentation.ts";

export interface Writer {
  readonly write: (text: string) => void;
}

export const NOTHING =
  "Refusing a run handed no file to judge. This check reads the paths it is given,\nso an empty list is a verdict over a file nobody looked at.\n";

export const main = (
  argv: readonly string[],
  read: Read,
  err: Writer,
): number => {
  const paths = argv.slice(2);
  if (paths.length === 0) {
    err.write(NOTHING);
    return 1;
  }

  const offenders = carrying(paths, read);
  if (offenders.length === 0) return 0;
  err.write(refusal(offenders));
  return 1;
};
