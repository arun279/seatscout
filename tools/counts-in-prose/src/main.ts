import { agreement, type Claim, disagreements, refusal } from "./judge.ts";
import type { Read } from "./structures.ts";

export interface Writer {
  readonly write: (text: string) => void;
}

export const NOTHING =
  "Refusing a run that declares no pair. This check holds a sentence to a structure,\nso an empty table is a verdict over nothing.\n";

export const main = (
  claims: readonly Claim[],
  read: Read,
  out: Writer,
  err: Writer,
): number => {
  if (claims.length === 0) {
    err.write(NOTHING);
    return 1;
  }

  const found = disagreements(claims, read);
  if (found.length === 0) {
    out.write(agreement(claims));
    return 0;
  }
  err.write(refusal(found));
  return 1;
};
