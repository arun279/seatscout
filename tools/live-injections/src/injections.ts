export const namesIn = (source: string, call: string): readonly string[] =>
  [...source.matchAll(new RegExp(`(?<=${call}\\(")[A-Za-z]+`, "g"))].map(
    (found) => found[0],
  );

export interface Injection {
  readonly file: string;
  readonly name: string;
}

export const askedIn = (file: string, source: string): readonly Injection[] =>
  namesIn(source, "inject").map((name) => ({ file, name }));

export const unanswered = (
  provided: readonly string[],
  asked: readonly Injection[],
): readonly Injection[] => asked.filter(({ name }) => !provided.includes(name));

export const refusal = (
  setup: string,
  provided: readonly string[],
  missing: readonly Injection[],
): string =>
  `${setup} provides ${provided.join(", ")}, and the live suite asks for more:\n${missing
    .map(({ file, name }) => `  ${file} injects ${name}\n`)
    .join("")}`;

export const agreement = (setup: string, provided: readonly string[]): string =>
  `${setup} provides every value the live suite injects: ${provided.join(", ")}\n`;
