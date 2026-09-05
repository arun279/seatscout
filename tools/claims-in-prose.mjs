import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { exit, stderr, stdout } from "node:process";
import { CLAIMS, UNCHECKED } from "./claims-in-prose.pairs.mjs";

const RECORDS = "docs/adr";
const NARRATIVE = ["CONTEXT.md", "README.md"];
const DECLARED_IN = "tools/claims-in-prose.pairs.mjs";
const DECLARING = ["tools/claims-in-prose.mjs", DECLARED_IN];

const git = (...args) =>
  execFileSync("git", args, { encoding: "utf8", maxBuffer: Infinity });

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
      ...DECLARING.map((declaring) => `:!${declaring}`),
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
      `${adr} is neither paired with a search nor recorded as carrying no claim a search can hold; classify it in ${DECLARED_IN}`,
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
      `\nfollow it in ${DECLARED_IN}, where every pair is declared.\n`,
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
