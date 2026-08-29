export interface Counts {
  readonly code: number;
  readonly comment: number;
}

export type Tree = Readonly<Record<string, Counts>>;

export interface Diff {
  readonly added: Tree;
  readonly removed: Tree;
  readonly modified: Tree;
}

export interface Bundle {
  readonly name: string;
  readonly size: number;
  readonly sizeLimit: number;
  readonly passed: boolean;
}

export type Complexity = Readonly<Record<string, number>>;

export interface CountedLanguage {
  readonly Files: readonly {
    readonly Location: string;
    readonly Complexity: number;
  }[];
}

export interface Side {
  readonly ref: string;
  readonly tree: Tree;
  readonly complexity: Complexity;
}

export interface Measurement {
  readonly base: Side;
  readonly head: Side;
  readonly diff: Diff;
  readonly bundles: readonly Bundle[];
}

export interface Report {
  readonly markdown: string;
  readonly passed: boolean;
}

const SOURCE = /\.[cm]?[jt]sx?$/;
const TEST = /(^|\/)tests?\/|\.(test|spec)\./;
const APPLICATION = /^(apps|packages)\//;
const NOT_A_FILE = new Set(["header", "SUM"]);

type Bucket = "product" | "test" | "tooling" | "other";
type Kind = keyof Counts;
type Split = Record<Bucket, Record<Kind, number>>;
type Row = readonly [string, Bucket, Kind];

const AUTHORED: readonly Bucket[] = ["product", "test", "tooling"];

const COMMENT_REMEDY =
  "Either make the code say what the comment would have said, or raise the baseline by a reviewed change to ADR 6.";

const BUNDLE_REMEDY =
  "Either make the bundle smaller, or raise the ratchet in this diff, where a reviewer sees it.";

const LABELS: Record<Bucket, string> = {
  product: "Product",
  test: "Test",
  tooling: "Tooling",
  other: "Other",
};

const rowsFor = (buckets: readonly Bucket[]): readonly Row[] =>
  buckets.flatMap((bucket): readonly Row[] => [
    [`${LABELS[bucket]} code`, bucket, "code"],
    [`${LABELS[bucket]} comments`, bucket, "comment"],
  ]);

export const branchesOf = (languages: readonly CountedLanguage[]): Complexity =>
  Object.fromEntries(
    languages.flatMap((language) =>
      language.Files.map((file) => [file.Location, file.Complexity]),
    ),
  );

export const filesOf = <T>(
  report: Readonly<Record<string, T>>,
): Readonly<Record<string, T>> =>
  Object.fromEntries(
    Object.entries(report).filter(([key]) => !NOT_A_FILE.has(key)),
  );

const bucketOf = (path: string): Bucket => {
  if (!SOURCE.test(path)) return "other";
  if (TEST.test(path)) return "test";
  return APPLICATION.test(path) ? "product" : "tooling";
};

const split = (tree: Tree): Split => {
  const totals: Split = {
    product: { code: 0, comment: 0 },
    test: { code: 0, comment: 0 },
    tooling: { code: 0, comment: 0 },
    other: { code: 0, comment: 0 },
  };
  for (const [path, counts] of Object.entries(tree)) {
    const bucket = totals[bucketOf(path)];
    bucket.code += counts.code;
    bucket.comment += counts.comment;
  }
  return totals;
};

const authored = (tree: Tree): Counts => {
  const totals = split(tree);
  const sum = (kind: Kind) =>
    AUTHORED.reduce((total, bucket) => total + totals[bucket][kind], 0);
  return { code: sum("code"), comment: sum("comment") };
};

const branchesBy = (complexity: Complexity): Record<Bucket, number> => {
  const totals: Record<Bucket, number> = {
    product: 0,
    test: 0,
    tooling: 0,
    other: 0,
  };
  for (const [path, branches] of Object.entries(complexity)) {
    totals[bucketOf(path)] += branches;
  }
  return totals;
};

const signed = (change: number): string =>
  change > 0 ? `+${change}` : String(change);

