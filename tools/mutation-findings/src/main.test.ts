import { describe, expect, it } from "vitest";
import { main } from "./main.ts";

const RUN = "https://github.com/owner/repo/actions/runs/1";
const PLANTED = "tools/mutation-findings/planted";

const reported = (...argv: readonly string[]) => {
  const written: string[] = [];
  const status = main(["node", "findings", ...argv], {
    write: (text) => {
      written.push(text);
    },
  });
  return { status, said: written.join("") };
};

describe("the findings command", () => {
  it("writes a surviving mutant for the issue and exits 2, so the run opens it", () => {
    const { status, said } = reported(`${PLANTED}/survived`, RUN);

    expect(status).toBe(2);
    expect(said).toContain(
      "### `packages/core/src/up.ts:1` EqualityOperator survived",
    );
  });

  it("writes one line for a run whose every mutant was killed and exits 0, so the run closes the issue", () => {
    expect(reported(`${PLANTED}/killed`, RUN)).toEqual({
      status: 0,
      said: "The tests killed all 1 mutants on this merge's lines.\n",
    });
  });

  it("writes a planned job whose result never arrived as broken", () => {
    const { status, said } = reported(`${PLANTED}/no-result`, RUN);

    expect(status).toBe(2);
    expect(said).toContain(
      `The native-ask job left no result, so the lines it was given were not judged. [The run](${RUN}) says why.`,
    );
  });

  it("writes a run whose plan was never written as broken", () => {
    const { status, said } = reported(`${PLANTED}/never-written`, RUN);

    expect(status).toBe(2);
    expect(said).toContain("The plan of what to mutate could not be made");
  });

  it("refuses to run without the run's address after the results directory", () => {
    expect(reported(`${PLANTED}/killed`)).toEqual({
      status: 1,
      said: "Name the directory the mutation jobs' results are in, then the run's address.\n",
    });
  });
});
