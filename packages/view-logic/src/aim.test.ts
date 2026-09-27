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

const aimedWith = (targetDepth: number) => {
  const { result } = opened();
  return {
    ...result,
    terms: {
      ...result.terms,
      profile: { ...(result.terms.profile ?? REFERENCE), targetDepth },
    },
  };
};

const rowNamed = (label: string) => {
  const row = opened().auditorium.map.rows.find((held) => held.label === label);
  if (row === undefined) throw new Error(`the room has no row ${label}`);
  return row;
};

describe("where the Seat Profile aims in the room", () => {
  it("aims at the sixth row of fourteen for a depth two fifths of the way back", () => {
    const aimed = aimedAt(aimedWith(0.4), opened().auditorium.map);

    expect(rowNamed("F").seats.map((seat) => seat.y)).toContain(aimed.y);
  });

  it("aims at the row in front when two rows are equally near the depth the profile asks for", () => {
    const front = rowNamed("A");
    const back = rowNamed("C");
    const map = {
      ...opened().auditorium.map,
      rows: [
        { ...front, depth: 0 },
        { ...back, depth: 1 },
      ],
    };

    expect(front.seats.map((seat) => seat.y)).toContain(
      aimedAt(aimedWith(0.5), map).y,
    );
  });

  it("aims at the front row for no depth and the back row for all of it", () => {
    const { map } = opened().auditorium;

    expect(rowNamed("A").seats.map((seat) => seat.y)).toContain(
      aimedAt(aimedWith(0), map).y,
    );
    expect(map.rows.at(-1)?.seats.map((seat) => seat.y)).toContain(
      aimedAt(aimedWith(1), map).y,
    );
  });
});
