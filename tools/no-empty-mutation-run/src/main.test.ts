import { describe, expect, it } from "vitest";
import { main, REPORT } from "./main.ts";

const guard = (
  reports: Readonly<Record<string, string>>,
  ...argv: readonly string[]
) => {
  const printed: string[] = [];
  const refused: string[] = [];
  const status = main(
    ["node", "mutation-run", ...argv],
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

const weighing = (...statuses: readonly string[]) =>
  JSON.stringify({
    files: { "a.ts": { mutants: statuses.map((status) => ({ status })) } },
  });

describe("the guard", () => {
  it("reads the report the json reporter is configured to write", () => {
    expect(REPORT).toBe("reports/mutation/mutation.json");
  });

  it("reads the report the json reporter writes when it is told no path", () => {
    expect(guard({ [REPORT]: weighing("Killed") }).status).toBe(0);
  });

  it("reads whatever report it is given", () => {
    expect(
      guard({ "other.json": weighing("Killed") }, "other.json").status,
    ).toBe(0);
  });

  it("passes a run that weighed a mutant, and says how many", () => {
    const { status, said } = guard({
      [REPORT]: weighing("Killed", "Survived"),
    });

    expect(status).toBe(0);
    expect(said).toBe(`${REPORT} records a run that weighed 2 mutants.\n`);
  });

  it("fails a run that weighed none, which Stryker scores as NaN and passes", () => {
    const { status, refused } = guard({ [REPORT]: weighing("Ignored") });

    expect(status).toBe(1);
    expect(refused).toContain("records a run that weighed no mutant");
  });

  it("fails when the run wrote no report at all", () => {
    const { status, refused } = guard({});

    expect(status).toBe(1);
    expect(refused).toContain("does not exist");
  });
});
