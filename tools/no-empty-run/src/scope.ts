import { matchesGlob } from "node:path";

interface Report {
  readonly files?: Readonly<Record<string, unknown>>;
}

export const scoped = (text: string, mutate: readonly string[]): string => {
  const report: Report = JSON.parse(text);
  return JSON.stringify({
    ...report,
    files: Object.fromEntries(
      Object.entries(report.files ?? {}).filter(([file]) =>
        mutate.some((glob) => matchesGlob(file, glob)),
      ),
    ),
  });
};
