import { type Section, table, verdict } from "./markdown.js";

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

export interface Side {
  readonly ref: string;
  readonly tree: Tree;
}

const SOURCE = /\.[cm]?[jt]sx?$/;
const PROSE = /\.mdx?$/;
const DATA = /\.(html|jsonc?|sh|toml|txt|webmanifest|ya?ml)$/;
const TEST = /(^|\/)tests?\/|\.(test|spec|fixtures)\./;
const APPLICATION = /^(apps|packages)\//;
const NOT_A_FILE = new Set(["header", "SUM"]);

type Bucket = "product" | "test" | "tooling" | "prose" | "data";
type Kind = keyof Counts;
type Volume = Counts & { readonly files: number };
type Split = Record<Bucket, { code: number; comment: number; files: number }>;
type Row = readonly [string, Bucket, Kind];

const AUTHORED: readonly Bucket[] = ["product", "test", "tooling"];
const EVERY: readonly Bucket[] = [...AUTHORED, "prose", "data"];

const COMMENT_REMEDY =
  "Either make the code say what the comment would have said, or raise the ratchet in this diff, where a reviewer sees it.";

const COUNTED_REMEDY =
  "A file leaves the measurement when its path stops matching how this report sorts it. Either put it back, or sort it in tools/footprint/src/volume.ts, where a reviewer sees which side of the count it landed on.";

const PROSE_NOTE =
  "Prose is reported and not gated. Explanation that leaves a comment and lands in\nmarkdown keeps the comment count flat, so the two are read together.";

const LABELS: Record<Bucket, string> = {
  product: "Product",
  test: "Test",
  tooling: "Tooling",
  prose: "Prose",
  data: "Data",
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

const bucketOf = (path: string): Bucket | null => {
  if (PROSE.test(path)) return "prose";
  if (DATA.test(path)) return "data";
  if (!SOURCE.test(path)) return null;
  if (TEST.test(path)) return "test";
  return APPLICATION.test(path) ? "product" : "tooling";
};

const unsorted = (tree: Tree): readonly string[] =>
  Object.keys(tree)
    .filter((path) => bucketOf(path) === null)
    .sort();

const split = (tree: Tree): Split => {
  const totals: Split = {
    product: { code: 0, comment: 0, files: 0 },
    test: { code: 0, comment: 0, files: 0 },
    tooling: { code: 0, comment: 0, files: 0 },
    prose: { code: 0, comment: 0, files: 0 },
    data: { code: 0, comment: 0, files: 0 },
  };
  for (const [path, counts] of Object.entries(tree)) {
    const sorted = bucketOf(path);
    if (sorted === null) continue;
    const bucket = totals[sorted];
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

const COUNTED =
  "Every file on both sides is sorted into one of these, and every bucket the merge base\nheld still holds a file. Holds.";

const uncounted = (
  base: Split,
  head: Split,
  strays: readonly string[],
): string | null => {
  if (strays.length > 0)
    return `${strays.length} file(s) match nothing this report sorts by, so their lines are in no column: ${strays.join(", ")}. ${COUNTED_REMEDY}`;
  if (authored(head).files === 0)
    return `Nothing under ${AUTHORED.join(", ")} was counted at all, so there is no measurement to report. ${COUNTED_REMEDY}`;
  const gone = emptied(base, head);
  if (gone.length === 0) return null;
  return `${gone.map((bucket) => LABELS[bucket]).join(", ")} held files at the merge base and holds none here. ${COUNTED_REMEDY}`;
};

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
    ...cellsFor(rowsFor(["prose", "data"])),
  ];
};

export const volume = (
  from: Side,
  to: Side,
  diff: Diff,
  commentRatchet: number,
): Section => {
  const base = split(from.tree);
  const head = split(to.tree);
  const withinRatchet = authored(head).comment <= commentRatchet;
  const missed = uncounted(base, head, [
    ...unsorted(from.tree),
    ...unsorted(to.tree),
  ]);
  const volumes = (label: string, totals: Split) => [
    label,
    String(authored(totals).code),
    String(authored(totals).comment),
    String(totals.prose.code),
  ];

  return {
    passed: withinRatchet && missed === null,
    lines: [
      "### Code footprint",
      "",
      `\`${from.ref.slice(0, 7)}\` to \`${to.ref.slice(0, 7)}\`, blank lines excluded.`,
      "",
      ...table(["Lines", "Added", "Removed", "Changed"], lineRows(diff)),
      "",
      "### Comment load",
      "",
      ...table(
        ["Source", "Code", "Comments", "Prose"],
        [volumes("Merge base", base), volumes("This branch", head)],
      ),
      "",
      `Comments may not exceed the ratchet in \`.footprint.json\`, which is ${commentRatchet}. ${verdict(withinRatchet, COMMENT_REMEDY)}`,
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
    ],
  };
};
