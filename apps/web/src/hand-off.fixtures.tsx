import { fireEvent, screen, within } from "@testing-library/react";
import { cards, staged } from "./search.fixtures.js";

const HOOKY = "Hooky Entertainment Addison + SDX";
const SEAT_MAP = "/napi/seatMap/";
export const HOOKY_TICKETING =
  "https://tickets.fandango.com/transaction/ticketing/mobile/jump.aspx?sdate=2026-08-28%2B09%3A00&from=mov_det_showtimes&source=desktop&mid=245569&tid=aawza&dfam=webbrowser&showtimehashcode=v2-d2998da8682c402f6a3d3b08e2e04eebbebc86096e8467e63cc506ab808dec5a";

export interface Room {
  readonly status?: number;
  readonly statuses?: Readonly<Record<string, string>>;
  readonly others?: string;
}

interface SeatStatus {
  readonly id: string;
  readonly status: string;
}

interface SeatMapBody {
  readonly seats: readonly SeatStatus[];
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  value instanceof Object;

const isSeatStatus = (value: unknown): value is SeatStatus =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.status === "string";

const isSeatMapBody = (value: unknown): value is SeatMapBody =>
  isRecord(value) &&
  Array.isArray(value.seats) &&
  value.seats.every(isSeatStatus);

const seatMapBodyFrom = (body: string): SeatMapBody => {
  const value = JSON.parse(body);
  if (!isSeatMapBody(value))
    throw new Error("seat map body cannot be rewritten");
  return value;
};

const roomAs = (body: string, room: Room) => {
  const map = seatMapBodyFrom(body);
  return JSON.stringify({
    ...map,
    seats: map.seats.map((seat) => ({
      ...seat,
      status: room.statuses?.[seat.id] ?? room.others ?? seat.status,
    })),
  });
};

const stagedHandOff = (options: Parameters<typeof staged>[0] = {}) => {
  const held: (() => void)[] = [];
  let holding = false;
  let room: Room | null = null;
  const stage = staged({
    ...options,
    fetch: (fetch) => async (url, init) => {
      const answer = await fetch(url, init);
      if (!url.startsWith(SEAT_MAP)) return answer;
      if (holding) await new Promise<void>((resume) => held.push(resume));
      if (room === null) return answer;
      const text = roomAs(await answer.text(), room);
      return {
        status: room.status ?? answer.status,
        text: () => Promise.resolve(text),
      };
    },
  });
  return {
    ...stage,
    roomAtHandOff: (answer: Room) => {
      room = answer;
    },
    holdSeatMaps: () => {
      holding = true;
    },
    releaseSeatMaps: () => {
      holding = false;
      for (const resume of held.splice(0)) resume();
    },
  };
};

export const opened = async (
  options: Parameters<typeof staged>[0] = {},
  seats = /G6·G7$/,
) => {
  const stage = stagedHandOff(options);
  await stage.settled();
  fireEvent.click(
    within(cards()[0] ?? document.body).getByRole("button", { name: seats }),
  );
  return {
    stage,
    sheet: within(screen.getByRole("dialog", { name: HOOKY })),
  };
};

export const taken = async (room: Room) => {
  const { stage, sheet } = await opened();
  stage.roomAtHandOff(room);
  fireEvent.click(sheet.getByRole("button", { name: "Take G6 and G7" }));
  await stage.answered();
  return stage;
};

export const dialog = (name: string) =>
  within(screen.getByRole("dialog", { name }));

export const marks = () => {
  const sheet = screen.getByRole("dialog");
  return {
    lost: sheet.querySelector("circle.mp-lost"),
    pair: sheet.querySelector("circle.mp-pair"),
  };
};
