# 1. One aggregating source rather than per-chain adapters

Date: 2026-08-22

## Status

Accepted

## Context

The application must find seats across every cinema chain in a user's area. The obvious
structure is one adapter per chain: an AMC adapter, a Cinemark adapter, and so on.

Investigation showed that structure would be largely wasted work.

A single upstream aggregator already covers eleven chains from one integration. One
request for a movie and date returned thirty one theaters spanning AMC, Cinemark, Alamo
Drafthouse, Regal, Studio Movie Grill, Galaxy, Cinepolis, and four others. More
importantly, its seat map endpoint returns an identical schema for every chain, including
per seat geometry, adjacency, and status. Chain specific seat parsing is not required.

Building per chain adapters instead would mean an integration, a schema, and a breakage
surface per chain, to reach coverage the aggregator already provides. It would also leave
chains with no public interface entirely uncovered.

The chains do not offer a viable alternative. Only one of the covered chains publishes a
public API, and that API's documentation states its ecommerce and transaction endpoints
are restricted and not being granted. Another of the largest chains publishes no public
developer interface at all for this market.

Against this, a single source is a single point of failure, and it is an interface that
carries no stability guarantee.

## Decision

Define one `Source` port covering discovery, showtimes, and seat maps. Ship a
single implementation of it: the aggregator.

Add a second implementation only where an independent source genuinely exists, and add it
for verification and fallback rather than for coverage. The one chain with a public
catalogue API is the second implementation whenever it is built. Nothing has built it: the
tree carries one module that builds a `Source` and no adapter for that chain, so the
cross-source verification this decision promises is not available for any chain today.

Coverage of a chain and the number of sources are separate concerns. Adding chains is not
a reason to add adapters.

The port is internal. No caller varies across it, and publishing it would oblige every
caller to learn its retry semantics to use it. What crosses it is recorded in
[ADR 9](0009-no-upstream-word-crosses-the-boundary.md).

## Consequences

Eleven chains are supported from the first release, with one integration to maintain and
one seat schema to parse.

The port is defined before a second implementation exists, which is ordinarily premature.
It is justified here because a second implementation is known to be coming for
verification, and because the port is what keeps upstream vocabulary from leaking into the
domain.

Because one source supplies almost everything, its failure is the system's failure.
Degradation must therefore be visible rather than silent, and the recovery path is the
verification adapter.

Cross source verification is available for exactly one chain. For every other chain,
correctness rests on internal invariants rather than on a second opinion. This is a limit
of what exists publicly, not a prioritisation, and the interface states which applies to
each result.

**There is no Movie-less catalogue read, and what it would cost is why.** The interface
sketch has a catalogue of an area and a date beside the search. The aggregator's
theater-centric route is the only captured answer that could serve it directly, and it
cannot. It states no instant: its rows carry a wall-clock time and the date the request
asked for, with no offset, no zone and no UTC time anywhere, while a Showtime carries the
instant its listing states and the narrowing filter parses it. And it states no Movie the
way a Presentation is built from one, because `MovieId` is branded as the type of a field
it does not carry and the movie identity it does carry is a number one level up, so minting
one would need the type assertion this workspace refuses. `captures.test.ts` holds both
absences against the capture, so a refresh that ever records either fails the suite rather
than leaving the decision to be remembered. The live route was read again on 2026-09-04 and
still stated neither, which the test does not check and cannot: it holds the capture.

What is left is a composition, and this Source refuses the fan-out it implies. A theater
list, then the movies at each theater, then the listing route the adapter already reads for
each of those movies, would answer it in the vocabulary that already works. Resolving one,
measured against the live Source on 2026-09-04 over the area the corpus is anchored on,
costs 1 + 25 + 56 requests and 1.5 to 1.8 s over two readings at the fan-out width the
search uses, against the one request and 375 ms a movie-centric read costs, so that half is
affordable. What it resolves to is not. One date in that area holds 1,479 bookable Showtimes
where the widest single release holds 185, and neither search narrows to the 25 Theaters the
discovery route names unless the Query names Theaters, so both figures span the same 45
theaters and a Movie-less search reads eight times the seat maps of a Movie search on the
same date.

**What the Source answers is bounded between those two, and it was read three times in one
night to say so.** All 1,479 at that width: 361 answered 403. Two hundred of them: 46
answered 403. Forty eight, the batch the recorded timing table was measured on: none. The
clean reading was taken last, after the refused one, which is what rules out a client the
Source was still holding off rather than a burst it would not answer. So the refusal begins
somewhere between 48 and 200 seat maps in one fan-out, and where exactly was not pursued,
because narrowing it means provoking a third party's refusal repeatedly and the bound
already decides the question. After the 1,479-map read the Source refused every request from
this client for at least six minutes.

Per-map wall clock is not evidence here and is not cited as any: 78.8 ms at 48 maps, 47.0 ms
at 200 and 37.6 ms at 1,479, which runs backwards because a refusal returns faster than an
answer, and confounded against the recorded table besides, the clean 48-map read that night
being 5.6 times slower than the same batch on 2026-08-23. That is the confound the live
timing test already answers, by taking the larger of the recorded baseline and a raw pass
measured the same moment.

A narrowing term does not rescue it, and that is measured rather than argued. The windows
that date leave 639 candidates from 17:00, 575 from 18:00, 306 between 19:00 and 22:00 and
200 between 19:00 and 21:00, and 200 is the reading that met 46 refusals. A two-hour window
is already about as tight as a Query gets, and nothing obliges a Movie-less Query to carry
one at all. Nor does a narrower fan-out help: the same table puts 48 maps at 10.30 s at
width 6, so 1,479 of them is minutes before any refusal. What would lift this is a Source
that answers the volume, or a bound this code can guarantee rather than one a caller may or
may not pass.
