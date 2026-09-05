# 16. A search is a hot store that reports its coverage

Date: 2026-09-05

## Status

Accepted

## Context

A search reads one listing and then a seat map for every candidate the Query leaves. Some of
those reads fail, some rooms have no seat map to read, and some screenings the listing already
knows to be over. A list that shows what came back and says nothing about the rest is
indistinguishable from a list of everything there was, which is the failure `CONTEXT.md`
records under Coverage and the README promises against.

The results also arrive over about a second, out of order, and a screen has to be able to
render them without re-rendering every consumer on every answer.

## Decision

`packages/client/src/search.ts` is the mechanism the rest of the workspace exists for, and the
only place that composes all of it. `openSearch` takes the dependencies the catalogue phase
takes and answers with a function from a Query to a `Search`: `snapshot()`, `subscribe()`, a
terminal `done`, and `abort()`. A Search is hot, so the listing read starts when it is made
rather than when something is awaited. `done` settles with the terminal snapshot for every
answer a port can give; it is not wrapped in a catch, so a port that breaks its own contract
and rejects surfaces rather than being swallowed.

**A snapshot is the whole ranking, and its reference is stable between changes.** `snapshot()`
answers with the same object every time until something changes and a different one
afterwards, which is React's `useSyncExternalStore` contract and the reason that shape was
chosen: a store that builds a fresh object per call re-renders every consumer forever. Its
arrays are copies rather than the accumulators behind them, so a snapshot a caller is still
holding cannot change under it.

**Knowledge is monotone.** A result in one snapshot is in every later one, and no Coverage
outcome ever loses a member.

**Coverage has seven outcomes and its ledger closes in every snapshot.** `CONTEXT.md` names
them and states the arithmetic; what this decision settles is where each is filled in. Five
are populated by the listing before a request is spent, the fan-out adds to three of those
five from what a seat map refusal says and to `failed`, and the closing invariant is what
obliges every snapshot to carry the whole ledger rather than the last one only.

An expired screening is `started` and never `failed`, because a cached listing routinely offers
screenings that have begun and a retry cannot help one; `failed` stays the only retryable set,
and it is the one outcome keyed by `Showtime` alone rather than by `Showtime | Unidentified`,
because only an identified row is ever fanned out and so only an identified row can exhaust its
retries. It carries the Showtime rather than only its identity, because the rule that names an
outcome is that the user can act on it, and the screen offering the retry has to say which
Theater and which time it is offering to retry.

A Showtime at a Theater that has stopped selling is named rather than counted, and its remedy is
the operator's own page: retrying can never work while sales are off, and the fan-out never
reaches it, because the listing gave its reason before a request was spent. Only the listing ever
puts a Showtime there. No seat map refusal does, and the Reading the port hands back excludes the
reason, so a status code cannot be mapped to it by accident. That holds for as long as the
listing a search reads knows: a Theater that switches sales off inside the two hours its listing
is cached for is still described as selling by the entry the search reads, so those Showtimes are
fanned out, exhaust their retries and land in `failed` until the entry expires. Only a fresh
listing can say otherwise, and the alternative would be a status code meaning "this will never
work" sitting in a table beside the ones that mean "try again".

A Showtime the listing could not identify is the one candidate no request can be spent on, so
its shortfall stands for the life of the cache entry: only a fresh listing can restore an
identity, and the cache is what a search reads. That is why it is never offered a retry, and why
no result is ever built for it, which in turn means re-verification is never asked about one. Its
remedy is the operator's own page, through the ticketing URL its Coverage entry still carries.

**A listing that cannot be read is not a search with no candidates.** It settles in a phase of
its own, `unreachable`, because a screen that says "nothing matched" when nothing was looked at
is the silent partial result Coverage exists to prevent.

**The fan-out is 24 workers over one queue.** Twenty four is the measured optimum rather than a
number chosen here, from the timing table below. Workers pull from one shared iterator, so
nothing is indexed and no worker holds a slice. `abort()` abandons the queue rather than
cancelling what is already in flight: each worker stops at its next turn round the loop, no
further request is issued, an answer that arrives after it is discarded rather than recorded, and
`done` settles with the snapshot as it stood. An unbounded fan-out would issue every request in
one turn and leave `abort()` nothing to stop.

Every answer publishes, which re-sorts the results and copies the Coverage lists, so a search of
*n* candidates does *n* sorts and *n* copies. That is deliberate and it is what progressive
delivery costs: at the few hundred candidates a Query has, the work is trivial and the allocation
is short-lived. Coalescing the notifications is a rendering decision and belongs where the
rendering is.

**`createSeatScout` is the composition root, and it is what an application calls.** It takes the
Source's dependencies, the transport, the clock, the wait and the random draw, and optionally a
store, and answers with `search` and `verify` composed over one Source and one catalogue cache,
and with `profile` and `recent`, which remember a Seat Profile and a history of searches on that
same store. The store defaults to memory, so a caller that brings none still searches; the web
application brings Web Storage.

### The timing this rests on

This is the latency recorded against the live Source on 2026-08-23, before any of this code
existed. Every figure the live timing test uses comes from it and none is invented here.

| step | time |
|---|---|
| Every bookable Showtime for one Movie, one date, 31 Theaters | 375 ms |
| 48 seat maps at concurrency 24 | 0.67 s |
| the same 48 at concurrency 12 | 0.96 s |
| the same 48 at concurrency 6 | 10.30 s |

A whole search is therefore about 1.0 s, and concurrency 24 is roughly fifteen times faster than
6, which is what makes fan-out width the dominant performance lever in the system.

`packages/client/src/search.live.test.ts` runs one whole search against the live Source in the
same lane as the contract test and holds it to that table. It reads the listing, reads every
bookable candidate's seat map raw at the recorded optimum width, and then runs the real search
over the same work. Its fan-out is allowed the larger of two bounds: the recorded 0.67 s scaled
to the seat maps actually read, and the same raw pass taken moments earlier converted to its
concurrency-12 equivalent by the table's own ratio, which is to say no slower than the same work
at half the width. The whole search is then allowed that bound plus the recorded listing, which
is the 1.0 s figure written out from its parts.

Taking the larger of the two bounds is what keeps a slow afternoon at the Source from reading as
a regression in this code, and what it catches is a fan-out that has lost its width or grown a
stall, which is the only way this code can be the reason a search is slow. The width is written
out in the test rather than imported: if the fan-out's own width ever changed, the recorded bound
would catch it, so the two do not have to be the same constant to be comparable. It spends
roughly two searches' worth of requests: one raw pass and one real one.

## Consequences

An interface can always answer "what did you not check", because the ledger closes in every
snapshot rather than only in the last. That is what
[ADR 19](0019-the-list-is-painted-once.md)'s coverage strip and ledger are built on.

A search's own reading of the world sits in the nightly lane rather than in `quality`, for the
reason [ADR 11](0011-a-nightly-reading-judges-the-world.md) gives, and a failure there opens the
same issue as a contract divergence.

The catalogue read is not on the composition root, because nothing captured can serve a
Movie-less one. [ADR 1](0001-single-aggregating-source.md) records what that would cost.
