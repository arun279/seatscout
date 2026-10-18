import type { Judged } from "./findings.ts";

const isPlan = (parsed: unknown): parsed is readonly { shard: string }[] =>
  Array.isArray(parsed) &&
  parsed.every(
    (job: unknown) =>
      typeof job === "object" &&
      job !== null &&
      "shard" in job &&
      typeof job.shard === "string",
  );

export const judgedFrom = (
  dir: string,
  read: (path: string) => string | null,
  list: (dir: string) => readonly string[],
): Judged[] | undefined => {
  const text = read(`${dir}/plan.json`);
  if (!text) return undefined;
  const plan: unknown = JSON.parse(text);
  if (!isPlan(plan)) return undefined;
  return plan.map(({ shard }, index) => {
    const job = `${dir}/mutation-${index}`;
    return {
      shard,
      outcome: read(`${job}/outcome`)?.trim(),
      reports: list(job)
        .filter((name) => name.endsWith(".json"))
        .flatMap((name) => read(`${job}/${name}`) ?? []),
    };
  });
};
