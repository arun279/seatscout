import { describe, expect, it } from "vitest";
import { seatMapCaptures } from "../corpus/captures.js";
import { type UpstreamScript, fakeUpstream } from "../testing/fake-upstream.js";
import { openSource } from "./aggregator.js";
import type { Designation, Seat } from "./seat-map.js";

const BOOTSTRAP = "/napi/preferences/themes";
const FETCHED_AT = 1000;
const ROOM_WITH_ACCESSIBLE_SPACES = "561462741";
const ROOM_WITH_ALMOST_NO_NEIGHBOUR_LINKS = "561230736";
const ROOM_THE_SOURCE_MISCOUNTS = "561865199";

const sourceOf = (routes?: UpstreamScript["routes"]) =>
  openSource({
    fetch: fakeUpstream({
      seed: 4,
      routes: { [BOOTSTRAP]: { status: 200, body: "{}" }, ...routes },
    }),
    now: () => FETCHED_AT,
    wait: () => Promise.resolve(),
    random: () => 0.5,
  });

const capturedAnswer = (showtime: string) =>
  [...seatMapCaptures.values()].find(
    (capture) => capture.body.showtimeId === showtime,
  )?.body;

const answering = (showtime: string, body: string) => ({
  [`/napi/seatMap/${showtime}`]: { status: 200, body },
});

const seatsOf = async (showtime: string, routes?: UpstreamScript["routes"]) => {
  const reading = await sourceOf(routes).seatsFor(showtime);
  return reading.ok ? reading.payload : [];
};

const everyCapturedSeat = async () => {
  const source = sourceOf();
  const rooms = await Promise.all(
    [...seatMapCaptures.values()].map(async (capture) => {
      const reading = await source.seatsFor(capture.body.showtimeId);
      return reading.ok ? reading.payload : [];
    }),
  );
  return rooms.flat();
};

const tallied = (values: readonly string[]) => {
  const counts: Record<string, number> = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return counts;
};

const seatCalled = (seats: readonly Seat[], id: string) =>
  seats.find((seat) => seat.id === id);

const unlinked = (seats: readonly Seat[]) =>
  seats.filter(
    (seat) => seat.leftNeighbour === null && seat.rightNeighbour === null,
  );

