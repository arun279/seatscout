# 10. The corpus is the contract, and the test seam is `fetch`

Date: 2026-09-05

## Status

Accepted

## Context

Everything this application does to a seat map is a translation of somebody else's JSON.
Fixtures written by hand would describe the answer this project expects rather than the
answer the aggregator sends, and every measurement taken from them, every row count, every
gap distribution, every disagreement between two count fields, would be a measurement of
what somebody assumed.

There is also a choice of where a test substitutes. The obvious seam is the `Source` port:
it is an interface, it is already there, and a fake behind it is three lines. Substituting
there would mock away the retry, the circuit breaker and the parsing, which is most of what
the adapter is judged on.

## Decision

**Real answers are captured once and committed.** `packages/core/src/corpus` holds nearby
theaters, showtime listings, and forty two seat maps across eleven chain codes, forty one
Auditoriums and rooms of forty six to three hundred and four Seats. A twelfth code sells only
general admission, and is present as the refusal its seat map request returned, beside the
two other refusals that capture met. Those are the aggregator's codes rather than domain
Chains, three of the twelve having no Chain to map onto. Everything that parses, normalises,
scores or ranks is written against this.

Tests reach it through `captures.ts`, which imports each capture as a JSON module. Nothing
reads the filesystem, because reading files is a host API and Core does not have one.
`types.ts` states what may be read from a capture, and omits, among other unused fields, the
three that must not be read: `chainType`, the chain-specific seat label, which the normalised
seat type already carries, and the two upstream seat counts, which each disagree with what
they count in twenty seven of the forty two captured maps.

One of those shapes is declared in product code rather than beside the corpus. A captured
seat is an `UpstreamSeat`, which the seat map adapter owns because it is the thing that
parses one, and the corpus is what checks that declaration against forty two real answers at
compile time.

The corpus is not part of Core's compiled product. `tsconfig.json` excludes it and
`tsconfig.test.json` takes it, so a build does not copy five megabytes of fixtures into
`dist`, and product code reaching for a fixture would have to put it back.

**A refresh may widen the corpus and may not narrow it.** A refresh rewrites the manifest and
the index together, so nothing that compares the two can notice a thinner capture.
`SPAN_THE_CAPTURE_REACHED` in `captures.test.ts` is what notices: the Chains, Auditoriums and
Auditorium sizes this corpus reaches, which a refresh may exceed and may not fall below.
Lowering it is a reviewed line in a diff, like the bundle ratchet.

`seat-map.test.ts` asserts exact corpus-wide tallies instead, and those a refresh does have
to re-derive. They are floors nowhere, because a floor cannot tell a mutation that judges one
Seat wrongly from one that judges none, which is the whole point of that suite.

**A capture is redacted and is not disguised.** The refresh writes no response header,
replaces every location query parameter in the recorded request path, replaces every
bootstrap cookie value wherever it appears, and nulls the distance each result was measured
at. What it does not do is hide where the capture was made: the theater list is a real
metropolitan area's, in the order the aggregator returned it, each theater with its own
address and coordinates. Those are the payload. The area is not defaulted, because a refresh
replaces every fixture and a silent default would let someone re-anchor the corpus on another
metropolitan area without noticing they had.

`.gitleaks.toml` carries one rule and one allowlist, both about this corpus. The rule fires
on a `Set-Cookie` or a bootstrap cookie name anywhere under the corpus, which is the material
redaction removes and which the default rules do not recognise as a secret. It is scoped to
the corpus, because the proxy is expected to name those headers in its own source. The
allowlist covers the other direction: captured ticketing URLs are committed verbatim, hash
included, because [ADR 4](0004-booking-ends-at-a-deep-link.md) forbids reconstructing one,
and that hash is high-entropy enough for a generic rule to fire on it one day. Two things
about the entry were established by running it rather than by reading the schema. It matches
the finding rather than the corpus path, because a path allowlist stops gitleaks reading
those files at all and would exempt the corpus from the scan it exists to be under. And it is
written as `[allowlist]` rather than `[[allowlists]]`, because the version the scan job
installs predates the array form and ignores it without saying so, which would leave the
entry silently inert.

