import { describe, expect, it } from "vitest";
import { seatMapCaptures } from "../corpus/captures.js";
import { type UpstreamScript, fakeUpstream } from "../testing/fake-upstream.js";
import { openSource } from "./aggregator.js";
import type { Source } from "./port.js";
import type { Designation, Seat } from "./seat-map.js";

const BOOTSTRAP = "/napi/preferences/themes";
const FETCHED_AT = 1000;
const AUDITORIUM_WITH_ACCESSIBLE_SPACES = "561462741";
const AUDITORIUM_WITH_ALMOST_NO_NEIGHBOUR_LINKS = "561230736";
const AUDITORIUM_THE_SOURCE_MISCOUNTS = "561865199";

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

const capturedAnswer = (showtime: string) => {
  const capture = [...seatMapCaptures.values()].find(
    (entry) => entry.body.showtimeId === showtime,
  );
  if (capture === undefined)
    throw new Error(`the corpus holds no seat map for showtime ${showtime}`);
  return capture.body;
};

const answering = (showtime: string, body: string) => ({
  [`/napi/seatMap/${showtime}`]: { status: 200, body },
});

const seatsIn = async (source: Source, showtime: string) => {
  const reading = await source.seatsFor(showtime);
  return reading.ok ? reading.payload : [];
};

const seatsOf = (showtime: string, routes?: UpstreamScript["routes"]) =>
  seatsIn(sourceOf(routes), showtime);

const everyCapturedSeat = async () => {
  const source = sourceOf();
  const auditoriums = await Promise.all(
    [...seatMapCaptures.values()].map((capture) =>
      seatsIn(source, capture.body.showtimeId),
    ),
  );
  return auditoriums.flat();
};

const seatCalled = (seats: readonly Seat[], id: string) =>
  seats.find((seat) => seat.id === id);

const unlinked = (seats: readonly Seat[]) =>
  seats.filter(
    (seat) => seat.leftNeighbour === null && seat.rightNeighbour === null,
  );

describe("the seat map path", () => {
  it("reads an Auditorium into Seats carrying geometry, neighbour links and Provenance", async () => {
    const seats = await seatsOf(AUDITORIUM_WITH_ACCESSIBLE_SPACES);

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
    const captured = capturedAnswer(AUDITORIUM_WITH_ACCESSIBLE_SPACES);
    const invented = JSON.stringify({
      ...captured,
      seats: captured.seats.map((seat) =>
        seat.id === "A30" ? { ...seat, status: "H" } : seat,
      ),
    });

    const asSent = await seatsOf(AUDITORIUM_WITH_ACCESSIBLE_SPACES);
    const asInvented = await seatsOf(
      AUDITORIUM_WITH_ACCESSIBLE_SPACES,
      answering(AUDITORIUM_WITH_ACCESSIBLE_SPACES, invented),
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
      new Set(
        seats
          .filter((seat) => !seat.bookable)
          .map((seat) => seat.provenance.upstreamStatus),
      ),
    ).toEqual(new Set(["R", "O", "X"]));
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

  it("counts the Seats the Source sent rather than the seat count it claims", async () => {
    const seats = await seatsOf(AUDITORIUM_THE_SOURCE_MISCOUNTS);

    expect(seats).toHaveLength(304);
    expect(seats.filter((seat) => seat.bookable)).toHaveLength(25);
  });

  it("carries the neighbour links the Source gave, absent ones included", async () => {
    const regular = await seatsOf(AUDITORIUM_WITH_ALMOST_NO_NEIGHBOUR_LINKS);
    const paired = await seatsOf(AUDITORIUM_WITH_ACCESSIBLE_SPACES);

    expect(regular).toHaveLength(300);
    expect(unlinked(regular)).toHaveLength(290);
    expect(unlinked(paired)).toHaveLength(3);
  });

  it("refuses an answer it cannot read in full rather than reading part of an Auditorium", async () => {
    const captured = capturedAnswer(AUDITORIUM_WITH_ACCESSIBLE_SPACES);
    const seats = captured.seats;
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
          answering(AUDITORIUM_WITH_ACCESSIBLE_SPACES, body),
        ).seatsFor(AUDITORIUM_WITH_ACCESSIBLE_SPACES);
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
