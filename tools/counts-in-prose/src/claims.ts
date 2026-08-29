import type { Claim } from "./judge.ts";
import {
  alternativesOf,
  bodyOf,
  fieldsOf,
  type Read,
  translationsOf,
} from "./structures.ts";

const BIOME = "biome.json";
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

const outcomes = (read: Read) =>
  fieldsOf(read, SEARCH, "Coverage").filter((field) => field !== "candidates");

const weights = (read: Read) =>
  fieldsOf(read, PROFILE, "SeatProfile").filter((field) =>
    field.endsWith("Weight"),
  );

const distances = (read: Read) =>
  fieldsOf(read, PROFILE, "SeatProfile").filter(
    (field) => !field.endsWith("Weight") && !field.startsWith("target"),
  );

const charges = (read: Read) =>
  [
    ...bodyOf(
      read,
      PROFILE,
      "const REFERENCE",
      /\bconst REFERENCE: SeatProfile = \{\n([\s\S]*?)\n\};/,
    ).matchAll(/(?<=^ {2}\w+Weight: )[^,]+(?=,$)/gm),
  ].map((charge) => {
    const weight = Number(charge[0]);
    if (Number.isNaN(weight))
      throw new Error(
        `REFERENCE in ${PROFILE} weights something by "${charge[0]}"`,
      );
    return weight;
  });

const lighter = (read: Read) => {
  const weighed = charges(read);
  return weighed.filter((charge) => charge < Math.max(...weighed));
};

const bands = (read: Read) => alternativesOf(read, GROUP, "Gap");

const answers = (read: Read) => alternativesOf(read, VERIFY, "Unverified");

const succeeding = (read: Read) => [
  ...read(VERIFY).matchAll(/^ {6}readonly ok: true;$/gm),
];

