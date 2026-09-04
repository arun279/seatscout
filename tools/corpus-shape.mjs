function labellingOf(seats) {
  const labels = seats.map((seat) => String(seat.id));
  const rowsOfLetter = new Map();
  for (const seat of seats) {
    const letter = String(seat.id).match(/^[A-Za-z]+/)?.[0];
    if (letter) rowsOfLetter.set(letter.toUpperCase(), seat.row);
  }
  const letterMatchesRow = [...rowsOfLetter].every(
    ([letter, row]) => letter.length === 1 && letter.charCodeAt(0) - 64 === row,
  );
  return {
    labelStyle: labels.every((label) => /^\d+$/.test(label))
      ? "numeric"
      : labels.every((label) => /^[A-Za-z]/.test(label))
        ? "alphanumeric"
        : "mixed",
    labelLetterMatchesRowIndex:
      rowsOfLetter.size === 0 ? null : letterMatchesRow,
  };
}

function reportedBy(body) {
  return {
    seatBlocks: body.seatBlocks?.length ?? null,
    areas: body.areas?.length ?? null,
    reportedTotalSeatCount: body.totalSeatCount ?? null,
    reportedTotalAvailableSeatCount: body.totalAvailableSeatCount ?? null,
  };
}

export function shapeOf(body) {
  const seats = body.seats ?? [];
  const tally = (pick) =>
    seats.reduce(
      (acc, seat) =>
        Object.assign(acc, { [pick(seat)]: (acc[pick(seat)] ?? 0) + 1 }),
      {},
    );
  return {
    seatsInArray: seats.length,
    rows: new Set(seats.map((seat) => seat.row)).size,
    columns: new Set(seats.map((seat) => seat.column)).size,
    extentX: Math.max(0, ...seats.map((seat) => seat.x + seat.width)),
    extentY: Math.max(0, ...seats.map((seat) => seat.y + seat.height)),
    ...labellingOf(seats),
    rawSeatStatusCounts: tally((seat) => seat.status),
    seatTypeCounts: tally((seat) => seat.type),
    areaCodes: [...new Set(seats.map((seat) => seat.areaCode))],
    ...reportedBy(body),
    hasGeometry: seats.every(
      (seat) => Number.isFinite(seat.x) && Number.isFinite(seat.y),
    ),
    hasNeighbourLinks: seats.every(
      (seat) => "leftNeighbor" in seat && "rightNeighbor" in seat,
    ),
  };
}
