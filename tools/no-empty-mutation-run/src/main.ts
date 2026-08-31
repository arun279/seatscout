import { refusal, type Report, weighed, missing } from "./weighed.ts";

export interface Writer {
  readonly write: (text: string) => void;
}

export const REPORT = "reports/mutation/mutation.json";

export const main = (
  argv: readonly string[],
  read: (path: string) => string | null,
  out: Writer,
  err: Writer,
): number => {
  const [path = REPORT] = argv.slice(2);
  const text = read(path);
  if (text === null) {
    err.write(missing(path));
    return 1;
  }

  const report: Report = JSON.parse(text);
  const total = weighed(report);
  if (total === 0) {
    err.write(refusal(path));
    return 1;
  }
  out.write(`${path} records a run that weighed ${total} mutants.\n`);
  return 0;
};
