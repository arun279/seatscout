import { describe, expect, it } from "vitest";
import { DUPLICATION } from "./duplication.ts";

const measuring = (total: Readonly<Record<string, number>>) =>
  DUPLICATION.measure(JSON.stringify({ statistics: { total } }));

describe("reading what a duplication run measured", () => {
  it("takes the sources the run read as what it weighed", () => {
    expect(
      measuring({
        sources: 92,
        lines: 8456,
        duplicatedLines: 0,
        percentage: 0,
      }).weighed,
    ).toBe(92);
  });

  it("takes a run over nothing as no source at all", () => {
    expect(
      measuring({ sources: 0, lines: 0, duplicatedLines: 0, percentage: 0 })
        .weighed,
    ).toBe(0);
  });

  it("reports the figure the run measured, to two places", () => {
    expect(
      measuring({
        sources: 92,
        lines: 8456,
        duplicatedLines: 127,
        percentage: 1.5018,
      }).said,
    ).toBe(
      "records 127 duplicated line(s) of 8456 across 92 source(s), 1.50%.",
    );
  });
});

describe("what the duplication guard says", () => {
  it("names the report, why jscpd passed its own gate, and what was missing", () => {
    expect(DUPLICATION.refusal("reports/duplication/jscpd-report.json")).toBe(
      "reports/duplication/jscpd-report.json records a run that read no source.\n\n" +
        "jscpd exits zero both for duplication inside the threshold and for a run whose paths\n" +
        "matched no file, so its status cannot say which of the two happened. A duplication\n" +
        "percentage is a verdict over the lines it read, and there were none: the paths handed\n" +
        "to jscpd reach nothing, or every file under them is ignored.\n",
    );
  });

  it("says where the report should have been when there is none", () => {
    expect(
      DUPLICATION.missing("reports/duplication/jscpd-report.json"),
    ).toContain("does not exist, so the duplication run wrote no report");
  });
});
