import { readFileSync } from "node:fs";
import { exit, stderr, stdout } from "node:process";

const UNITS = `zero one two three four five six seven eight nine
  ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen`.split(
  /\s+/,
);

const TENS = "twenty thirty forty fifty sixty seventy eighty ninety".split(" ");

const NUMBERS = [
  ...UNITS,
  ...TENS.flatMap((ten) => [
    ten,
    ...UNITS.slice(1, 10).map((unit) => `${ten} ${unit}`),
  ]),
];

const BIOME = "biome.json";
const LEFTHOOK = "lefthook.yml";
const PACKAGES = "packages";
const ADAPTER = "packages/core/src/source/catalogue.ts";
const CATALOGUE = "packages/core/src/domain/catalogue.ts";
const CONTRACT = "packages/core/src/testing/contract.ts";
const GROUP = "packages/core/src/domain/seat-group.ts";
const PORT = "packages/core/src/source/port.ts";
const PROFILE = "packages/core/src/domain/seat-profile.ts";
const SEARCH = "packages/client/src/search.ts";
const SEAT_MAP = "packages/core/src/source/seat-map.ts";
const VERIFY = "packages/client/src/verify.ts";

const read = (path) => readFileSync(path, "utf8");

const bodyOf = (path, declaration, pattern) => {
  const match = pattern.exec(read(path));
  if (match === null) throw new Error(`${path} declares no ${declaration}`);
  return match[1];
};

const fieldsOf = (path, name) => {
  const body = bodyOf(
    path,
    `interface ${name}`,
    new RegExp(`\\binterface ${name} \\{\\n([\\s\\S]*?)\\n\\}`),
  );
  const fields = [...body.matchAll(/^ {2}(?:readonly )?([\w$]+)\??:/gm)];
  const members = [...body.matchAll(/^ {2}(?![)\]}])\S/gm)];
  if (fields.length !== members.length)
    throw new Error(
      `interface ${name} in ${path} declares a member spelled in a way this check cannot read`,
    );
  return fields.map((field) => field[1]);
};

