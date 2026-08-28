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

Define one `ShowtimeSource` port covering discovery, showtimes, and seat maps. Ship a
single implementation of it: the aggregator.

Add a second implementation only where an independent source genuinely exists, and add it
for verification and fallback rather than for coverage. The one chain with a public
catalogue API is that second implementation.

Coverage of a chain and the number of sources are separate concerns. Adding chains is not
a reason to add adapters.

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
