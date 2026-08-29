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

export interface Side {
  readonly ref: string;
  readonly tree: Tree;
}

export interface Measurement {
  readonly base: Side;
  readonly head: Side;
  readonly diff: Diff;
  readonly bundles: readonly Bundle[];
  readonly commentRatchet: number;
}

export interface Report {
  readonly markdown: string;
  readonly passed: boolean;
}

const SOURCE = /\.[cm]?[jt]sx?$/;
const PROSE = /\.mdx?$/;
const TEST = /(^|\/)tests?\/|\.(test|spec)\./;
const APPLICATION = /^(apps|packages)\//;
const NOT_A_FILE = new Set(["header", "SUM"]);

type Bucket = "product" | "test" | "tooling" | "prose" | "other";
type Kind = keyof Counts;
type Volume = Counts & { readonly files: number };
type Split = Record<Bucket, { code: number; comment: number; files: number }>;
type Row = readonly [string, Bucket, Kind];

const AUTHORED: readonly Bucket[] = ["product", "test", "tooling"];
const EVERY: readonly Bucket[] = [...AUTHORED, "prose", "other"];

const COMMENT_REMEDY =
  "Either make the code say what the comment would have said, or raise the ratchet in this diff, where a reviewer sees it.";

const COUNTED_REMEDY =
  "A bucket empties when a path stops matching how this report sorts it. Either put the files back, or teach bucketOf the new layout in tools/footprint/src/report.ts.";

const BUNDLE_REMEDY =
  "Either make the bundle smaller, or raise the ratchet in this diff, where a reviewer sees it.";

const PROSE_NOTE =
  "Prose is reported and not gated. Explanation that leaves a comment and lands in\nmarkdown keeps the comment count flat, so the two are read together.";

const LABELS: Record<Bucket, string> = {
  product: "Product",
  test: "Test",
  tooling: "Tooling",
  prose: "Prose",
  other: "Other",
};

const rowsFor = (buckets: readonly Bucket[]): readonly Row[] =>
  buckets.flatMap((bucket): readonly Row[] => [
    [`${LABELS[bucket]} code`, bucket, "code"],
    [`${LABELS[bucket]} comments`, bucket, "comment"],
  ]);

export const filesOf = <T>(
  report: Readonly<Record<string, T>>,
): Readonly<Record<string, T>> =>
  Object.fromEntries(
    Object.entries(report).filter(([key]) => !NOT_A_FILE.has(key)),
  );

const bucketOf = (path: string): Bucket => {
  if (PROSE.test(path)) return "prose";
  if (!SOURCE.test(path)) return "other";
  if (TEST.test(path)) return "test";
  return APPLICATION.test(path) ? "product" : "tooling";
};

const split = (tree: Tree): Split => {
  const totals: Split = {
    product: { code: 0, comment: 0, files: 0 },
    test: { code: 0, comment: 0, files: 0 },
    tooling: { code: 0, comment: 0, files: 0 },
    prose: { code: 0, comment: 0, files: 0 },
    other: { code: 0, comment: 0, files: 0 },
  };
  for (const [path, counts] of Object.entries(tree)) {
    const bucket = totals[bucketOf(path)];
    bucket.code += counts.code;
    bucket.comment += counts.comment;
    bucket.files += 1;
  }
  return totals;
};

const authored = (totals: Split): Volume => {
  const sum = (kind: keyof Volume) =>
    AUTHORED.reduce((total, bucket) => total + totals[bucket][kind], 0);
  return { code: sum("code"), comment: sum("comment"), files: sum("files") };
};

const emptied = (base: Split, head: Split): readonly Bucket[] =>
  AUTHORED.filter(
    (bucket) => base[bucket].files > 0 && head[bucket].files === 0,
  );

const COUNTED = "Every bucket the merge base held still holds a file. Holds.";

const uncounted = (base: Split, head: Split): string | null => {
  if (authored(head).files === 0)
    return `Nothing under ${AUTHORED.join(", ")} was counted at all, so there is no measurement to report. ${COUNTED_REMEDY}`;
  const gone = emptied(base, head);
  if (gone.length === 0) return null;
  return `${gone.map((bucket) => LABELS[bucket]).join(", ")} held files at the merge base and holds none here. ${COUNTED_REMEDY}`;
};

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
  const authoredTotal = columns.map((column) => {
    const total = authored(column);
    return String(total.code + total.comment);
  });
  return [
    ...cellsFor(rowsFor(AUTHORED)),
    ["Authored total", ...authoredTotal],
    ...cellsFor(rowsFor(["prose", "other"])),
  ];
};

export const render = (measurement: Measurement): Report => {
  const base = split(measurement.base.tree);
  const head = split(measurement.head.tree);
  const withinCommentRatchet =
    authored(head).comment <= measurement.commentRatchet;
  const missed = uncounted(base, head);
  const withinRatchet = measurement.bundles.every((bundle) => bundle.passed);
  const verdict = (within: boolean, remedy: string) =>
    within ? "Within it." : `Above it. ${remedy}`;
  const volumes = (label: string, totals: Split) => [
    label,
    String(authored(totals).code),
    String(authored(totals).comment),
    String(totals.prose.code),
  ];

  return {
    passed: withinCommentRatchet && missed === null && withinRatchet,
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
        ["Source", "Code", "Comments", "Prose"],
        [volumes("Merge base", base), volumes("This branch", head)],
      ),
      "",
      `Comments may not exceed the ratchet in \`.footprint.json\`, which is ${measurement.commentRatchet}. ${verdict(withinCommentRatchet, COMMENT_REMEDY)}`,
      "",
      PROSE_NOTE,
      "",
      "### What was counted",
      "",
      ...table(
        ["Files", "Merge base", "This branch"],
        EVERY.map((bucket) => [
          LABELS[bucket],
          String(base[bucket].files),
          String(head[bucket].files),
        ]),
      ),
      "",
      missed === null ? COUNTED : missed,
      "",
      "### Bundle size",
      "",
      "Brotli, summed per file, over every script an application's own bundler",
      "emits, with the workspace packages it reaches inlined. Every emitted chunk",
      "counts, including one no page has loaded, so this is what a build publishes",
      "rather than what a page weighs.",
      "",
      ...table(
        ["Bundle", "Brotli", "Ratchet"],
        measurement.bundles.map((bundle) => [
          bundle.name,
          `${bundle.size} B`,
          `${bundle.sizeLimit} B`,
        ]),
      ),
      "",
      `Bundle size may not exceed the ratchet in \`.size-limit.json\`. ${verdict(withinRatchet, BUNDLE_REMEDY)}`,
      "",
    ].join("\n"),
  };
};
