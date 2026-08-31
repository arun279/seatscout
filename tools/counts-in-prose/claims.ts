import type { Claim } from "./src/judge.ts";
import {
  alternativesOf,
  deniedGlobalsOf,
  fieldAlternativesOf,
  fieldsOf,
  type Read,
  succeedingArmsOf,
  translationsOf,
  weightsOf,
} from "./src/structures.ts";

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

const hookCommands = (read: Read, hook: string) => {
  const lines = read(LEFTHOOK).split("\n");
  const start = lines.indexOf(`${hook}:`);
  const rest = lines.slice(start + 1);
  const under = rest.slice(
    0,
    rest.findIndex((line) => /^\S/.test(line)) + 1 || rest.length,
  );
  return under.filter((line) => /^ {4}[a-z][\w:-]*:$/.test(line));
};

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

const lighter = (read: Read) => {
  const weighed = weightsOf(read, PROFILE, "REFERENCE");
  return weighed.filter((charge) => charge < Math.max(...weighed));
};

const bands = (read: Read) => alternativesOf(read, GROUP, "Gap");

const answers = (read: Read) => alternativesOf(read, VERIFY, "Unverified");

const AMENITIES = `the alternatives of Amenity, in ${CATALOGUE}`;
const COVERAGE_OUTCOMES = `every field of Coverage but candidates, in ${SEARCH}`;
const PROFILE_WEIGHTS = `the weights of SeatProfile, in ${PROFILE}`;
const SEAT_GROUP_BANDS = `the alternatives of Gap, in ${GROUP}`;
const UNVERIFIED = `the alternatives of Unverified, in ${VERIFY}`;

export const CLAIMS: readonly Claim[] = [
  {
    document: "CONTRIBUTING.md",
    says: /The pre-commit hook runs (\w+) checks over staged files/,
    about: `the commands under pre-commit, in ${LEFTHOOK}`,
    count: (read) => hookCommands(read, "pre-commit").length,
  },
  {
    document: "CONTRIBUTING.md",
    says: /The pre-push hook runs (\w+) over the whole workspace/,
    about: `the commands under pre-push, in ${LEFTHOOK}`,
    count: (read) => hookCommands(read, "pre-push").length,
  },
  {
    document: "CONTEXT.md",
    says: /The premium presentation type, one of (\w+):/,
    about: `the alternatives of Format, in ${CATALOGUE}`,
    count: (read) => alternativesOf(read, CATALOGUE, "Format").length,
  },
  {
    document: "CONTEXT.md",
    says: /It is the (\w+) above, and it grows in a diff/,
    about: `the alternatives of Amenity, in ${CATALOGUE}`,
    count: (read) => alternativesOf(read, CATALOGUE, "Amenity").length,
  },
  {
    document: "CONTRIBUTING.md",
    says: /`Amenity` is a closed set of (\w+) read from those same labels/,
    about: `the alternatives of Amenity, in ${CATALOGUE}`,
    count: (read) => alternativesOf(read, CATALOGUE, "Amenity").length,
  },
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
    count: (read) => answers(read).length + succeedingArmsOf(read, VERIFY),
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
    count: (read) =>
      fieldAlternativesOf(read, CONTRACT, "Divergence", "kind").length,
  },
  {
    document: "CONTRIBUTING.md",
    says: /A ban on the ([\w ]+?) names would therefore have needed/,
    about: `the globals ${BIOME} denies under ${PACKAGES}`,
    count: (read) => deniedGlobalsOf(read, BIOME, PACKAGES).length,
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
