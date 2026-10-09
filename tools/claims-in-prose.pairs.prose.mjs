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
];
