import {
  measured,
  missing,
  reading,
  type Report,
  refusal,
} from "./measured.ts";

export interface Writer {
  readonly write: (text: string) => void;
}

export const REPORT = "reports/duplication/jscpd-report.json";

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
  const total = measured(report);
  if (total.sources === 0) {
    err.write(refusal(path));
    return 1;
  }
  out.write(reading(path, total));
  return 0;
};
