import type { Read } from "./structures.ts";

const UNITS = `zero one two three four five six seven eight nine
  ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen`.split(
  /\s+/,
);

const TENS = "twenty thirty forty fifty sixty seventy eighty ninety".split(" ");

export const NUMBERS = [
  ...UNITS,
  ...TENS.flatMap((ten) => [
    ten,
    ...UNITS.slice(1, 10).map((unit) => `${ten} ${unit}`),
  ]),
];

export interface Claim {
  readonly document: string;
  readonly says: RegExp;
  readonly about: string;
  readonly count: (read: Read) => number;
}

export interface Disagreement {
  readonly claim: Claim;
  readonly disagreement: string;
}

const sentenceIn = (claim: Claim, read: Read): RegExpMatchArray => {
  const document = read(claim.document).replace(/\s+/g, " ");
  const matches = [...document.matchAll(new RegExp(claim.says, "g"))];
  const [only, ...rest] = matches;
  if (only === undefined || rest.length > 0)
    throw new Error(
      `/${claim.says.source}/ matches ${matches.length} sentences, not one`,
    );
  return only;
};

const disagreementIn = (claim: Claim, read: Read): string | null => {
  try {
    const [sentence, word] = sentenceIn(claim, read);
    const claimed =
      word === undefined ? -1 : NUMBERS.indexOf(word.toLowerCase());
    if (claimed === -1)
      return `"${sentence}" spells a count this check cannot read`;
    const actual = claim.count(read);
    return claimed === actual
      ? null
      : `"${sentence}" counts ${claim.about}, and there are ${actual}`;
  } catch (refusal) {
    return refusal instanceof Error ? refusal.message : String(refusal);
  }
};

export const disagreements = (
  claims: readonly Claim[],
  read: Read,
): readonly Disagreement[] =>
  claims
    .map((claim) => ({ claim, disagreement: disagreementIn(claim, read) }))
    .filter(
      (checked): checked is Disagreement => checked.disagreement !== null,
    );

export const refusal = (found: readonly Disagreement[]): string =>
  `${found.length} count(s) stated in prose could not be held to the structure they count:\n${found
    .map(({ claim, disagreement }) => `  ${claim.document}: ${disagreement}\n`)
    .join(
      "",
    )}\nCorrect the sentence, or the structure. If a sentence has moved or been reworded,\nfollow it in tools/counts-in-prose/src/claims.ts, where every pair is declared.\n`;

export const agreement = (claims: readonly Claim[]): string =>
  `Every count stated in prose matches the structure it counts, over ${claims.length} declared pairs:\n${[
    ...new Set(claims.map((claim) => `  ${claim.about}`)),
  ].join("\n")}\n`;
