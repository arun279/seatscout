import { describe, expect, it } from "vitest";
import {
  corpusManifest,
  nearbyTheatersCaptures,
  seatMapCaptures,
  seatMapFailureCaptures,
  showtimeGroupingCaptures,
  theaterMovieShowtimesCaptures,
} from "./captures.js";

const indexedFiles = () => [
  ...seatMapCaptures.keys(),
  ...seatMapFailureCaptures.keys(),
  ...showtimeGroupingCaptures.keys(),
  ...theaterMovieShowtimesCaptures.keys(),
  ...nearbyTheatersCaptures.keys(),
];

const capturedVariants = () => [
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
  capturedVariants().flatMap((variant) =>
    variant.amenityGroups.flatMap((group) => group.showtimes),
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
    const chains = chainsInCapturedTheaters();
    const chainsWithSeatMaps = new Set(
      corpusManifest.seatMaps.map((entry) => entry.chain),
    );

    expect(chains.size).toBeGreaterThan(1);
    expect(
      [...chains].filter((chain) => !chainsWithSeatMaps.has(chain)),
    ).toEqual([]);
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

  it("holds the geometry and neighbour links every Seat was captured with", () => {
    const seats = [...seatMapCaptures.values()].flatMap(
      (capture) => capture.body.seats,
    );

    expect(seats.length).toBeGreaterThan(0);
    expect(
      seats.filter(
        (seat) =>
          ![seat.x, seat.y, seat.width, seat.height].every(Number.isFinite),
      ),
    ).toEqual([]);
    expect(
      seats.filter(
        (seat) =>
          typeof seat.leftNeighbor !== "string" ||
          typeof seat.rightNeighbor !== "string",
      ),
    ).toEqual([]);
  });

  it("holds the three upstream refusals a seat map request can meet", () => {
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
      expect(
        capture?.body.map(({ id, message }) => id !== "" && message !== ""),
      ).toEqual([true]);
    }
  });

  it("holds a ticketing URL on every captured Showtime", () => {
    const showtimes = capturedShowtimes();

    expect(showtimes.length).toBeGreaterThan(0);
    expect(
      showtimes.filter((showtime) => showtime.ticketingJumpPageURL === ""),
    ).toEqual([]);
  });
});
