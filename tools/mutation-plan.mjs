import { spawnSync } from "node:child_process";
import { globSync, readFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { Instrumenter } from "@stryker-mutator/instrumenter";
import { exactRanges, within } from "./stryker-exact-ranges.mjs";
import { strykerPlugins as drawn } from "./stryker-style-tables.mjs";

const FILES_PER_JOB = 8;
const MACHINERY = [
  "stryker.shards.json",
  "stryker.config.mjs",
  "vitest.config.ts",
  "vitest.stryker.config.ts",
  "tools/mutation.mjs",
  "tools/mutation-plan.mjs",
  "tools/stryker-style-tables.mjs",
  "tools/stryker-exact-ranges.mjs",
  "apps/native/jest.config.js",
  "apps/native/jest.shared.js",
  "pnpm-lock.yaml",
];
const NOT_PRODUCTION = /\.(?:test|spec|fixtures)\.[cm]?[jt]sx?$/;
const TEST = /\.(?:test|spec)(\.[cm]?[jt]sx?)$/;
const RELATIVE_IMPORT = /(?:from|import)\s+["'](\.{1,2}\/[^"']+)["']/g;
const HUNK = /^@@ -\S+ \+(\d+)(?:,(\d+))? @@/;
const DRAWN = drawn.map((plugin) => plugin.value);

const instrumenter = new Instrumenter({
  debug() {},
  info() {},
  isDebugEnabled: () => false,
  warn: console.warn,
});

const chunked = (files, size) =>
  Array.from({ length: Math.ceil(files.length / size) }, (_, index) =>
    files.slice(index * size, (index + 1) * size),
  );

const mutantsIn = async (root, file, mutate, ignorers = DRAWN) => {
  const { mutants } = await instrumenter.instrument(
    [
      {
        name: `${root}${file}`,
        content: readFileSync(`${root}${file}`, "utf8"),
        mutate,
      },
    ],
    { plugins: null, excludedMutations: [], ignorers },
  );
  return mutants
    .filter((mutant) => mutant.status === undefined)
    .map(({ location, mutatorName, replacement }) => {
      const { start, end } = location;
      const range = `${file}:${start.line + 1}:${start.column}-${end.line + 1}:${end.column}`;
      return {
        file,
        location,
        range,
        key: `${range} ${mutatorName} ${replacement}`,
      };
    });
};

const linesOf = (lines) =>
  lines?.map(({ start, end }) => ({
    start: { line: start - 1, column: 0 },
    end: { line: end - 1, column: Number.MAX_SAFE_INTEGER },
  })) ?? true;

const judgedBy = (job, mutants) =>
  mutants.filter((mutant) => {
    const pins = job.filter((pin) => pin.file === mutant.file);
    return (
      pins.some((pin) => within(mutant.location, pin.location)) &&
      pins.some((pin) => within(pin.location, mutant.location))
    );
  });

const packed = (mutants, most) => {
  const jobs = [];
  for (const pin of new Map(
    mutants.map((each) => [each.range, each]),
  ).values()) {
    const last = jobs.at(-1);
    if (
      last !== undefined &&
      judgedBy([...last, pin], mutants).length <= most
    ) {
      last.push(pin);
    } else {
      jobs.push([pin]);
    }
  }
  return jobs;
};

const judgedIn = async (root, job) => {
  const ignorers = [
    ...DRAWN,
    exactRanges({ mutate: job.map((pin) => pin.range) }),
  ];
  const judged = await Promise.all(
    [...new Set(job.map((pin) => pin.file))].map((file) =>
      mutantsIn(
        root,
        file,
        job.filter((pin) => pin.file === file).map((pin) => pin.location),
        ignorers,
      ),
    ),
  );
  return judged.flat();
};

const mutantJobs = async (root, { mutantsPerJob }, files, changed) => {
  const mutants = (
    await Promise.all(
      files.map((file) => mutantsIn(root, file, linesOf(changed.get(file)))),
    )
  ).flat();
  const jobs = packed(mutants, mutantsPerJob);
  const judged = await Promise.all(jobs.map((job) => judgedIn(root, job)));
  const planned = new Set(judged.flat().map((mutant) => mutant.key));
  const missed = mutants.filter((mutant) => !planned.has(mutant.key));
  if (missed.length > 0) {
    throw new Error(
      `The plan leaves these mutants to no job:\n${missed.map((mutant) => mutant.key).join("\n")}`,
    );
  }
  const crowded = judged.findIndex(
    (job, index) => job.length > mutantsPerJob && jobs[index].length > 1,
  );
  if (crowded !== -1) {
    throw new Error(
      `A job would judge ${judged[crowded].length} mutants, over ${mutantsPerJob}:\n${jobs[crowded].map((pin) => pin.range).join("\n")}`,
    );
  }
  return jobs.map((job, index) => ({
    files: job.map((pin) => pin.range),
    mutants: judged[index].length,
  }));
};

const changedLines = (diff) =>
  diff.split("\n").reduce(
    ({ file, lines }, line) => {
      if (line.startsWith("+++ ")) return { file: line.slice(6), lines };
      const hunk = HUNK.exec(line);
      if (hunk === null || hunk[2] === "0") return { file, lines };
      const start = Number(hunk[1]);
      const end = start + Number(hunk[2] ?? 1) - 1;
      lines.set(file, [...(lines.get(file) ?? []), { start, end }]);
      return { file, lines };
    },
    { file: "", lines: new Map() },
  ).lines;

const diffed = (root, args) => {
  const run = spawnSync("git", ["diff", ...args], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 1 << 28,
  });
  if (run.status !== 0)
    throw new Error(`git diff ${args.join(" ")}\n${run.stderr}`);
  return run.stdout;
};

const imported = (root, file) =>
  [...readFileSync(`${root}${file}`, "utf8").matchAll(RELATIVE_IMPORT)]
    .map(([, specifier]) =>
      normalize(join(dirname(file), specifier)).replace(/\.js$/, ""),
    )
    .flatMap((stem) => [`${stem}.ts`, `${stem}.tsx`, `${stem}/index.ts`]);

const reachedBy = (root, file) =>
  NOT_PRODUCTION.test(file)
    ? [file.replace(TEST, "$1"), ...imported(root, file)]
    : [file];

const jobsOf = async (root, shard, files, lines) =>
  shard.runner === "jest"
    ? mutantJobs(root, shard, files, lines)
    : chunked(files, FILES_PER_JOB).map((chunk) => ({ files: chunk }));

export const plan = async ({ base, root, shards }) => {
  const changed = diffed(root, [
    "--name-only",
    "--diff-filter=d",
    `${base}...HEAD`,
  ])
    .split("\n")
    .filter(Boolean);
  const touched = new Set(changed.flatMap((file) => reachedBy(root, file)));
  const lines = changedLines(
    diffed(root, ["-U0", "--diff-filter=d", `${base}...HEAD`]),
  );
  const canary = changed.some((file) => MACHINERY.includes(file));
  const jobs = await Promise.all(
    shards.map(async (shard) => {
      const picked = globSync(shard.mutate, { cwd: root }).filter(
        (file) => !NOT_PRODUCTION.test(file) && touched.has(file),
      );
      const split = await jobsOf(root, shard, picked, lines);
      const judged =
        canary && split.length === 0
          ? await jobsOf(root, shard, [shard.canary], new Map())
          : split;
      return judged.map((job) => ({
        shard: shard.id,
        ...job,
        files: job.files.join(","),
      }));
    }),
  );
  return jobs.flat();
};