describe("the seat map path", () => {
  it("reads an Auditorium into Seats carrying geometry, neighbour links and Provenance", async () => {
    const seats = await seatsOf(ROOM_WITH_ACCESSIBLE_SPACES);

    expect(seats).toHaveLength(294);
    expect(seatCalled(seats, "A30")).toEqual({
      id: "A30",
      designation: "standard",
      bookable: true,
      x: 22.514,
      y: 0,
      width: 14.266,
      height: 14.266,
      leftNeighbour: null,
      rightNeighbour: "A29",
      provenance: {
        source: "aggregator",
        fetchedAt: FETCHED_AT,
        upstreamStatus: "A",
      },
    });
    expect(seatCalled(seats, "WC17")).toEqual({
      id: "WC17",
      designation: "wheelchair",
      bookable: true,
      x: 241.913,
      y: 175.923,
      width: 14.266,
      height: 14.266,
      leftNeighbour: "E18",
      rightNeighbour: "E16",
      provenance: {
        source: "aggregator",
        fetchedAt: FETCHED_AT,
        upstreamStatus: "A",
      },
    });
  });

  it("judges a status it does not recognise as not bookable, where that same Seat read verbatim is bookable", async () => {
    const captured = capturedAnswer(ROOM_WITH_ACCESSIBLE_SPACES);
    const invented = JSON.stringify({
      ...captured,
      seats: captured?.seats.map((seat) =>
        seat.id === "A30" ? { ...seat, status: "H" } : seat,
      ),
    });

    const asSent = await seatsOf(ROOM_WITH_ACCESSIBLE_SPACES);
    const asInvented = await seatsOf(
      ROOM_WITH_ACCESSIBLE_SPACES,
      answering(ROOM_WITH_ACCESSIBLE_SPACES, invented),
    );

    expect(seatCalled(asSent, "A30")?.bookable).toBe(true);
    expect(asSent.filter((seat) => seat.bookable)).toHaveLength(291);

    expect(seatCalled(asInvented, "A30")).toEqual({
      ...seatCalled(asSent, "A30"),
      bookable: false,
      provenance: {
        source: "aggregator",
        fetchedAt: FETCHED_AT,
        upstreamStatus: "H",
      },
    });
    expect(asInvented.filter((seat) => seat.bookable)).toHaveLength(290);
  });

  it("holds every captured Seat to the same known-bookable list", async () => {
    const seats = await everyCapturedSeat();

    expect(seats).toHaveLength(6771);
    expect(seats.filter((seat) => seat.bookable)).toHaveLength(6113);
    expect(
      tallied(
        seats
          .filter((seat) => !seat.bookable)
          .map((seat) => seat.provenance.upstreamStatus),
      ),
    ).toEqual({ R: 378, O: 189, X: 91 });
  });

  it("carries wheelchair and companion designations through translation", async () => {
    const seats = await everyCapturedSeat();
    const tally = (designation: Designation) =>
      seats.filter((seat) => seat.designation === designation).length;

    expect(seats).toHaveLength(6771);
    expect({
      standard: tally("standard"),
      wheelchair: tally("wheelchair"),
      companion: tally("companion"),
    }).toEqual({ standard: 6407, wheelchair: 179, companion: 185 });
  });

  it("counts the Seats the Source sent rather than the seat counts it claims", async () => {
    const captured = capturedAnswer(ROOM_THE_SOURCE_MISCOUNTS);
    const recounted = JSON.stringify({
      ...captured,
      totalSeatCount: 9999,
      totalAvailableSeatCount: 0,
    });

    const asSent = await seatsOf(ROOM_THE_SOURCE_MISCOUNTS);
    const asRecounted = await seatsOf(
      ROOM_THE_SOURCE_MISCOUNTS,
      answering(ROOM_THE_SOURCE_MISCOUNTS, recounted),
    );

    expect(asSent).toHaveLength(304);
    expect(asSent.filter((seat) => seat.bookable)).toHaveLength(25);
    expect(asRecounted).toEqual(asSent);
  });

  it("carries the neighbour links the Source gave, absent ones included", async () => {
    const regular = await seatsOf(ROOM_WITH_ALMOST_NO_NEIGHBOUR_LINKS);
    const paired = await seatsOf(ROOM_WITH_ACCESSIBLE_SPACES);

    expect(regular).toHaveLength(300);
    expect(unlinked(regular)).toHaveLength(290);
    expect(unlinked(paired)).toHaveLength(3);
  });

  it("refuses an answer it cannot read in full rather than reading part of an Auditorium", async () => {
    const captured = capturedAnswer(ROOM_WITH_ACCESSIBLE_SPACES);
    const seats = captured?.seats ?? [];
    const withFirstSeat = (first: unknown) =>
      JSON.stringify({ ...captured, seats: [first, ...seats.slice(1)] });
    const answers: Readonly<Record<string, string>> = {
      "the captured answer": JSON.stringify(captured),
      "an answer that is not JSON": "<html>",
      "a JSON null": "null",
      "an object carrying no Seats": "{}",
      "a Seat that is null": withFirstSeat(null),
      "a Seat with no id": withFirstSeat({ ...seats[0], id: undefined }),
      "a Seat with no geometry": withFirstSeat({ ...seats[0], x: undefined }),
    };

    const outcomes = await Promise.all(
      Object.entries(answers).map(async ([name, body]) => {
        const reading = await sourceOf(
          answering(ROOM_WITH_ACCESSIBLE_SPACES, body),
        ).seatsFor(ROOM_WITH_ACCESSIBLE_SPACES);
        return [name, reading.ok ? "read" : reading.reason];
      }),
    );

    expect(Object.fromEntries(outcomes)).toEqual({
      "the captured answer": "read",
      "an answer that is not JSON": "unreachable",
      "a JSON null": "unreachable",
      "an object carrying no Seats": "unreachable",
      "a Seat that is null": "unreachable",
      "a Seat with no id": "unreachable",
      "a Seat with no geometry": "unreachable",
    });
  });
});
