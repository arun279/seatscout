import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { exit, stderr, stdout } from "node:process";

const RECORDS = "docs/adr";
const NARRATIVE = ["CONTEXT.md", "README.md"];
const BIOME = "biome.json";
const CORE = "packages/core";
const PRODUCT = ["packages", ":!*.test.ts"];
const RATCHET = ".size-limit.json";
const RELEASE = "tools/release-plan/src/index.ts";
const STRYKER = "stryker.config.json";

const git = (...args) =>
  execFileSync("git", args, { encoding: "utf8", maxBuffer: Infinity });

const DECLARING = "tools/claims-in-prose.mjs";

const filesHolding = (pattern, paths) => {
  try {
    return git(
      "grep",
      "-I",
      "-l",
      "-F",
      "-i",
      "-e",
      pattern,
      "--",
      ...paths,
      `:!${DECLARING}`,
    )
      .split("\n")
      .filter(Boolean);
  } catch (refusal) {
    if (refusal.status === 1) return [];
    throw new Error(
      `git grep refused: ${refusal.stderr?.trim() ?? refusal.status}`,
    );
  }
};

const CLAIMS = [
  {
    adr: "0001-single-aggregating-source.md",
    says: /The one chain with a public catalogue API is the second implementation whenever it is built\./,
    holds: "modules that build a Source, tests aside",
    pattern: "): Source =>",
    paths: PRODUCT,
    files: 1,
  },
  {
    adr: "0004-booking-ends-at-a-deep-link.md",
    says: /A result carries the showtime without its ticketing URL/,
    holds: "the result view that drops the ticketing URL",
    pattern: 'Omit<Showtime, "ticketing">',
    paths: ["packages/client/src/ranking.ts"],
    files: 1,
  },
  {
    adr: "0005-build-numbers-come-from-the-run-counter.md",
    says: /No release workflow exists yet/,
    holds: "workflow files naming the release resolver",
    pattern: "release-plan",
    paths: [".github"],
    files: 0,
    witness: ["tools/release-plan"],
  },
  {
    adr: "0001-single-aggregating-source.md",
    says: /Ship a single implementation of it: the aggregator\./,
    holds: "modules that build a Source, tests aside",
    pattern: "): Source =>",
    paths: PRODUCT,
    files: 1,
  },
  {
    adr: "0002-computation-on-the-client.md",
    says: /Three files under `packages\/core` name the proxy's own header constants/,
    holds: "files under packages/core naming the proxy's header dialect",
    pattern: "x-upstream",
    paths: [CORE],
    files: 3,
  },
  {
    adr: "0002-computation-on-the-client.md",
    says: /forwards the request upstream with the caller's own session cookies/,
    holds: "the header allowlist the proxy forwards",
    pattern: 'const FORWARDED = ["accept", "content-type", "user-agent"]',
    paths: ["apps/proxy/src/index.ts"],
    files: 1,
  },
  {
    adr: "0003-separate-view-layers-shared-core.md",
    says: /That constraint is enforced by dependency rules in the build, not by convention\./,
    holds: "the import ban the build declares over Core",
    pattern: "noRestrictedImports",
    paths: [BIOME],
    files: 1,
  },
  {
    adr: "0003-separate-view-layers-shared-core.md",
    says: /`core` and `client` are shared without modification\./,
    holds: "files under apps naming Core's package directly",
    pattern: "@seatscout/core",
    paths: ["apps"],
    files: 0,
    witness: ["packages/client"],
  },
  {
    adr: "0005-build-numbers-come-from-the-run-counter.md",
    says: /A hundred attempts leaves room for 21000000 runs, and the two together land on Google Play's ceiling exactly\./,
    holds: "the ceiling the resolver refuses past",
    pattern: "2_100_000_000",
    paths: [RELEASE],
    files: 1,
  },
  {
    adr: "0005-build-numbers-come-from-the-run-counter.md",
    says: /so the resolver imposes its own and refuses anything past it/,
    holds: "the bound the resolver imposes on re-run attempts",
    pattern: "ATTEMPTS_PER_RUN = 100",
    paths: [RELEASE],
    files: 1,
  },
  {
    adr: "0006-gates-cite-a-standard-or-measure-a-regression.md",
    says: /by Biome's \[`noExcessiveCognitiveComplexity`\]/,
    holds: "the complexity rule that gates the build",
    pattern: "noExcessiveCognitiveComplexity",
    paths: [BIOME],
    files: 1,
  },
  {
    adr: "0006-gates-cite-a-standard-or-measure-a-regression.md",
    says: /\*\*Cyclomatic complexity is not measured\.\*\*/,
    holds: "the toolchain naming the counter that reported it",
    pattern: "scc",
    paths: ["package.json", ".github", "tools"],
    files: 0,
    witness: [RECORDS],
  },
  {
    adr: "0006-gates-cite-a-standard-or-measure-a-regression.md",
    says: /The mutation run measures it directly and breaks below 100 per cent\./,
    holds: "the mutation gate's breaking threshold",
    pattern: '"break": 100',
    paths: [STRYKER],
    files: 1,
  },
  {
    adr: "0006-gates-cite-a-standard-or-measure-a-regression.md",
    says: /\*\*Bundle size\*\* is a ratchet recorded in `\.size-limit\.json`/,
    holds: "the ratchet a reviewer last accepted",
    pattern: '"limit"',
    paths: [RATCHET],
    files: 1,
  },
  {
    adr: "0006-gates-cite-a-standard-or-measure-a-regression.md",
    says: /The glob covers every emitted script rather than an entry point/,
    holds: "the glob the ratchet weighs",
    pattern: "dist/**/*.js",
    paths: [RATCHET],
    files: 1,
  },
];

