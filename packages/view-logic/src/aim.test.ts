import { REFERENCE } from "@seatscout/client";
import { beforeAll, describe, expect, it } from "vitest";
import {
  type OpenedRoom,
  openedRooms,
  WEST_PLANO_28,
} from "./rooms.fixtures.js";
import { aimedAt } from "./seat-map.js";

let room: OpenedRoom | undefined;

const opened = (): OpenedRoom => {
  if (room === undefined) throw new Error("the room was not opened");
  return room;
};

beforeAll(async () => {
  [room] = await openedRooms(undefined, [WEST_PLANO_28]);
});

describe("where the Seat Profile aims in the room", () => {
  it("aims inside the room, neither the front row nor the back, for a depth part way back", () => {
    const { auditorium, result } = opened();
    const rows = auditorium.map.rows.map((row) => row.seats[0]?.y);
    const partWay = {
      ...result,
      terms: {
        ...result.terms,
        profile: { ...(result.terms.profile ?? REFERENCE), targetDepth: 0.4 },
      },
    };

    const aimed = aimedAt(partWay, auditorium.map).y;

    expect(aimed).toBeGreaterThan(rows[0] ?? Number.NaN);
    expect(aimed).toBeLessThan(rows.at(-1) ?? Number.NaN);
  });

  it("aims at the row in front when two rows are equally near the depth the profile asks for", () => {
    const { auditorium, result } = opened();
    const [front, , back] = auditorium.map.rows;
    if (front === undefined || back === undefined)
      throw new Error("the room has fewer than three rows");
    const map = {
      ...auditorium.map,
      rows: [
        { ...front, depth: 0 },
        { ...back, depth: 1 },
      ],
    };
    const halfway = {
      ...result,
      terms: {
        ...result.terms,
        profile: { ...(result.terms.profile ?? REFERENCE), targetDepth: 0.5 },
      },
    };

    expect(aimedAt(halfway, map).y).toBe(front.seats[0]?.y);
  });

  it("aims at the room the profile names rather than at the group that was chosen", () => {
    const { auditorium, result } = opened();
    const lower = { ...(result.terms.profile ?? REFERENCE), targetDepth: 0 };
    const deeper = { ...lower, targetDepth: 1 };

    expect(
      aimedAt(
        { ...result, terms: { ...result.terms, profile: lower } },
        auditorium.map,
      ).y,
    ).toBeLessThan(
      aimedAt(
        { ...result, terms: { ...result.terms, profile: deeper } },
        auditorium.map,
      ).y,
    );
  });
});
