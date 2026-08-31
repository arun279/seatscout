import { reaching, refusal, tracked } from "./reach.ts";

export interface Writer {
  readonly write: (text: string) => void;
}

export const APPS = "apps";

export const NOTHING =
  "Refusing a run over a pathspec that matches no tracked file. This check reads the\nindex, so an empty pathspec is a verdict over a tree nobody looked at.\n";

export type Git = (args: readonly string[]) => string;

export const main = (
  argv: readonly string[],
  git: Git,
  err: Writer,
): number => {
  const [pathspec = APPS] = argv.slice(2);
  const paths = tracked(git(["ls-files", "--", pathspec]));
  if (paths.length === 0) {
    err.write(NOTHING);
    return 1;
  }

  const offenders = reaching(paths, (path) => git(["show", `:${path}`]));
  if (offenders.length === 0) return 0;
  err.write(refusal(offenders));
  return 1;
};
