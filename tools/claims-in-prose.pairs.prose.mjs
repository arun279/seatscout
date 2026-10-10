export const PROSE_CLAIMS = [
  {
    adr: "0006-gates-cite-a-standard-or-measure-a-regression.md",
    says: /with one rule turned off: line length/,
    holds: "the one markdownlint default the prose is not held to",
    pattern: '"line-length": false',
    paths: [".markdownlint.jsonc"],
    files: 1,
  },
  {
    adr: "0006-gates-cite-a-standard-or-measure-a-regression.md",
    says: /with `--offline --include-fragments`/,
    holds: "the link check over the repository's own links",
    pattern: "lychee --offline --include-fragments",
    paths: ["package.json"],
    files: 1,
  },
  {
    adr: "0006-gates-cite-a-standard-or-measure-a-regression.md",
    says: /with three retries ten seconds apart/,
    holds: "the weekly web link check's retries",
    pattern: "--max-retries 3 --retry-wait-time 10",
    paths: [".github/workflows/links.yml"],
    files: 1,
  },
  {
    adr: "0006-gates-cite-a-standard-or-measure-a-regression.md",
    says: /two requests at a time to any one\s+host a second apart/,
    holds: "the weekly web link check's pace per host",
    pattern: "--host-concurrency 2 --host-request-interval 1s",
    paths: [".github/workflows/links.yml"],
    files: 1,
  },
];
