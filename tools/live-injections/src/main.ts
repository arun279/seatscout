import {
  agreement,
  askedIn,
  type Injection,
  namesIn,
  refusal,
  unanswered,
} from "./injections.ts";

export interface Writer {
  readonly write: (text: string) => void;
}

export type Read = (path: string) => Promise<string>;
export type List = (pattern: string) => Promise<readonly string[]>;

export const SETUP = "tools/live-answers.mjs";
export const TESTS = "{apps,packages,tools}/*/**/*.live.test.ts";

export const providesNothing = (setup: string): string =>
  `${setup} provides no value at all. This check compares what the setup provides with\nwhat the live suite injects, so an empty setup is a verdict over nothing.\n`;

export const matchesNothing = (pattern: string): string =>
  `${pattern} matches no live test. This check reads the injections out of the files it\nfinds, so an empty match is a verdict over nothing.\n`;

export const main = async (
  argv: readonly string[],
  read: Read,
  list: List,
  out: Writer,
  err: Writer,
): Promise<number> => {
  const [setup = SETUP, pattern = TESTS] = argv.slice(2);

  const provided = namesIn(await read(setup), "provide");
  if (provided.length === 0) {
    err.write(providesNothing(setup));
    return 1;
  }

  const files = [...(await list(pattern))].sort();
  if (files.length === 0) {
    err.write(matchesNothing(pattern));
    return 1;
  }

  const asked: Injection[] = [];
  for (const file of files) asked.push(...askedIn(file, await read(file)));

  const missing = unanswered(provided, asked);
  if (missing.length === 0) {
    out.write(agreement(setup, provided));
    return 0;
  }
  err.write(refusal(setup, provided, missing));
  return 1;
};
