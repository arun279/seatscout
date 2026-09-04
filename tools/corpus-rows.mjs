export const showtimeRows = (groupings) =>
  groupings.flatMap(({ movieId, body }) =>
    (body.theaterShowtimes?.theaters ?? []).flatMap((theater) =>
      (theater.variants ?? []).flatMap((variant) =>
        (variant.amenityGroups ?? []).flatMap((group) =>
          (group.showtimes ?? []).map((showtime) => ({
            chain: theater.chainCode,
            theaterId: theater.id,
            theaterName: theater.name,
            movieId,
            movieVariantId: group.movieVariantId,
            format: variant.filmFormatHeader,
            amenities: group.amenityString,
            hasReservedSeating: group.hasReservedSeating,
            showtimeType: showtime.type,
            showtimeId: showtime.id,
          })),
        ),
      ),
    ),
  );

export function candidatesByChain(rows) {
  const byChain = new Map();
  for (const row of rows) {
    if (row.showtimeType !== "available") continue;
    const list = byChain.get(row.chain) ?? [];
    if (
      row.hasReservedSeating === false &&
      list.some((entry) => entry.hasReservedSeating === false)
    )
      continue;
    list.push(row);
    byChain.set(row.chain, list);
  }
  return byChain;
}

export function spreadOverTheaters(candidates, limit) {
  const queues = new Map();
  for (const candidate of candidates) {
    const queue = queues.get(candidate.theaterId) ?? [];
    if (
      !queue.some(
        (entry) =>
          entry.format === candidate.format &&
          entry.movieId === candidate.movieId,
      )
    )
      queue.push(candidate);
    queues.set(candidate.theaterId, queue);
  }
  const picked = [];
  const lists = [...queues.values()];
  for (
    let depth = 0;
    picked.length < limit && lists.some((list) => list.length > depth);
    depth += 1
  ) {
    for (const list of lists) {
      if (picked.length >= limit) break;
      if (list[depth]) picked.push(list[depth]);
    }
  }
  return picked;
}

export const showtimeCount = (movie) =>
  (movie.variants ?? []).flatMap((variant) =>
    (variant.amenityGroups ?? []).flatMap((group) => group.showtimes ?? []),
  ).length;