const alternativesOf = (path, name) => {
  const body = bodyOf(
    path,
    `type ${name}`,
    new RegExp(`\\btype ${name} =([\\s\\S]*?);`),
  );
  if (/[{<]/.test(body))
    throw new Error(
      `type ${name} in ${path} is no longer a union of literals this check can count`,
    );
  return [...body.matchAll(/"[^"]*"|[\w$]+/g)].map(
    (alternative) => alternative[0],
  );
};

const translations = (path, name) => {
  const body = bodyOf(
    path,
    `const ${name}`,
    new RegExp(
      `\\bconst ${name}:[^=]*= new Map\\(\\[\\n([\\s\\S]*?)\\n\\]\\);`,
    ),
  );
  const entries = [...body.matchAll(/^ {2}\["[^"]*", "[^"]*"\],$/gm)];
  const members = [...body.matchAll(/^ {2}\S/gm)];
  if (entries.length !== members.length)
    throw new Error(
      `const ${name} in ${path} holds an entry spelled in a way this check cannot read`,
    );
  return entries;
};

const outcomes = () =>
  fieldsOf(SEARCH, "Coverage").filter((field) => field !== "candidates");

const weights = () =>
  fieldsOf(PROFILE, "SeatProfile").filter((field) => field.endsWith("Weight"));

const distances = () =>
  fieldsOf(PROFILE, "SeatProfile").filter(
    (field) => !field.endsWith("Weight") && !field.startsWith("target"),
  );

const charges = () =>
  [
    ...bodyOf(
      PROFILE,
      "const REFERENCE",
      /\bconst REFERENCE: SeatProfile = \{\n([\s\S]*?)\n\};/,
    ).matchAll(/^ {2}\w+Weight: ([^,]+),$/gm),
  ].map((charge) => {
    const weight = Number(charge[1]);
    if (Number.isNaN(weight))
      throw new Error(
        `REFERENCE in ${PROFILE} weights something by "${charge[1]}"`,
      );
    return weight;
  });

const lighter = () => {
  const weighted = charges();
  return weighted.filter((charge) => charge < Math.max(...weighted));
};

const bands = () => alternativesOf(GROUP, "Gap");

const formats = () => alternativesOf(CATALOGUE, "Format");

const answers = () => alternativesOf(VERIFY, "Unverified");

const succeeding = () => [
  ...read(VERIFY).matchAll(/^ {6}readonly ok: true;$/gm),
];

const divergences = () => [
  ...bodyOf(
    CONTRACT,
    "the kind of a Divergence",
    /\binterface Divergence \{\n {2}readonly kind:([\s\S]*?);\n/,
  ).matchAll(/"[^"]*"/g),
];

const globals = () => {
  const banning = JSON.parse(read(BIOME)).overrides.find(
    (override) =>
      override.includes?.some((path) => path.startsWith(`${PACKAGES}/`)) &&
      override.linter?.rules?.style?.noRestrictedGlobals,
  );
  if (banning === undefined)
    throw new Error(`${BIOME} denies no global under ${PACKAGES}`);
  return Object.keys(
    banning.linter.rules.style.noRestrictedGlobals.options.deniedGlobals,
  );
};

const hookCommands = (hook) => {
  const body = bodyOf(
    LEFTHOOK,
    `a ${hook} hook`,
    new RegExp(`^${hook}:\\n((?:[ \\t].*\\n?)*)`, "m"),
  );
  const commands = [...body.matchAll(/^ {4}([\w-]+):$/gm)];
  if (commands.length === 0)
    throw new Error(
      `${hook} in ${LEFTHOOK} declares no command this check can read`,
    );
  return commands.map((command) => command[1]);
};

const COVERAGE_OUTCOMES = `every field of Coverage but candidates, in ${SEARCH}`;
const PROFILE_WEIGHTS = `the weights of SeatProfile, in ${PROFILE}`;
const SEAT_GROUP_BANDS = `the alternatives of Gap, in ${GROUP}`;
const UNVERIFIED = `the alternatives of Unverified, in ${VERIFY}`;

const CLAIMS = [
  {
    document: "CONTRIBUTING.md",
    says: /The pre-commit hook runs (\w+) checks over staged files/,
    about: `the commands under pre-commit, in ${LEFTHOOK}`,
    count: () => hookCommands("pre-commit").length,
  },
  {
    document: "CONTRIBUTING.md",
    says: /The pre-push hook runs (\w+) over the whole workspace/,
    about: `the commands under pre-push, in ${LEFTHOOK}`,
    count: () => hookCommands("pre-push").length,
  },
  {
    document: "CONTEXT.md",
    says: /The premium presentation type, one of (\w+):/,
    about: `the alternatives of Format, in ${CATALOGUE}`,
    count: () => formats().length,
  },
  {
    document: "README.md",
    says: /It penalises (\w+) things\./,
    about: PROFILE_WEIGHTS,
    count: () => weights().length,
  },
  {
    document: "CONTEXT.md",
    says: /It penalises (\w+) things\./,
    about: PROFILE_WEIGHTS,
    count: () => weights().length,
  },
  {
    document: "CONTEXT.md",
    says: /the heaviest weight of the (\w+) because the target is what the Profile is for/,
    about: PROFILE_WEIGHTS,
    count: () => weights().length,
  },
  {
    document: "CONTEXT.md",
    says: /Then (\w+) lighter terms:/,
    about: `the weights of REFERENCE below its heaviest, in ${PROFILE}`,
    count: () => lighter().length,
  },
  {
    document: "CONTEXT.md",
    says: /It answers one of (\w+) ways\./,
    about: `${UNVERIFIED}, and the arms of Verified that succeed`,
    count: () => answers().length + succeeding().length,
  },
  {
    document: "CONTEXT.md",
    says: /It is (\w+) outcomes and never one number\./,
    about: COVERAGE_OUTCOMES,
    count: () => outcomes().length,
  },
  {
    document: "CONTEXT.md",
    says: /The (\w+) and the not-reached remainder add to the candidates/,
    about: COVERAGE_OUTCOMES,
    count: () => outcomes().length,
  },
  {
    document: "CONTEXT.md",
    says: /in the same (\w+) bands a Seat Group is built from/,
    about: SEAT_GROUP_BANDS,
    count: () => bands().length,
  },
  {
    document: "CONTRIBUTING.md",
    says: /\*\*Coverage has (\w+) outcomes and its ledger closes in every snapshot\.\*\*/,
    about: COVERAGE_OUTCOMES,
    count: () => outcomes().length,
  },
  {
    document: "CONTRIBUTING.md",
    says: /so the (\w+) and the remainder add to `candidates`/,
    about: COVERAGE_OUTCOMES,
    count: () => outcomes().length,
  },
  {
    document: "CONTRIBUTING.md",
    says: /(\w+) of its numbers are geometry/,
    about: `the modelled distances of SeatProfile, in ${PROFILE}`,
    count: () => distances().length,
  },
  {
    document: "CONTRIBUTING.md",
    says: /divided by a Seat's width, lands in one of (\w+) bands/,
    about: SEAT_GROUP_BANDS,
    count: () => bands().length,
  },
  {
    document: "CONTRIBUTING.md",
    says: /`UpstreamSeat` declares exactly the (\w+) fields/,
    about: `the fields of UpstreamSeat, in ${SEAT_MAP}`,
    count: () => fieldsOf(SEAT_MAP, "UpstreamSeat").length,
  },
  {
    document: "CONTRIBUTING.md",
    says: /The (\w+) lists partition the rows the answer held/,
    about: `the fields of Catalogue, in ${CATALOGUE}`,
    count: () => fieldsOf(CATALOGUE, "Catalogue").length,
  },
  {
    document: "CONTRIBUTING.md",
    says: /(\w+) reasons is the whole set, and neither carries a URL/,
    about: UNVERIFIED,
    count: () => answers().length,
  },
  {
    document: "CONTRIBUTING.md",
    says: /Re-verification and its (\w+) ways of answering no\./,
    about: UNVERIFIED,
    count: () => answers().length,
  },
  {
    document: "CONTRIBUTING.md",
    says: /(\w+) things are reported: a body that is not JSON/,
    about: `the kinds of Divergence, in ${CONTRACT}`,
    count: () => divergences().length,
  },
  {
    document: "CONTRIBUTING.md",
    says: /A ban on the ([\w ]+?) names would therefore have needed/,
    about: `the globals ${BIOME} denies under ${PACKAGES}`,
    count: () => globals().length,
  },
  {
    document: "CONTRIBUTING.md",
    says: /Its (\w+) operations are domain questions rather than upstream routes/,
    about: `the fields of Source, in ${PORT}`,
    count: () => fieldsOf(PORT, "Source").length,
  },
  {
    document: "CONTEXT.md",
    says: /It is the (\w+) above, and it grows in a diff/,
    about: `the alternatives of Amenity, in ${CATALOGUE}`,
    count: () => alternativesOf(CATALOGUE, "Amenity").length,
  },
  {
    document: "CONTRIBUTING.md",
    says: /`Amenity` is a closed set of (\w+) read from those same labels/,
    about: `the alternatives of Amenity, in ${CATALOGUE}`,
    count: () => alternativesOf(CATALOGUE, "Amenity").length,
  },
  {
    document: "CONTRIBUTING.md",
    says: /the table's (\w+) entries are each the name the Source itself states/,
    about: `the entries of CHAINS, in ${ADAPTER}`,
    count: () => translations(ADAPTER, "CHAINS").length,
  },
];

const sentenceIn = (claim) => {
  const document = read(claim.document).replace(/\s+/g, " ");
  const matches = [...document.matchAll(new RegExp(claim.says, "g"))];
  if (matches.length !== 1)
    throw new Error(
      `/${claim.says.source}/ matches ${matches.length} sentences, not one`,
    );
  return matches[0];
};

const disagreementIn = (claim) => {
  try {
    const [sentence, word] = sentenceIn(claim);
    const claimed = NUMBERS.indexOf(word.toLowerCase());
    if (claimed === -1)
      return `"${sentence}" spells a count this check cannot read`;
    const actual = claim.count();
    return claimed === actual
      ? null
      : `"${sentence}" counts ${claim.about}, and there are ${actual}`;
  } catch (refusal) {
    return refusal.message;
  }
};

const disagreements = CLAIMS.map((claim) => ({
  claim,
  disagreement: disagreementIn(claim),
})).filter((checked) => checked.disagreement !== null);

if (disagreements.length > 0) {
  stderr.write(
    `${disagreements.length} count(s) stated in prose could not be held to the structure they count:\n` +
      disagreements
        .map(
          ({ claim, disagreement }) => `  ${claim.document}: ${disagreement}\n`,
        )
        .join("") +
      "\nCorrect the sentence, or the structure. If a sentence has moved or been reworded," +
      "\nfollow it in tools/counts-in-prose.mjs, where every pair is declared.\n",
  );
  exit(1);
}
stdout.write(
  `Every count stated in prose matches the structure it counts, over ${CLAIMS.length} declared pairs:\n${[
    ...new Set(CLAIMS.map((claim) => `  ${claim.about}`)),
  ].join("\n")}\n`,
);
