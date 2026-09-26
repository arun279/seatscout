# 20. A search over several days reads 48 seat maps at a time

Date: 2026-09-25

## Status

Accepted. It amends [ADR 16](0016-a-search-reports-its-coverage.md), which read every seat map
a listing named, and [ADR 17](0017-retry-and-the-breaker-follow-published-policy.md), which
retried a 403.

## Context

A person looking for good seats rarely has one evening in mind. A Query that names one date
makes them search again for each evening they could go, which is the chore this application
exists to remove.

The Source has no route for more than one date. A listing is one Movie, one date and one area,
and a seat map is one Showtime, so a search over several days costs a listing a day and a seat
map for every bookable Showtime in all of them. One date near one area already names between 48
and 185 bookable Showtimes. The Source refuses a burst somewhere between 48 and 200 seat maps:
read at width 24 in one night, 1,479 maps met 361 refusals, 200 met 46, and 48 met none. A
refusal answers 403, and it outlasts the burst: a single request polled every 30 seconds after
one was refused for 6 minutes 2 seconds, and was first answered at 6 minutes 32 seconds.

## Decision

**The days of a Query reach the search as a list.** The Ask sheet writes a Query's days into
the address, in `date`: repeated for the days picked, `first..last` for a range, and `any` for
any day in the next `HORIZON` days, 7, in `packages/view-logic/src/when.ts`. A one-day Query has
the address it always had. `askedFrom` expands those days into the list of dates a search is
given, and the search reads exactly those.

**Every day's listing is read first.** A search asks for each day's listing, one request a day,
before it asks for any seat map, so the candidates of every day are counted at once. Each day's
listing is cached under its own date, as a one-day listing always was.

**Over several days, seat maps are read nearest day first, 48 at a time.** `SEAT_MAP_BUDGET` in
`packages/client/src/budget.ts` is 48, the largest batch the Source was measured to answer
without a refusal. The maps are asked for through the fan-out's width of 24, in the order the
listings name them, the nearest day's first. What the budget leaves is counted per day as not
read yet, and `readMore()` reads the next 48. Nothing asks for more on a person's behalf.

**A one-day search reads its whole listing, as it always has.** The control that asks for more
is on the phone's coverage strip and not yet on every screen, so a one-day search held to 48
would read less than it does today with no way on where that control is missing. It moves under
the budget once every screen has the control; until then the budget governs exactly the
searches this decision adds.

**A 403 stops the search.** Every route reads 403 as `refused`, answered at once and never
retried, because asking again while the Source is refusing lengthens the refusal. A search that
is refused asks for no further seat map, `readMore()` and `retry()` do nothing, and its snapshot
says so. A new search is a deliberate act of the person and starts again.

**Each result carries its own day.** A result's `terms.date` is the day whose listing named its
Showtime, which is what re-verification reads the listing by. The list is banded by day, nearest
first, and ranked by score within each day. The ranking and a Seat Group's identity do not
depend on the day.

**A time window is a clock on every day.** `from` and `until` are times of day, and each day's
listing is narrowed to its own date at those times.

**A remembered search keeps its days.** It keeps them as the address writes them, so the days
picked, a range and any day all run again as they were asked. The history moves from
`seatscout.recent.v1` to `seatscout.recent.v2`, and a history kept under the first is read into
the second, each search on its own date.

## Consequences

A search over seven days reads seven listings and 48 seat maps before it settles, where seven
one-day searches would have read up to seven whole listings of seat maps. The rest is one
deliberate step away rather than a burst the Source may refuse.

A one-day search still reads as many seat maps as its listing names, up to 185 on the widest
release measured, which is inside the band where the Source begins to refuse. That is the risk
this application already carried, and a 403 now stops it rather than being retried into a block.

The budget protects the Source and the horizon does not. Seven listings are seven requests, the
cheapest reads the Source answers, and a week is the span people plan an evening over.

What the Source counts is the burst, not the device, so the budget is spent per search rather
than kept across searches. The measured refusal went with the burst rather than with the client,
the hour or the route.

The budget is one constant and the horizon another, each defined once and each a measurement or
a decision on record, so a change to either moves one line.

Three things are left for later on purpose. Within the budget the order is the listing's own,
not one that puts the likeliest rooms first by time or format. A step reads the next 48 seat maps
rather than the next whole day, so a step can end part way through a day and say so. And a Query
that names no day still means today.
