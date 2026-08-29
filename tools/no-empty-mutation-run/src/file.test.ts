import { describe, expect, it } from "vitest";
import { read } from "./file.ts";

const PLANTED = "tools/no-empty-mutation-run/planted";

describe("reading a report", () => {
  it("hands back what the file holds", () => {
    expect(read(`${PLANTED}/weighed-one.json`)).toContain('"status": "Killed"');
  });

  it("hands back nothing for a file that is not there", () => {
    expect(read(`${PLANTED}/never-written.json`)).toBeNull();
  });
});
