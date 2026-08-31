import { describe, expect, it } from "vitest";
import type { Claim } from "./judge.ts";
import { main, NOTHING } from "./main.ts";

const claim = (count: number): Claim => ({
  document: "a.md",
  says: /It holds (\w+) things\./,
  about: "the things in a.ts",
  count: () => count,
});

const gate = (claims: readonly Claim[]) => {
  const printed: string[] = [];
  const refused: string[] = [];
  const status = main(
    claims,
    () => "It holds three things.",
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

describe("the gate", () => {
  it("passes and names what it held when every pair agrees", () => {
    const { status, said, refused } = gate([claim(3)]);

    expect(status).toBe(0);
    expect(said).toContain("over 1 declared pairs");
    expect(refused).toBe("");
  });

  it("fails and names the pair that disagrees", () => {
    const { status, said, refused } = gate([claim(4)]);

    expect(status).toBe(1);
    expect(said).toBe("");
    expect(refused).toContain("and there are 4");
  });

  it("refuses a table that declares no pair, rather than passing over nothing", () => {
    const { status, refused } = gate([]);

    expect(status).toBe(1);
    expect(refused).toBe(NOTHING);
    expect(refused).toContain("Refusing a run that declares no pair");
  });
});
