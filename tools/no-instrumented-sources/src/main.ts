import { carrying, type Read, refusal } from "./instrumentation.ts";

export interface Writer {
  readonly write: (text: string) => void;
}

export const NOTHING =
  "Refusing a run with no file to judge. Given paths this check reads those, and given\nnone it reads every tracked source, so an empty list is a verdict over nothing.\n";

export const tracked = (listing: string): readonly string[] =>
  listing.split("\n").filter((path) => path !== "");

export const main = (
  argv: readonly string[],
  listing: () => string,
  read: Read,
  err: Writer,
): number => {
  const given = argv.slice(2);
  const paths = given.length === 0 ? tracked(listing()) : given;
  if (paths.length === 0) {
    err.write(NOTHING);
    return 1;
  }

  const offenders = carrying(paths, read);
  if (offenders.length === 0) return 0;
  err.write(refusal(offenders));
  return 1;
};
