import type { Judged } from "./findings.ts";

export const judgedFrom = (
  dir: string | undefined,
  read: (path: string) => string | null,
): Judged[] | undefined => {
  const text = dir === undefined ? null : read(`${dir}/plan.json`);
  if (!text) return undefined;
  const plan: readonly { readonly shard: string }[] = JSON.parse(text);
  return plan.map(({ shard }, index) => {
    const job = `${dir}/mutation-${index}`;
    return {
      shard,
      outcome: read(`${job}/outcome`)?.trim(),
      report: read(`${job}/${shard}.json`),
    };
  });
};
