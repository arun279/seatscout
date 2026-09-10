import { describe, expect, it } from "vitest";
import { main, REPORT } from "./main.ts";

const guard = (
  reports: Readonly<Record<string, string>>,
  ...argv: readonly string[]
) => {
  const printed: string[] = [];
  const refused: string[] = [];
  const status = main(
    ["node", "duplication-run", ...argv],
    (path) => reports[path] ?? null,
    {
      write: (text) => {
        printed.push(text);
      },
    },
    {
      write: (text) => {
        refused.push(text);
      },
    },
  );
  return { status, said: printed.join(""), refused: refused.join("") };
};

const measuring = (sources: number) =>
  JSON.stringify({
    statistics: {
      total: {
        sources,
        lines: sources * 10,
        duplicatedLines: 0,
        percentage: 0,
      },
    },
  });

describe("the guard", () => {
  it("reads the report the json reporter is configured to write", () => {
    expect(REPORT).toBe("reports/duplication/jscpd-report.json");
  });

  it("reads the report the json reporter writes when it is told no path", () => {
    expect(guard({ [REPORT]: measuring(2) }).status).toBe(0);
  });

  it("reads whatever report it is given", () => {
    expect(guard({ "other.json": measuring(2) }, "other.json").status).toBe(0);
  });

  it("passes a run that read a source, and says what it measured", () => {
    const { status, said } = guard({ [REPORT]: measuring(2) });

    expect(status).toBe(0);
    expect(said).toBe(
      `${REPORT} records 0 duplicated line(s) of 20 across 2 source(s), 0.00%.\n`,
    );
  });

  it("fails a run that read none, which jscpd exits zero on", () => {
    const { status, refused } = guard({ [REPORT]: measuring(0) });

    expect(status).toBe(1);
    expect(refused).toContain("records a run that read no source");
  });

  it("fails when the run wrote no report at all", () => {
    const { status, refused } = guard({});

    expect(status).toBe(1);
    expect(refused).toContain("does not exist");
  });
});