const UNCHECKED = {
  "CONTEXT.md":
    "it is the domain glossary, and the sets and counts it states are held term by term " +
    "by tools/counts-in-prose.mjs, which is the right instrument for a count",
  "README.md":
    "it describes the product to a reader, and the one thing in it a command can hold, " +
    "what the Reference profile penalises, is a count and is held by " +
    "tools/counts-in-prose.mjs",
};

const documents = () => [
  ...git("ls-files", "--", `${RECORDS}/*.md`)
    .split("\n")
    .filter(Boolean)
    .map((path) => path.slice(RECORDS.length + 1)),
  ...NARRATIVE,
];

const pathOf = (document) =>
  NARRATIVE.includes(document) ? document : `${RECORDS}/${document}`;

const sentenceIn = (claim) => {
  const document = readFileSync(pathOf(claim.adr), "utf8").replace(/\s+/g, " ");
  const matches = [...document.matchAll(new RegExp(claim.says, "g"))];
  if (matches.length !== 1)
    throw new Error(
      `/${claim.says.source}/ matches ${matches.length} sentences, not one`,
    );
};

const disagreementIn = (claim) => {
  try {
    sentenceIn(claim);
    const held = filesHolding(claim.pattern, claim.paths);
    if (held.length !== claim.files)
      return `says ${claim.files} for ${claim.holds}, and the tree has ${held.length}${
        held.length > 0 ? ` (${held.join(", ")})` : ""
      }`;
    if (
      claim.files === 0 &&
      filesHolding(claim.pattern, claim.witness).length === 0
    )
      return `"${claim.pattern}" is found nowhere under ${claim.witness.join(", ")} either, so the search that reported ${claim.holds} proves nothing`;
    return null;
  } catch (refusal) {
    return refusal.message;
  }
};

const structural = [];
if (CLAIMS.length === 0)
  structural.push("no claims are declared, so this check would verify nothing");
for (const claim of CLAIMS)
  if (claim.files === 0 && (claim.witness ?? []).length === 0)
    structural.push(
      `${claim.adr}: a claim expecting no match declares nowhere the pattern "${claim.pattern}" must still be found, so it cannot show its own search reaches anything`,
    );

const classified = new Set([
  ...CLAIMS.map((claim) => claim.adr),
  ...Object.keys(UNCHECKED),
]);
for (const adr of documents())
  if (!classified.has(adr))
    structural.push(
      `${adr} is neither paired with a search nor recorded as carrying no claim a search can hold; classify it in tools/claims-in-prose.mjs`,
    );
for (const adr of classified)
  if (!documents().includes(adr))
    structural.push(
      `${adr} is classified here and is not a record this check reads`,
    );

const disagreements = structural.length
  ? structural
  : CLAIMS.map((claim) => {
      const disagreement = disagreementIn(claim);
      return disagreement === null ? null : `${claim.adr}: ${disagreement}`;
    }).filter(Boolean);

if (disagreements.length > 0) {
  stderr.write(
    `${disagreements.length} claim(s) about this repository could not be held to it:\n` +
      disagreements.map((disagreement) => `  ${disagreement}\n`).join("") +
      "\nCorrect the decision, or correct the repository. If a sentence has been reworded," +
      "\nfollow it in tools/claims-in-prose.mjs, where every pair is declared.\n",
  );
  exit(1);
}
stdout.write(
  `Every claim this repository's own documents make about it holds, over ${CLAIMS.length} declared pairs across ${
    new Set(CLAIMS.map((claim) => claim.adr)).size
  } of the ${documents().length} records:\n${[
    ...new Set(CLAIMS.map((claim) => `  ${claim.holds}`)),
  ].join("\n")}\n`,
);