const branchRows = (
  base: Complexity,
  head: Complexity,
): readonly (readonly string[])[] => {
  const was = branchesBy(base);
  const now = branchesBy(head);
  const row = (label: string, from: number, to: number) => [
    label,
    String(from),
    String(to),
    signed(to - from),
  ];
  const total = (totals: Record<Bucket, number>) =>
    AUTHORED.reduce((sum, bucket) => sum + totals[bucket], 0);
  return [
    ...AUTHORED.map((bucket) => row(LABELS[bucket], was[bucket], now[bucket])),
    row("Authored total", total(was), total(now)),
  ];
};

const perHundred = (counts: Counts): string =>
  (counts.code === 0 ? 0 : (counts.comment / counts.code) * 100).toFixed(2);

const table = (
  headings: readonly string[],
  rows: readonly (readonly string[])[],
): readonly string[] => [
  `| ${headings.join(" | ")} |`,
  `| ${headings.map((_, index) => (index === 0 ? "---" : "---:")).join(" | ")} |`,
  ...rows.map((row) => `| ${row.join(" | ")} |`),
];

const lineRows = (diff: Diff): readonly (readonly string[])[] => {
  const columns = [
    split(diff.added),
    split(diff.removed),
    split(diff.modified),
  ];
  const cellsFor = (rows: readonly Row[]) =>
    rows.map(([label, bucket, kind]) => [
      label,
      ...columns.map((column) => String(column[bucket][kind])),
    ]);
  const authoredTotal = columns.map((column) =>
    String(
      AUTHORED.reduce(
        (total, bucket) => total + column[bucket].code + column[bucket].comment,
        0,
      ),
    ),
  );
  return [
    ...cellsFor(rowsFor(AUTHORED)),
    ["Authored total", ...authoredTotal],
    ...cellsFor(rowsFor(["other"])),
  ];
};

export const render = (measurement: Measurement): Report => {
  const base = authored(measurement.base.tree);
  const head = authored(measurement.head.tree);
  const withinCommentLoad =
    head.comment * base.code <= base.comment * head.code;
  const withinRatchet = measurement.bundles.every((bundle) => bundle.passed);
  const verdict = (within: boolean, remedy: string) =>
    within ? "Within it." : `Above it. ${remedy}`;

  return {
    passed: withinCommentLoad && withinRatchet,
    markdown: [
      "### Code footprint",
      "",
      `\`${measurement.base.ref.slice(0, 7)}\` to \`${measurement.head.ref.slice(0, 7)}\`, blank lines excluded.`,
      "",
      ...table(
        ["Lines", "Added", "Removed", "Changed"],
        lineRows(measurement.diff),
      ),
      "",
      "### Comment load",
      "",
      ...table(
        ["Source", "Code", "Comments", "Per 100 lines"],
        [
          [
            "Merge base",
            String(base.code),
            String(base.comment),
            perHundred(base),
          ],
          [
            "This branch",
            String(head.code),
            String(head.comment),
            perHundred(head),
          ],
        ],
      ),
      "",
      `Comment load may not exceed the merge base. ${verdict(withinCommentLoad, COMMENT_REMEDY)}`,
      "",
      "### Cyclomatic complexity",
      "",
      "scc's estimate: branch and loop keywords counted per file rather than",
      "measured from a syntax tree. Reported, never gated. What fails a build is",
      "Biome's cognitive complexity rule at its documented limit of 15.",
      "",
      ...table(
        ["Source", "Merge base", "This branch", "Change"],
        branchRows(measurement.base.complexity, measurement.head.complexity),
      ),
      "",
      "### Bundle size",
      "",
      "Brotli, summed per file, over every script the application's own bundler",
      "emits. Workspace dependencies are inlined, so the shared packages are",
      "counted where a browser would receive them.",
      "",
      ...table(
        ["Bundle", "Brotli", "Ratchet", "Headroom"],
        measurement.bundles.map((bundle) => [
          bundle.name,
          `${bundle.size} B`,
          `${bundle.sizeLimit} B`,
          `${bundle.sizeLimit - bundle.size} B`,
        ]),
      ),
      "",
      `Bundle size may not exceed the ratchet in \`.size-limit.json\`. ${verdict(withinRatchet, BUNDLE_REMEDY)}`,
      "",
    ].join("\n"),
  };
};
