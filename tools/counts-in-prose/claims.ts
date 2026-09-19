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
const ENTRY = "apps/web/src/index.ts";
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

const WORKSPACE = "pnpm-workspace.yaml";

const blockUnder = (read: Read, path: string, heading: string) => {
  const lines = read(path).split("\n");
  const rest = lines.slice(lines.indexOf(heading) + 1);
  return rest.slice(
    0,
    rest.findIndex((line) => /^\S/.test(line)) + 1 || rest.length,
  );
};

const overridden = (read: Read) =>
  blockUnder(read, WORKSPACE, "overrides:").filter((line) =>
    /^ {2}[\w@/.-]+:/.test(line),
  );

const hookCommands = (read: Read, hook: string) =>
  blockUnder(read, LEFTHOOK, `${hook}:`).filter((line) =>
    /^ {4}[a-z][\w:-]*:$/.test(line),
  );

const sheetsImported = (read: Read) =>
  [...read(ENTRY).matchAll(/^import "\.\/[\w-]+\.css";$/gm)].length;

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

const BOOKING = "docs/adr/0004-booking-ends-at-a-deep-link.md";
const GATES = "docs/adr/0006-gates-cite-a-standard-or-measure-a-regression.md";
const BOUNDARY = "docs/adr/0009-no-upstream-word-crosses-the-boundary.md";
const CONTEXT = "CONTEXT.md";
const CONTRIBUTING = "CONTRIBUTING.md";
const DRAWING = "docs/adr/0014-the-room-is-read-from-its-drawing.md";
const LAYERS = "docs/adr/0003-separate-view-layers-shared-core.md";
const NIGHTLY = "docs/adr/0011-a-nightly-reading-judges-the-world.md";
const PROFILE_RECORD =
  "docs/adr/0018-good-seats-are-scored-against-a-reference.md";
const SEARCH_RECORD = "docs/adr/0016-a-search-reports-its-coverage.md";

export const CLAIMS: readonly Claim[] = [
  {
    document: CONTRIBUTING,
    says: /The pre-commit hook runs (\w+) checks over staged files/,
    about: `the commands under pre-commit, in ${LEFTHOOK}`,
    count: (read) => hookCommands(read, "pre-commit").length,
  },
  {
    document: CONTRIBUTING,
    says: /`push-checks`, which runs (\w+) checks/,
    about: `the commands under push-checks, in ${LEFTHOOK}`,
    count: (read) => hookCommands(read, "push-checks").length,
  },
  {
    document: GATES,
    says: /passes over all (\w+) overrides in `pnpm-workspace\.yaml`/,
    about: `the entries under overrides, in ${WORKSPACE}`,
    count: (read) => overridden(read).length,
  },
  {
    document: CONTRIBUTING,
    says: /`apps\/web\/src\/index\.ts` imports all (\w+) in the order/,
    about: `the stylesheets imported by ${ENTRY}`,
    count: sheetsImported,
  },
  {
    document: CONTEXT,
    says: /The premium presentation type, one of (\w+):/,
    about: `the alternatives of Format, in ${CATALOGUE}`,
    count: (read) => alternativesOf(read, CATALOGUE, "Format").length,
  },
  {
    document: CONTEXT,
    says: /It is the (\w+) above, and it grows in a diff/,
    about: AMENITIES,
    count: (read) => alternativesOf(read, CATALOGUE, "Amenity").length,
  },
  {
    document: CONTEXT,
    says: /It penalises (\w+) things\./,
    about: PROFILE_WEIGHTS,
    count: (read) => weights(read).length,
  },
  {
    document: CONTEXT,
    says: /the heaviest weight of the (\w+) because the target is what the Profile is for/,
    about: PROFILE_WEIGHTS,
    count: (read) => weights(read).length,
  },
  {
    document: CONTEXT,
    says: /Then (\w+) lighter terms:/,
    about: `the weights of REFERENCE below its heaviest, in ${PROFILE}`,
    count: (read) => lighter(read).length,
  },
  {
    document: CONTEXT,
    says: /It answers one of (\w+) ways\./,
    about: `${UNVERIFIED}, and the arms of Verified that succeed`,
    count: (read) => answers(read).length + succeedingArmsOf(read, VERIFY),
  },
  {
    document: CONTEXT,
    says: /It is (\w+) outcomes and never one number\./,
    about: COVERAGE_OUTCOMES,
    count: (read) => outcomes(read).length,
  },
  {
    document: CONTEXT,
    says: /The (\w+) and the not-reached remainder add to the candidates/,
    about: COVERAGE_OUTCOMES,
    count: (read) => outcomes(read).length,
  },
  {
    document: CONTEXT,
    says: /in the same (\w+) bands a Seat Group is built from/,
    about: SEAT_GROUP_BANDS,
    count: (read) => bands(read).length,
  },
  {
    document: SEARCH_RECORD,
    says: /\*\*Coverage has (\w+) outcomes and its ledger closes in every snapshot\.\*\*/,
    about: COVERAGE_OUTCOMES,
    count: (read) => outcomes(read).length,
  },
  {
    document: PROFILE_RECORD,
    says: /(\w+) of its numbers are geometry/,
    about: `the modelled distances of SeatProfile, in ${PROFILE}`,
    count: (read) => distances(read).length,
  },
  {
    document: DRAWING,
    says: /divided by a Seat's width, lands in one of (\w+) bands/,
    about: SEAT_GROUP_BANDS,
    count: (read) => bands(read).length,
  },
  {
    document: BOUNDARY,
    says: /`UpstreamSeat` declares exactly the (\w+) fields/,
    about: `the fields of UpstreamSeat, in ${SEAT_MAP}`,
    count: (read) => fieldsOf(read, SEAT_MAP, "UpstreamSeat").length,
  },
  {
    document: BOUNDARY,
    says: /The (\w+) lists partition the rows the answer held/,
    about: `the fields of Catalogue, in ${CATALOGUE}`,
    count: (read) => fieldsOf(read, CATALOGUE, "Catalogue").length,
  },
  {
    document: BOOKING,
    says: /(\w+) reasons is the whole set, and neither carries a URL/,
    about: UNVERIFIED,
    count: (read) => answers(read).length,
  },
  {
    document: BOOKING,
    says: /Re-verification and its (\w+) ways of answering no\./,
    about: UNVERIFIED,
    count: (read) => answers(read).length,
  },
  {
    document: NIGHTLY,
    says: /(\w+) things are reported: a body that is not JSON/,
    about: `the kinds of Divergence, in ${CONTRACT}`,
    count: (read) =>
      fieldAlternativesOf(read, CONTRACT, "Divergence", "kind").length,
  },
  {
    document: LAYERS,
    says: /A ban on the ([\w ]+?) names would therefore have needed/,
    about: `the globals ${BIOME} denies under ${PACKAGES}`,
    count: (read) => deniedGlobalsOf(read, BIOME, PACKAGES).length,
  },
  {
    document: BOUNDARY,
    says: /Its (\w+) operations are domain questions rather than upstream routes/,
    about: `the fields of Source, in ${PORT}`,
    count: (read) => fieldsOf(read, PORT, "Source").length,
  },
  {
    document: BOUNDARY,
    says: /the table's (\w+) entries are each the name the Source itself states/,
    about: `the entries of CHAINS, in ${ADAPTER}`,
    count: (read) => translationsOf(read, ADAPTER, "CHAINS").length,
  },
];
