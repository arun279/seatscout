const BUNDLES = ".size-limit.json";
const WORKFLOW = ".github/workflows/ci.yml";
const LABEL = ".github/workflows/bundle-label.yml";

export const BUNDLE_CLAIMS = [
  {
    adr: "0006-gates-cite-a-standard-or-measure-a-regression.md",
    says: /\*\*Bundle size is held to main, weighed in the same job\.\*\*/,
    holds: "the main side the measure job exports",
    pattern: '--main-tree "$RUNNER_TEMP/main"',
    paths: [WORKFLOW],
    files: 1,
  },
  {
    adr: "0006-gates-cite-a-standard-or-measure-a-regression.md",
    says: /unless\s+the pull request carries the `bundle-grows` label/,
    holds: "the label that accepts a bigger bundle",
    pattern: "grep -qx bundle-grows",
    paths: [WORKFLOW],
    files: 1,
  },
  {
    adr: "0006-gates-cite-a-standard-or-measure-a-regression.md",
    says: /waits for CI\s+on the pull request's head to finish/,
    holds: "the label workflow's wait for CI on the head",
    pattern: 'gh run watch "$run"',
    paths: [LABEL],
    files: 1,
  },
  {
    adr: "0006-gates-cite-a-standard-or-measure-a-regression.md",
    says: /added after `measure` failed, or removed after it passed/,
    holds: "the label changes that re-run measure",
    pattern: 'labeled/failure ] || [ "$ACTION/$conclusion" = unlabeled/success',
    paths: [LABEL],
    files: 1,
  },
  {
    adr: "0006-gates-cite-a-standard-or-measure-a-regression.md",
    says: /The glob covers every emitted script rather than an entry point/,
    holds: "the glob each bundle is weighed by",
    pattern: "dist/_expo/static/js/",
    paths: [BUNDLES],
    files: 1,
  },
];
