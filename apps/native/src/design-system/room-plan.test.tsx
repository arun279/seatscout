import { describe, expect, it } from "@jest/globals";
import type { SeatGroupResult } from "@seatscout/client";
import { render, screen } from "@testing-library/react-native";
import { houseLights } from "../../test/lights.js";
import { first, settled } from "../../test/rooms.js";
import type { Appearance } from "../theme.js";
import { RoomPlan } from "./room-plan.js";

const ACROSS = 54;

const hidden = { includeHiddenElements: true } as const;

const drawn = async (appearance: Appearance): Promise<SeatGroupResult> => {
  houseLights(appearance);
  const result = first(await settled());
  await render(<RoomPlan across={ACROSS} result={result} />);
  return result;
};

const propAt = (testID: string, prop: string) =>
  screen.getByTestId(testID, hidden).props[prop];

const numberAt = (testID: string, prop: string) => Number(propAt(testID, prop));

const frame = () => ({
  across: numberAt("plan", "vbWidth"),
  down: numberAt("plan", "vbHeight"),
});

const rows = () =>
  screen.getAllByTestId("row-line", hidden).map((line) => ({
    x1: Number(line.props["x1"]),
    x2: Number(line.props["x2"]),
    y: Number(line.props["y1"]),
  }));

describe("the room a card draws to scale", () => {
  it("draws one line for every run of seats the plan carries", async () => {
    const result = await drawn("down");

    expect(rows()).toHaveLength(
      result.plan.reduce((lines, row) => lines + row.runs.length, 0),
    );
  });

  it("keeps the whole room inside the frame, because the plan is never cut", async () => {
    await drawn("down");
    const { across, down } = frame();
    const marks = [
      ...rows().flatMap((row) => [
        { at: row.x1, past: across },
        { at: row.x2, past: across },
        { at: row.y, past: down },
      ]),
      { at: numberAt("pair", "cx"), past: across },
      { at: numberAt("pair", "cy"), past: down },
    ];

    expect(marks.length).toBeGreaterThan(2);
    expect(marks.filter((mark) => mark.at < 0 || mark.at > mark.past)).toEqual(
      [],
    );
  });

  it("stands the screen in front of the front row and narrower than the room", async () => {
    await drawn("down");
    const front = Math.min(...rows().map((row) => row.y));
    const edge = numberAt("screen-line", "x2") - numberAt("screen-line", "x1");

    expect(numberAt("screen-line", "y1")).toBeLessThan(front);
    expect(edge).toBeGreaterThan(0);
    expect(edge).toBeLessThan(frame().across);
  });

  it("draws at the width it was asked for, and keeps the frame's own shape", async () => {
    await drawn("down");
    const { across, down } = frame();

    expect(numberAt("plan", "width")).toBe(ACROSS);
    expect(numberAt("plan", "height")).toBeCloseTo((ACROSS * down) / across, 5);
  });

  it("lights the offered pair with the house lights down", async () => {
    await drawn("down");

    expect(propAt("pair", "filter")).toBe("lit");
  });

  it("lets the lit room carry it by edge instead, because light is information in the dark", async () => {
    await drawn("up");

    expect(propAt("pair", "filter")).toBeUndefined();
  });

  it("rings the target the Profile asks for, and fills the pair the search offers", async () => {
    await drawn("down");

    expect(numberAt("target", "r")).toBeGreaterThan(numberAt("pair", "r"));
    expect(propAt("target", "propList")).toContain("stroke");
    expect(propAt("pair", "propList")).not.toContain("stroke");
  });
});