const divergences = (read: Read) => [
  ...bodyOf(
    read,
    CONTRACT,
    "the kind of a Divergence",
    /\binterface Divergence \{\n {2}readonly kind:([\s\S]*?);\n/,
  ).matchAll(/"[^"]*"/g),
];

const globals = (read: Read) => {
  const banning = JSON.parse(read(BIOME)).overrides.find(
    (override: {
      includes?: string[];
      linter?: { rules?: { style?: { noRestrictedGlobals?: unknown } } };
    }) =>
      override.includes?.some((path) => path.startsWith(`${PACKAGES}/`)) &&
      override.linter?.rules?.style?.noRestrictedGlobals,
  );
  if (banning === undefined)
    throw new Error(`${BIOME} denies no global under ${PACKAGES}`);
  return Object.keys(
    banning.linter.rules.style.noRestrictedGlobals.options.deniedGlobals,
  );
};

const AMENITIES = `the alternatives of Amenity, in ${CATALOGUE}`;
const COVERAGE_OUTCOMES = `every field of Coverage but candidates, in ${SEARCH}`;
const PROFILE_WEIGHTS = `the weights of SeatProfile, in ${PROFILE}`;
const SEAT_GROUP_BANDS = `the alternatives of Gap, in ${GROUP}`;
const UNVERIFIED = `the alternatives of Unverified, in ${VERIFY}`;

export const CLAIMS: readonly Claim[] = [
  {
    document: "CONTEXT.md",
    says: /It penalises (\w+) things\./,
    about: PROFILE_WEIGHTS,
    count: (read) => weights(read).length,
  },
  {
    document: "CONTEXT.md",
    says: /the heaviest weight of the (\w+) because the target is what the Profile is for/,
    about: PROFILE_WEIGHTS,
    count: (read) => weights(read).length,
  },
  {
    document: "CONTEXT.md",
    says: /Then (\w+) lighter terms:/,
    about: `the weights of REFERENCE below its heaviest, in ${PROFILE}`,
    count: (read) => lighter(read).length,
  },
  {
    document: "CONTEXT.md",
    says: /It answers one of (\w+) ways\./,
    about: `${UNVERIFIED}, and the arms of Verified that succeed`,
    count: (read) => answers(read).length + succeeding(read).length,
  },
  {
    document: "CONTEXT.md",
    says: /It is (\w+) outcomes and never one number\./,
    about: COVERAGE_OUTCOMES,
    count: (read) => outcomes(read).length,
  },
  {
    document: "CONTEXT.md",
    says: /The (\w+) and the not-reached remainder add to the candidates/,
    about: COVERAGE_OUTCOMES,
    count: (read) => outcomes(read).length,
  },
  {
    document: "CONTEXT.md",
    says: /in the same (\w+) bands a Seat Group is built from/,
    about: SEAT_GROUP_BANDS,
    count: (read) => bands(read).length,
  },
  {
    document: "CONTRIBUTING.md",
    says: /\*\*Coverage has (\w+) outcomes and its ledger closes in every snapshot\.\*\*/,
    about: COVERAGE_OUTCOMES,
    count: (read) => outcomes(read).length,
  },
  {
    document: "CONTRIBUTING.md",
    says: /so the (\w+) and the remainder add to `candidates`/,
    about: COVERAGE_OUTCOMES,
    count: (read) => outcomes(read).length,
  },
  {
    document: "CONTRIBUTING.md",
    says: /(\w+) of its numbers are geometry/,
    about: `the modelled distances of SeatProfile, in ${PROFILE}`,
    count: (read) => distances(read).length,
  },
  {
    document: "CONTRIBUTING.md",
    says: /divided by a Seat's width, lands in one of (\w+) bands/,
    about: SEAT_GROUP_BANDS,
    count: (read) => bands(read).length,
  },
  {
    document: "CONTRIBUTING.md",
    says: /`UpstreamSeat` declares exactly the (\w+) fields/,
    about: `the fields of UpstreamSeat, in ${SEAT_MAP}`,
    count: (read) => fieldsOf(read, SEAT_MAP, "UpstreamSeat").length,
  },
  {
    document: "CONTRIBUTING.md",
    says: /The (\w+) lists partition the rows the answer held/,
    about: `the fields of Catalogue, in ${CATALOGUE}`,
    count: (read) => fieldsOf(read, CATALOGUE, "Catalogue").length,
  },
  {
    document: "CONTRIBUTING.md",
    says: /(\w+) reasons is the whole set, and neither carries a URL/,
    about: UNVERIFIED,
    count: (read) => answers(read).length,
  },
  {
    document: "CONTRIBUTING.md",
    says: /Re-verification and its (\w+) ways of answering no\./,
    about: UNVERIFIED,
    count: (read) => answers(read).length,
  },
  {
    document: "CONTRIBUTING.md",
    says: /(\w+) things are reported: a body that is not JSON/,
    about: `the kinds of Divergence, in ${CONTRACT}`,
    count: (read) => divergences(read).length,
  },
  {
    document: "CONTRIBUTING.md",
    says: /A ban on the ([\w ]+?) names would therefore have needed/,
    about: `the globals ${BIOME} denies under ${PACKAGES}`,
    count: (read) => globals(read).length,
  },
  {
    document: "CONTRIBUTING.md",
    says: /Its (\w+) operations are domain questions rather than upstream routes/,
    about: `the fields of Source, in ${PORT}`,
    count: (read) => fieldsOf(read, PORT, "Source").length,
  },
  {
    document: "CONTEXT.md",
    says: /It is the (\w+) above, and it grows in a diff/,
    about: AMENITIES,
    count: (read) => alternativesOf(read, CATALOGUE, "Amenity").length,
  },
  {
    document: "CONTRIBUTING.md",
    says: /`Amenity` is a closed set of (\w+) read from those same labels/,
    about: AMENITIES,
    count: (read) => alternativesOf(read, CATALOGUE, "Amenity").length,
  },
  {
    document: "CONTRIBUTING.md",
    says: /the table's (\w+) entries are each the name the Source itself states/,
    about: `the entries of CHAINS, in ${ADAPTER}`,
    count: (read) => translationsOf(read, ADAPTER, "CHAINS").length,
  },
];
