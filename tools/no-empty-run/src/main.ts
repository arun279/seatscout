import { DUPLICATION } from "./duplication.ts";
import type { Kind } from "./kind.ts";
import { MUTATION } from "./mutation.ts";

export interface Writer {
  readonly write: (text: string) => void;
}

const KINDS: Readonly<Record<string, Kind>> = {
  duplication: DUPLICATION,
  mutation: MUTATION,
};

export const main = (
  argv: readonly string[],
  read: (path: string) => string | null,
  out: Writer,
  err: Writer,
): number => {
  const [named = "", given] = argv.slice(2);
  const kind = KINDS[named];
  if (kind === undefined) {
    err.write(
      `${named || "nothing"} is not a run this guard reads. Name one of: ${Object.keys(KINDS).join(", ")}.\n`,
    );
    return 1;
  }

  const path = given ?? kind.report;
  const text = read(path);
  if (text === null) {
    err.write(kind.missing(path));
    return 1;
  }

  const measured = kind.measure(text);
  if (measured.weighed === 0) {
    err.write(kind.refusal(path));
    return 1;
  }
  out.write(`${path} ${measured.said}\n`);
  return 0;
};