The captured payloads are excluded from Biome in `biome.json` and from cspell in
`cspell.json`. They are a recording rather than source: formatting them would stop them
matching what the capture writes, and spell checking third-party film and theater names means
adding more than a hundred words to the dictionary to say nothing. This is not a lint gap to
close. The hand-written parts of the corpus are checked like any other code.

**Tests substitute at `fetch`, never at the Source port.** The port exists, but no caller
varies across it, and substituting there would mock away the retry and parsing the adapter is
judged on. `packages/core/src/testing/fake-upstream.ts` is therefore the seam the unit suite
runs on. `fakeUpstream({ seed })` returns a `Fetch`, and `Fetch` is declared in
`packages/core/src/transport.ts` rather than borrowed from a host, because the import ban
leaves Core no host type to borrow. `FetchResponse` carries a status and a body and nothing
else, because nothing Core does reads a response header.

It replays the corpus by route. Every capture is indexed under the path it was recorded at,
query string dropped, because the capture redacts the location parameters and no adapter
would reproduce them. Pathname alone is a distinct key for every capture, which
`fake-upstream.test.ts` asserts rather than assumes, because two captures of one route would
otherwise leave the map holding whichever was indexed last. A route the corpus never recorded
rejects rather than answering, which is what a real `fetch` does with a request it cannot
satisfy, so nothing under test behaves differently for being under test. The three refusals
the capture met arrive as themselves rather than as an invented failure payload.

Faults are scripted as a status and a share of requests in percent, drawn against a
hundred-slot table. A script totalling more than a hundred is refused rather than quietly
truncated, because the slots past the hundredth are unreachable and the later fault would
fire at a rate nobody asked for. A faulted response carries the scripted status and an empty
body, because no body was ever recorded for one. A route the script names is answered from
the script rather than from the corpus, whether or not the corpus recorded that route. A rate
cannot express "fail once and then succeed", so a route may also be given a sequence of
statuses, consumed in request order and then exhausted; a sequence wins over a fault drawn
for the same request, and both draws are made either way, so scripting a sequence does not
move the arrival order a test was written against.

The returned `Fetch` carries a `requests` log: the path each request went to, query string
included, its method, its cache mode, its headers lowercased, and its body. That is what lets
a test assert which headers were sent rather than only that a request happened, and it is
also what puts a query string under the gate at all, since replays are keyed on pathname
alone. The cache mode is logged as `null` where a caller asked for nothing, so a test that
asserts the adapter asks for `no-store` is distinguishable from a recorder that always says
so. It observes the substitution point rather than adding one.

**Arrival order is where the seed earns its place.** Every request draws a latency, and
requests issued in the same turn are delivered in latency order rather than request order, so
code that accidentally depends on completion order fails rather than passes. Nothing sleeps:
a batch is released on the next microtask and its promises are resolved in the order the seed
decided, so out-of-order arrival costs no wall clock at all. The generator is `pure-rand`'s
xoroshiro128+, and `fake-upstream.test.ts` asserts both directions of what determinism means:
one seed reproduces its order exactly, and another seed produces a different one. Each request
draws its latency and then its fault percentile, in that order and always, so scripting faults
into an existing test does not reshuffle the arrival order it was written against.

## Consequences

Every measurement in the domain records is a measurement of real rooms, and a refresh that
moves one is a refresh that has moved a measured fact.

The harness is not part of Core's compiled product either. `tsconfig.json` excludes
`src/testing` beside `src/corpus` and `tsconfig.test.json` takes it. The import ban is
untouched: the Biome override still covers all of `packages/core/**`, and the harness imports
nothing but the corpus and a generator that is pure TypeScript.

What the seed produces is a permutation, so a wide fan-out is reordered and a narrow one may
not be: two concurrent requests arrive in the order they were made about half the time. A
test that turns on ordering at two or three requests therefore has to pin a seed that was
watched reordering them rather than assume any seed will do.

The corpus is a recording of one moment. It cannot notice the upstream changing shape, which
is what [ADR 11](0011-a-nightly-reading-judges-the-world.md) exists for.
