import { describe, expect, it } from "vitest";
import {
  corpusManifest,
  nearbyTheatersCaptures,
  seatMapCaptures,
  seatMapFailureCaptures,
  showtimeGroupingCaptures,
  theaterMovieShowtimesCaptures,
} from "./captures.js";

const SPAN_THE_CAPTURE_REACHED = {
  chains: 11,
  auditoriums: 41,
  smallestAuditorium: 46,
  largestAuditorium: 304,
};

const indexedFiles = () => [
  ...seatMapCaptures.keys(),
  ...seatMapFailureCaptures.keys(),
  ...showtimeGroupingCaptures.keys(),
  ...theaterMovieShowtimesCaptures.keys(),
  ...nearbyTheatersCaptures.keys(),
];

const capturedPresentations = () => [
  ...[...showtimeGroupingCaptures.values()].flatMap((capture) =>
    capture.body.theaterShowtimes.theaters.flatMap(
      (theater) => theater.variants,
    ),
  ),
  ...[...theaterMovieShowtimesCaptures.values()].flatMap((capture) =>
    capture.body.viewModel.movies.flatMap((movie) => movie.variants),
  ),
];

const capturedShowtimes = () =>
  capturedPresentations().flatMap((presentation) =>
    presentation.amenityGroups.flatMap((group) => group.showtimes),
  );

const chainsInCapturedTheaters = () =>
  new Set([
    ...[...nearbyTheatersCaptures.values()].flatMap((capture) =>
      capture.body.theaters.map((theater) => theater.chainCode),
    ),
    ...[...showtimeGroupingCaptures.values()].flatMap((capture) =>
      capture.body.theaterShowtimes.theaters.map(
        (theater) => theater.chainCode,
      ),
    ),
  ]);

const tallyStatuses = (statuses: readonly string[]): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const status of statuses) counts[status] = (counts[status] ?? 0) + 1;
  return counts;
};

describe("the captured corpus", () => {
  it("indexes every file the capture wrote", () => {
    expect(indexedFiles().toSorted()).toEqual(corpusManifest.files.toSorted());
  });

  it("holds a seat map capture for every Chain its Theater captures mention", () => {
    const chainsWithSeatMaps = new Set(
      corpusManifest.seatMaps.map((entry) => entry.chain),
    );

    expect(
      [...chainsInCapturedTheaters()].filter(
        (chain) => !chainsWithSeatMaps.has(chain),
      ),
    ).toEqual([]);
  });

  it("spans at least the Chains, Auditoriums and Auditorium sizes already captured", () => {
    const maps = [...seatMapCaptures.values()].map((capture) => capture.body);
    const sizes = maps.map((map) => map.seats.length);

    expect(
      new Set(maps.map((map) => map.chainCode)).size,
    ).toBeGreaterThanOrEqual(SPAN_THE_CAPTURE_REACHED.chains);
    expect(
      new Set(maps.map((map) => `${map.tmsId}/${map.auditoriumId}`)).size,
    ).toBeGreaterThanOrEqual(SPAN_THE_CAPTURE_REACHED.auditoriums);
    expect(Math.min(...sizes)).toBeLessThanOrEqual(
      SPAN_THE_CAPTURE_REACHED.smallestAuditorium,
    );
    expect(Math.max(...sizes)).toBeGreaterThanOrEqual(
      SPAN_THE_CAPTURE_REACHED.largestAuditorium,
    );
  });

  it("holds every Auditorium at the size and status mix it was captured with", () => {
    const captured = corpusManifest.seatMaps.filter(
      (entry) => entry.httpStatus === 200,
    );
    expect(captured).toHaveLength(seatMapCaptures.size);

    for (const entry of captured) {
      const seatMap = seatMapCaptures.get(entry.file)?.body;
      expect(seatMap?.auditoriumId).toBe(entry.auditoriumId);
      expect(seatMap?.seats.length).toBe(entry.seatsInArray);
      expect(
        tallyStatuses(seatMap?.seats.map((seat) => seat.status) ?? []),
      ).toEqual(entry.rawSeatStatusCounts);
    }
  });

  it("gives every Seat a positive size and a neighbour link that resolves both ways", () => {
    for (const capture of seatMapCaptures.values()) {
      const seats = capture.body.seats;
      const byId = new Map(seats.map((seat) => [seat.id, seat]));

      expect(
        seats.filter((seat) => seat.width <= 0 || seat.height <= 0),
      ).toEqual([]);
      expect(
        seats.filter(
          (seat) =>
            (seat.leftNeighbor !== "" &&
              byId.get(seat.leftNeighbor)?.rightNeighbor !== seat.id) ||
            (seat.rightNeighbor !== "" &&
              byId.get(seat.rightNeighbor)?.leftNeighbor !== seat.id),
        ),
      ).toEqual([]);
    }
  });

  it("holds the upstream refusals the capture met, each with its own reason", () => {
    const refused = corpusManifest.seatMaps.filter(
      (entry) => entry.httpStatus !== 200,
    );
    expect(refused).toHaveLength(seatMapFailureCaptures.size);
    expect(
      refused.map((entry) => entry.httpStatus).toSorted((a, b) => a - b),
    ).toEqual([400, 404, 410]);

    for (const entry of refused) {
      const capture = seatMapFailureCaptures.get(entry.file);
      expect(capture?.status).toBe(entry.httpStatus);
      expect(capture?.body).toHaveLength(1);
      expect(capture?.body[0]?.id).toMatch(/\S/);
      expect(capture?.body[0]?.message).toMatch(/\S/);
    }
  });

  it("holds a theater-centric answer that names no start instant and no Movie", () => {
    const groups = [...theaterMovieShowtimesCaptures.values()].flatMap(
      (capture) =>
        capture.body.viewModel.movies.flatMap((movie) =>
          movie.variants.flatMap((variant) => variant.amenityGroups),
        ),
    );
    const named = new Set([
      ...groups.flatMap((group) => Object.keys(group)),
      ...groups.flatMap((group) =>
        group.showtimes.flatMap((showtime) => Object.keys(showtime)),
      ),
    ]);

    expect(groups).toHaveLength(37);
    expect(
      ["id", "ticketingJumpPageURL"].filter((key) => named.has(key)),
    ).toHaveLength(2);
    expect(
      ["dateLocal", "dateUtc", "movieID"].filter((key) => named.has(key)),
    ).toEqual([]);
  });

  it("holds a ticketing URL on every captured Showtime", () => {
    const showtimes = capturedShowtimes();

    expect(showtimes.length).toBeGreaterThan(0);
    expect(
      showtimes.filter((showtime) => showtime.ticketingJumpPageURL === ""),
    ).toEqual([]);
  });
});
