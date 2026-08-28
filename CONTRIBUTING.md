# Contributing

## Prerequisites

- Node.js 24 or newer
- pnpm 11.24.0, pinned by `packageManager`
- [gitleaks](https://github.com/gitleaks/gitleaks), for the pre-commit secret scan
- [cloc](https://github.com/AlDanial/cloc) and [scc](https://github.com/boyter/scc), for
  the footprint report

Run `pnpm install` after cloning. The install registers the lefthook Git hooks.

## Quality gates

Pull requests run formatting, linting, spelling, type checking, dead-code analysis, unit
tests, the build, and the empty end-to-end harness. Run the same gates locally with:

```sh
pnpm format:check
pnpm lint
pnpm spell
pnpm typecheck
pnpm dead-code
pnpm test:unit
pnpm build
pnpm test:e2e
```

Three further jobs run alongside them. `footprint` measures the change and is described
below. `secrets` scans the pull request's commits with gitleaks. `dependencies` runs
`pnpm audit` and scans the lockfile against the OSV database; both fail on any advisory.

The pre-commit hook formats, lints, spell checks, and secret scans staged files. The
pre-push hook type checks the workspace, runs unit tests, and checks for dead code.

TypeScript uses strict checking, unchecked indexed access checks, and erasable syntax.
Biome uses its recommended rules plus the published
[`noExcessiveCognitiveComplexity`](https://biomejs.dev/linter/rules/no-excessive-cognitive-complexity/)
rule and its standard limit, which is the complexity gate. Unknown words go in the `words`
list in `cspell.json`.

## Footprint, comment load and bundle size

The `footprint` job reports lines added, removed and changed in four buckets, each split
into code and comments: product code from `apps/` and `packages/`, test code, build
tooling, and everything else, which is where configuration, documentation and the lock
file land. The total covers the first three, so a lock file rewrite is reported without
drowning the lines somebody wrote. The same report carries the cyclomatic complexity of
each bucket on both sides of the comparison, the comment-to-code ratio against the merge
base, and the absolute bundle size against the ratchet in `.size-limit.json`.

It goes to the run summary of every pull request, and to one pull request comment that is
updated in place as commits land. A pull request from a fork gets the run summary only,
because its token cannot write comments.

Two of the figures gate the merge. Comment load may not exceed the merge base, and no
bundle may exceed its ratchet. Raising a ratchet means editing `.size-limit.json`, which
is a reviewed line in the diff. When either fails, the report names both ways through
rather than only the verdict.

The cyclomatic figure gates nothing. It is scc's estimate, counted from branch and loop
keywords rather than from a syntax tree, and it is there so that complexity growth is as
visible as line growth. Complexity that fails a build is cognitive complexity, caught by
Biome above.

No figure here is an absolute this project invented. See
[ADR 6](docs/adr/0006-gates-cite-a-standard-or-measure-a-regression.md) for why each is
shaped the way it is, why the counter is cloc rather than scc or tokei, and what the
comment-load gate means while the merge base still carries no comments.

The tool is four modules and a wiring line. `report.ts` renders the Markdown and reaches
the verdicts, `measure.ts` decides which commands the counters get, `shell.ts` is the only
thing that starts a subprocess or touches the filesystem, and `main.ts` reads the
arguments and turns the verdict into an exit code. `index.ts` holds the wiring and nothing
else, because the mutation gate judges every file under `src` and a composition root is
the one place a test cannot reach: any logic left there would be logic nothing checks.

Run the report locally against a built tree:

```sh
pnpm build
pnpm footprint
```

It compares `HEAD` with its merge base against `origin/main`. Pass `--base` and `--head`
to compare something else, and `--out` to write the Markdown to a file.

## The nightly mutation gate

A test that cannot fail is worse than no test, because it reports safety it does not
provide, and nothing static tells one apart from a test that works. Mutation testing does:
it changes the code and asks whether the suite notices. `stryker.config.json` mutates the
`src` of every workspace package, and `.github/workflows/nightly.yml` fails on any mutant
no test kills. A file the unit suite does not judge shows up as an uncovered mutant and
fails the run just as a survivor does.

One thing is carved out: `apps/native`. ADR 3 puts everything correctness critical in
`packages`, and that application is a shell, so what is left in it is screens, and the only
test that kills a mutated screen is one that restates the screen. That is the tautology
this gate exists to detect, so it is excluded rather than given tests written to satisfy
it. `apps/web` stays inside the gate: it is the view layer that will hold real behaviour,
keyboard traversal among it, and it is an empty module today, so including it costs nothing
now and judges that logic on arrival rather than exempting it by a line written while the
directory was empty. What they are for is the end-to-end suite, which a mutation
run over the unit tests cannot stand in for. The stateless proxy is not part of the
carve-out: it has its own assertions, including that an unauthenticated request is
rejected, and a fail-closed check is exactly the kind most worth proving can fail.

The run is scheduled rather than attached to pull requests, and is deliberately not a
required check. It re-judges all of the code against all of the tests every time, so it
costs more than a pull request should carry and it never inherits a verdict from an
earlier run.

Run it locally with `pnpm test:mutation`. Two of its settings are less redundant than they
look. The vitest runner is named in `plugins` because Stryker resolves its own plugin
search against its package directory, which under pnpm holds no siblings to find. And
`inPlace` mutates the working tree for the length of the run rather than a copy of it,
because the copy is prepared by rewriting `tsconfig.json` through a TypeScript API that
TypeScript 7 no longer exposes. A run killed part way leaves the mutated files behind;
`git restore .` puts them back.

Do the work of a test inside the test. A mutant that stops a test file loading at all
produces no failing test, and the runner scores that as a survivor rather than a kill, so
a suite that derives its fixtures at module scope reports mutants as surviving that its
assertions would otherwise have caught.

## The Core import ban

`packages/core` must stay portable to any runtime, so it may not reach for the DOM,
React, React Native, or a runtime-specific API. Two gates hold that.

Its `tsconfig.json` sets `lib` to the language alone and `types` to nothing, so no
runtime's globals are declared to it. `document`, `window`, `caches`, `process` and
everything else supplied by a host rather than by the language are undeclared, and using
one is a type error. Core therefore has no `fetch` either: what it needs from a host
arrives as an injected dependency typed by core itself, which is the shape that keeps it
portable.

A Biome override on `packages/core/**` then covers what the compiler cannot see.
`noRestrictedImports` rejects React, React Native, Expo, Node, Cloudflare and sibling
workspace packages. `noRestrictedGlobals` rejects the host globals by name, which matters
because a single `/// <reference lib="dom" />` re-declares the whole DOM to the compiler
and the type error disappears.

Core's tests are compiled by a project of their own. `tsconfig.json` excludes
`src/**/*.test.ts` and `tsconfig.test.json` takes them, with the language's default
libraries and no emit, because the test runner's declaration files reference `setTimeout`,
`AbortSignal` and other host globals that core does not have and cannot be checked under
core's `lib`. Both projects are referenced from the root, so test code is type checked
rather than skipped, and the Biome override still covers all of `packages/core`: a
`document` in a core test is a lint error where it is no longer a type error.

See [ADR 3](docs/adr/0003-separate-view-layers-shared-core.md) for why.

## The fixture corpus

`packages/core/src/corpus` holds real responses from the upstream aggregator, captured
once and committed: nearby theaters, showtime listings, and forty two seat maps across
eleven Chains, forty one Auditoriums and rooms of forty six to three hundred and four
Seats. A twelfth Chain sells only general admission, and is present as the refusal its
seat map request returned, beside the two other refusals that capture met. Everything
that parses, normalises, scores or ranks is written against this.

Tests reach it through `captures.ts`, which imports each capture as a JSON module. Nothing
reads the filesystem, because reading files is a host API and Core does not have one.
`types.ts` states what may be read from a capture, and omits, among other unused fields,
the three that must not be read: the chain-specific seat label, which `type` already
carries normalised, and the two upstream seat counts, which disagree with the `seats`
array in most captured maps and with each other in half of them.

One of those shapes is declared in product code rather than here. A captured seat is an
`UpstreamSeat`, which the seat map adapter owns because it is the thing that parses one, and
the corpus is what checks that declaration against forty two real answers at compile time.

The corpus is not part of Core's compiled product. `tsconfig.json` excludes it and
`tsconfig.test.json` takes it, so `pnpm build` does not copy five megabytes of fixtures
into `dist`, and product code reaching for a fixture would have to put it back.

`pnpm corpus:refresh` replaces the captures, rewrites the index and formats it. It needs
`SEATSCOUT_UPSTREAM_ORIGIN` set to the aggregator's origin and `--zip` for the area to
capture. Neither has a default: the origin is deliberately not committed, and a committed
area would state where the operator searched from. It makes about fifty requests half a
second apart, so it never runs in CI or in a test.

It writes no response header, replaces every location query parameter in the recorded
request path, replaces every bootstrap cookie value wherever it appears, nulls the
`distance` each result was measured at, and exits non-zero if any of that material, or the
area passed to `--zip`, reaches a written file. What it does not do is disguise where the
capture was made: the theater list is a real metropolitan area's, in the order the
aggregator returned it, each theater with its own address and coordinates. Those are the
payload.

A refresh rewrites the manifest and the index together, so nothing that compares the two
can notice a thinner capture. `SPAN_THE_CAPTURE_REACHED` in `captures.test.ts` is what
notices: the Chains, Auditoriums and Auditorium sizes this corpus reaches, which a refresh
may exceed and may not fall below. Lowering it is a reviewed line in a diff, like the
bundle ratchet.

`seat-map.test.ts` asserts exact corpus-wide tallies instead, and those a refresh does have to
re-derive. They are floors nowhere because a floor cannot tell a mutation that judges one Seat
wrongly from one that judges none, which is the whole point of that suite. A refresh that moves
them is a refresh that has moved a measured fact, so it moves with the numbers quoted here and
in the seat status research.

The captured payloads themselves are excluded from Biome in `biome.json` and from cspell
in `cspell.json`. They are a recording rather than source: formatting them would stop them
matching what the capture writes, and spell checking third-party film and theater names
means adding a hundred and thirty six words to the dictionary to say nothing. This is not
a lint gap to close. The hand-written parts of the corpus are checked like any other code.

`.gitleaks.toml` carries one rule and one allowlist, both about this corpus. The rule
fires on a `Set-Cookie` or a bootstrap cookie name anywhere under the corpus, which is the
material redaction removes and which the default rules do not recognise as a secret. It is
scoped to the corpus, because the proxy is expected to name those headers in its own
source.

The allowlist covers the other direction. Captured ticketing URLs are committed verbatim,
hash included, because [ADR 4](docs/adr/0004-booking-ends-at-a-deep-link.md) forbids
reconstructing one, and that hash is high-entropy enough for a generic rule to fire on it
one day. Two things about the entry were established by running it rather than by reading
the schema. It matches the finding rather than the corpus path, because a path allowlist
stops gitleaks reading those files at all and would exempt the corpus from the scan it
exists to be under. And it is written as `[allowlist]` rather than `[[allowlists]]`,
because the version the scan job installs predates the array form and ignores it without
saying so, which would leave the entry silently inert.

## The fake upstream

Tests substitute at `fetch`, never at the Source port. The port exists, but no caller
varies across it, and substituting there would mock away the session handling, retry and
parsing the adapter is judged on. `packages/core/src/testing/fake-upstream.ts` is
therefore the seam the unit suite runs on. `fakeUpstream({ seed })` returns a `Fetch`, and
`Fetch` is declared in `packages/core/src/transport.ts` rather than borrowed from a host,
because the import ban leaves Core no host type to borrow. `FetchResponse` carries the
response headers as well as its status, because the session travels in a header and the
client owns it.

It replays the corpus by route. Every capture is indexed under the path it was recorded
at, query string dropped, because the capture redacts the location parameters and no
adapter would reproduce them. Pathname alone is a distinct key for every capture, which
`fake-upstream.test.ts` asserts rather than assumes, because two captures of one route
would otherwise leave the map holding whichever was indexed last. A route the corpus never
recorded rejects rather than answering, which is what a real `fetch` does with a request it
cannot satisfy, so nothing under test behaves differently for being under test. The three
refusals the capture met arrive as themselves rather than as an invented failure payload.

The capture writes no response header, so a replayed response reports none. That is what
the corpus holds rather than a simplification, and it is the piece a session lifecycle test
has to supply for itself.

Faults are scripted as a status and a share of requests in percent, drawn against a
hundred-slot table. `[{ status: 500, percent: 20 }, { status: 403, percent: 5 }]` is a
fifth of requests failing and a twentieth needing a session refresh. A script totalling
more than a hundred is refused rather than quietly truncated, because the slots past the
hundredth are unreachable and the later fault would fire at a rate nobody asked for. A
faulted response carries the scripted status and an empty body, because no body was ever
recorded for one.

A route the script names is answered from the script rather than from the corpus, with a
status, response headers and a body of its own, whether or not the corpus recorded that
route. That is where a session bootstrap answers: no capture holds one and none may, because
`.gitleaks.toml` treats `Set-Cookie` material under the corpus as a leak.

A rate cannot express "fail once and then succeed", so a route may also be given a sequence
of statuses, consumed in request order and then exhausted, after which that route answers
normally again. A sequence wins over a fault drawn for the same request, and both draws are
made either way, so scripting a sequence does not move the arrival order a test was written
against.

The returned `Fetch` carries a `requests` log: the path each request went to, query string
included, its method, its headers lowercased, and its body. That is what lets a test assert
which headers were sent rather than only that a request happened, and it is also what puts
a query string under the gate at all, since replays are keyed on pathname alone. It observes the
substitution point rather than adding one: tests still substitute at `fetch`.

Arrival order is where the seed earns its place. Every request draws a latency, and
requests issued in the same turn are delivered in latency order rather than request order,
so code that accidentally depends on completion order fails rather than passes. Nothing
sleeps: a batch is released on the next microtask and its promises are resolved in the
order the seed decided, so out-of-order arrival costs no wall clock at all. The generator
is `pure-rand`'s xoroshiro128+, and `fake-upstream.test.ts` asserts both directions of what
determinism means: one seed reproduces its order exactly, and another seed produces a
different one. Each request draws its latency and then its fault percentile, in that order
and always, so scripting faults into an existing test does not reshuffle the arrival order
it was written against.

What the seed produces is a permutation, so a wide fan-out is reordered and a narrow one
may not be: two concurrent requests arrive in the order they were made about half the time.
A test that turns on ordering at two or three requests therefore has to pin a seed that was
watched reordering them, the way the four-request test does, rather than assume any seed
will do.

The harness is not part of Core's compiled product. `tsconfig.json` excludes `src/testing`
beside `src/corpus` and `tsconfig.test.json` takes it, so nothing that imports the corpus
reaches `dist`. The import ban is untouched either way: the Biome override still covers
all of `packages/core/**`, and the harness imports nothing but the corpus and a generator
that is pure TypeScript.

## The Source port

`packages/core/src/source` is the port every read of the upstream aggregator goes through,
and the adapter behind it. It is internal on purpose: no caller varies across it, and
publishing it would oblige every caller to learn session handling and retry semantics to use
it. See [ADR 1](docs/adr/0001-single-aggregating-source.md).

Its three operations are domain questions rather than upstream routes: theaters near an area,
showtimes for a movie on a date in an area, and seats for a showtime. Discovery asks for 25
theaters, which is the number the corpus capture asks for. Every value the caller supplies is
escaped before it reaches a route, so an area holding an ampersand cannot rewrite the request.

What comes back is a reading: either the payload, or one of four reasons there is none.

| upstream | reading | remedy |
|---|---|---|
| 400, general admission | `noSeatMap` | the operator's own page; retrying can never work |
| 404, the screening has begun | `started` | the next screening |
| 410 | `soldOut` | another time at that theater |
| retries exhausted, the transport refused, the answer would not parse, or the circuit is open | `unreachable` | retry |

The first three are what the aggregator answers a **seat map** request with, so only the seat
map reads them. A 404 on a showtime listing is not a screening that has begun, and translating
it as one would be the leak this boundary exists to stop; on the other two operations those
statuses are failures like any other.

No status code, route or upstream field name exists above this boundary. Every reading also
carries when it was fetched and how many attempts it took, for one that failed as much as one
that read.

A reading's payload is the domain object the answer became: Theaters, a catalogue of
Showtimes, or Seats. The parsers that produce them live inside this adapter, so the boundary
does not move when one is added, and a reading is generic over what it carries rather than
over a response body every caller would parse again.

### Seats and Availability

`seat-map.ts` is both halves of the translation: `UpstreamSeat` describes the answer, `Seat`
describes what the rest of the application sees, and nothing carries an upstream word across.
A Seat carries its identifier, its drawn rectangle, its designation, the Availability
judgement, and the Provenance that judgement was made from.

**Availability fails closed.** A status is bookable only if it is on an explicit
known-bookable list, and every other status, recognised or not, is not bookable. The list has
one entry. Of the four statuses the corpus contains, three are undocumented or unexplained,
and a fifth that earlier notes claimed meant "available" was never once observed, so guessing
at any of them would be presenting a seat as free on the strength of a code nobody has
established the meaning of.

**Neither seat count is read, and neither can be.** The two count fields disagreed with the
`seats` array in twenty seven of the forty two captured Auditoriums; one reports available
seats where another reports total ones, and one reports more available seats than its array
holds. The parse narrows the answer to its `seats` array and to `UpstreamSeat`, neither of
which declares a count, so reading one is a compile error rather than a convention. The test
reads the Auditorium whose count field says twenty five and whose array holds three hundred
and four.

**Neighbour links are carried, never believed.** `leftNeighbour` and `rightNeighbour` are
whatever the aggregator sent, with its empty string translated to absence. They are a
cross-check and not adjacency: in one captured Auditorium of three hundred Seats, two hundred
and ninety carry no link at all while its drawn geometry is perfectly regular, so adjacency read
from links would yield nothing there. Adjacency comes from geometry.

**A partial answer is no answer.** An answer that is not JSON, that carries no `seats` array,
or that holds a seat missing any field a Seat is built from is refused rather than read into an
Auditorium with holes in it. An Auditorium short of Seats is worse than one that could not be
read, because only one of the two says so. `UpstreamSeat` declares exactly the nine fields the
translation reads and `SEAT_FIELDS` gives each of them a type, keyed by `keyof UpstreamSeat`, so
a field added to the one and not the other does not compile.

### The catalogue

`packages/core/src/source/catalogue.ts` turns two of those readings into the vocabulary
`CONTEXT.md` defines: an area into Theaters, and a Movie on a date in an area into
Showtimes, each carrying the Presentation it belongs to. One request answers a whole area,
so nothing is indexed and nothing is assembled from several.

`packages/core/src/domain/catalogue.ts` holds what comes out, and holds no upstream shape at
all. Four things keep the boundary enforced rather than observed, two of them at compile
time.

The aggregator's own response shapes are declared inside the adapter and exported from
nowhere, so no module above it can name one even deliberately. Those declarations are a deny
list as much as a description, in the way `src/corpus/types.ts` is: a field the adapter omits
cannot be read anywhere.

Identity is branded. A `ShowtimeId`, a `TheaterId`, a `MovieId` and a `TicketingUrl` are
declared as the types of the payload's own fields, so parsing a response is the only way to
obtain one. **This is what makes a constructed ticketing URL fail to compile** rather than
merely violate [ADR 4](docs/adr/0004-booking-ends-at-a-deep-link.md): a URL built from parts
is a `string`, and a `string` is not a `TicketingUrl`.

`Format` is a closed set. The aggregator names a premium presentation in free text among a
screening's amenities, several names to a screening, and there is a structured format field
beside them that carries four values across the whole corpus against the labels' forty five,
so the labels are what the adapter reads. It maps the ones it recognises onto Formats and
drops the rest, which leaves a screening standard rather than inventing a Format from a name
nobody has classified. That is the fail-closed rule Availability follows, applied where the
vocabulary is open. The table covers the labels the catalogue's own two answers carry.

The boundary is then measured rather than asserted. One test walks every key name in the
captured responses and every key name the domain emits, and holds their overlap to `id`,
`name` and `formats` exactly; another holds that no value the domain carries is one of the
aggregator's chain codes or its words for whether a screening is on sale. Widening either is
a line in a diff.

### What bookable means

Not what the aggregator says. Its own word for a screening on sale reads `available` for
screenings at a theater whose every captured seat map request is a 400, because those rooms
are general admission and have no seat map to fetch. The predicate that decides it is
reserved seating on the enclosing group of amenities, and it is asked first, because a room
that never has a seat map is a more durable fact about a Showtime than the time of day.

A Showtime is bookable when its Presentation has reserved seating, has not begun, and is not
sold out. Anything else is carried with the reason it is not, in the same words a seat map
refusal would come back with, so a Showtime the catalogue already knows to be unbookable
costs no request to find out. Those flags are read rather than the word itself: they agreed
with it in all 928 captured rows, they are total where a word is open, and reading them keeps
one more piece of upstream vocabulary out of the program.

An answer missing anything a Showtime or a Theater is built from is refused whole rather than
read into a listing with holes in it, for the reason a partial seat map is refused: a listing
short of a theater cannot be told from an area that is genuinely that empty.

### The session

The adapter opens a session once and holds it, and a fan-out of any width opens one rather
than one each, because concurrent callers join the bootstrap already in flight. A bootstrap
the aggregator refuses opens nothing, and the read fails rather than going on unauthenticated.
A request the aggregator rejects drops the session and re-opens it once per reading; a second
rejection is a failure like any other rather than a second bootstrap. Any response carrying a
session replaces the one held, because the proxy returns the whole jar rather than what
changed.

The session travels as `X-Upstream-Cookie` and arrives as `X-Upstream-Set-Cookie`, which is
what the proxy translates to and from the real headers, and never as `Cookie` or
`Set-Cookie`, which no browser exposes to script. A native transport renames the pair.

What the session is not is the thing the aggregator admits a request on. That is the
`Referer` the transport sets, and a request carrying no session but a `Referer` is answered
while one carrying a fresh session and no `Referer` is refused. The session is kept because
it carries the caller's location context, because the aggregator's own refusal text asserts a
session, and because re-opening it is the only recovery a client has.

### Retry and the circuit breaker

Retry is the "Full Jitter" of the AWS Architecture Blog's [Exponential Backoff And
Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/): each
delay is drawn uniformly from zero up to a window that doubles after every failed attempt.
Full rather than Equal Jitter, because that post's own simulation puts it ahead on both
client work and completion time, and a test asserts the delay can reach zero, which is the
difference between the two. The cap in the published formula is not implemented, because at
three attempts the window never reaches one.

The breaker is the three states of Nygard's *Release It!*, held as a consecutive-failure
count and the moment a break ends: closed while readings answer, open for a fixed break once
enough consecutive readings have failed, and half open for exactly one trial when that break
expires, because the request that finds a break just expired would otherwise be all of them at
once. It is asked before every attempt rather than once per reading, so an open circuit stops
work already under way. A refusal counts as an answer, because the aggregator answered. A
ratio over a sampling window, which is what current circuit-breaker libraries default to, does
not fit: their minimum throughput is a hundred calls and a whole search is forty eight.

What it counts is readings, so it bounds everything after the third failed one and not the
retries of readings already in flight. A fan-out whose readings all fail together therefore
spends its whole retry budget before the circuit can open; what the breaker saves is the rest
of a fan-out that fails progressively, and the next search.

Both are one policy, replaceable in full. Every default cites a published figure or a
measurement of the aggregator:

| default | value | what it rests on |
|---|---|---|
| attempts | 3 | what `tools/capture-corpus.mjs` already does against this aggregator; at the 7% error rate measured under fan-out a third attempt leaves about one in 2,800 |
| first delay | 500 ms | one measured round trip, bracketed by a 335 ms mean at concurrency 24 and a 510 ms median over five sequential reads |
| failures before opening | 3 | a failed reading is already three attempts, so a trip is nine consecutive upstream failures, which at the measured rate is not the independent error rate under any reading |
| break | 5 s | the published default of Polly's circuit-breaker strategy, and longer than a whole measured search |

### What Core cannot do for itself

Backoff needs a timer and the import ban leaves Core none, so `wait` is injected beside
`fetch`. `now` and `random` are injected too rather than defaulted from the language, because
a default no test exercises is a mutant no test kills.

## The normalised Auditorium

`packages/core/src/domain/auditorium.ts` puts every Seat of one Auditorium into the
coordinate system the rest of the application compares Seats in: a depth from 0.0 at the
front row to 1.0 at the back row, and a lateral from -1.0 at the far left through 0.0 on the
centreline to +1.0 at the far right. It reads `x`, `y` and `width` off a Seat and nothing
else.

**A row is a distinct `y`, and depth is that row's place in the order.** Every Seat of a row
carries one `y` in all 42 captured Auditoriums, and the count of distinct `y` values equals
the count of rows in all 42, so rows need no clustering tolerance and no invented threshold.
Depth is the row's rank over the last row's rank rather than its distance down the room,
because the maps are not drawn to one scale: one chain draws Seats on a square lattice, row
pitch equal to column pitch in all four of its captured rooms, where the other ten draw the
row pitch at 1.5 to 2.3 times the column pitch. A depth measured in map units would therefore
mean a different thing per chain. A property test draws each generated room twice, once as
generated and once with every row gap set to one, and holds the two sets of depths identical.

**Depth starts at the front row because nothing in a seat map locates the screen.** The
vertical offset that reads like a throw distance is the whitespace the background reserves
for the screen glyph, and it ranges from 1.9 to 11.4 seat widths across the corpus.

**The centreline and the span belong to the room, never to a row.** A Seat's lateral is its
own centre placed on the extent of every Seat centre in the Auditorium. Rows are neither
alike nor concentric: 25 of the 42 maps widen toward the back, 15 narrow, 2 are equal, and
one room spreads its row midpoints across 4.6 seat widths. Normalising a row against its own
extent would put the outermost Seat of a four-Seat row exactly where it puts the outermost
Seat of a thirty two Seat row, which is the opposite of what a normalised position is for.

**No label is read, and none can be.** `normalised` is generic over anything carrying `x`,
`y` and `width`, so a Seat's printed label is not nameable inside it and ordering by one is a
compile error rather than a convention. The corpus is the reason: 14 of the 42 rooms skip a
row index, one chain's four rooms label their Seats `101` to `919` with no letter anywhere, 6
of the 376 rows carry no agreed label prefix, and 33 of the 42 rooms number the Seats of a
row against the direction they are drawn in. A property test relabels every generated room
with a generated function and holds every position unchanged.

The generated rooms are adversarial rather than tidy: uneven row gaps, rows of differing
widths and origins, Seats of differing widths, coincident Seats, rooms of one row, rooms of
one Seat, Seats delivered in shuffled order, and labels whose letters and numbers both run
against the geometry.

## The native application

`apps/native` is an Expo application that launches and renders its own name. It carries no
product behaviour and nothing else in the workspace depends on it. It exists so the release
pipeline has something to sign and submit before there is a native application worth
shipping.

Its versions are not chosen here. Expo publishes the React and React Native version each
SDK pins, and this application matches SDK 57 exactly: React 19.2.3 and React Native
0.86.3.

One React version across the workspace is a correctness requirement rather than a
preference, because a duplicate surfaces as a runtime hook error rather than a build
failure. That is the one hazard here no gate would otherwise catch, so `react` is an
`overrides` entry in `pnpm-workspace.yaml` and a second version cannot be installed
whatever a package asks for. Raising it is one reviewed line, and it moves with the SDK
rather than with React's own releases. `pnpm why --depth=10 react` reports what is
installed rather than what was asked for.

Metro needs no configuration for the workspace. Expo has configured it for monorepos since
SDK 52 and resolves autolinked modules against the workspace since SDK 55, so there is no
`metro.config.js` to keep in step. `packages/core` and `packages/client` import into this
application with no configuration of any kind: no project reference, no Metro resolver
entry, and nothing relaxed in the Core ban. It does not depend on either yet, because both
still export nothing and knip removes a dependency nothing imports.

Two compiler options belong to this project alone. `lib` is `["ES2024"]` because React
Native is not a DOM host and declares its own `fetch`, `URL`, `Blob` and `FormData`;
leaving the default in place puts `lib.dom.d.ts` beside those declarations and produces 69
collisions between the two, across duplicate identifiers, mismatched property and variable
declarations, and differing modifiers. `skipLibCheck` is on because `expo-asset` ships a
declaration file importing a type from `@react-native/assets-registry`, which publishes no
types before 0.87 and cannot be raised to it: 0.87 deprecated the package and its
`registry.js` now re-exports `AssetRegistry` from `react-native`, which 0.86.3 does not
have, so raising it type checks and then fails at runtime. Neither option
covers for TypeScript 7: with the DOM library removed it checks React Native's own
declarations with no errors, and the same tree run through TypeScript 6.0.3, which is what
Expo's own SDK 57 template pins, reported the `expo-asset` error identically.

`updates.enabled` is `false` in `app.json` because over-the-air updates are deferred and
`expo-updates` is not installed. Expo's updates system is on by default, so leaving the key
out would state that the application updates itself through a library it does not have,
which is the disagreement knip's Expo plugin reports.

Run it with `pnpm --filter @seatscout/native start` and open the printed URL in Expo Go.
`/ios` and `/android` are ignored because `expo prebuild` generates them.

## The proxy

`apps/proxy` is the whole hosted component. It verifies the access layer's assertion,
translates the session headers, and forwards the upstream bytes without reading them. It
does nothing else, and `apps/proxy/wrangler.json` declares no storage binding, which a test
asserts against the file rather than against intent. Run it with
`pnpm --filter @seatscout/proxy dev`.

Three variables configure it and none is committed. `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD`
name the access application whose assertion is verified against the signing keys that team
domain publishes; `UPSTREAM_ORIGIN` is the aggregator a request is forwarded to. Missing
any of them, the proxy serves nothing, so a half-configured deployment fails closed.

On the web the session cannot travel in the cookie headers. The Fetch standard makes
`Set-Cookie` a forbidden response-header name, which a basic filtered response excludes
from what page scripts can read, and `Cookie` is a forbidden request-header that script
cannot set. The proxy therefore reads `X-Upstream-Cookie` and sends it upstream as
`Cookie`, and returns the session as `X-Upstream-Set-Cookie`, having merged what the
upstream set into what the caller sent, so the client can hold the value as an opaque
string. A native client sets `Cookie` itself and uses neither header.

Only `accept`, `content-type` and `user-agent` cross to the upstream alongside that cookie.
The caller's own cookies, the access assertion and the platform's `cf-` headers belong to
this hop and stay here. An upstream redirect is handed back rather than followed, because
one call to the proxy is one upstream request.

One header is added rather than forwarded. The aggregator admits a request on its `Referer`
and refuses one without it whatever cookies it carries, so the proxy sets `Referer` to the
origin of `UPSTREAM_ORIGIN`. The Fetch standard makes `Referer` a forbidden request-header
name that page script cannot set, so this hop is the only place it can come from, and
synthesising it here rather than passing the caller's through leaves the forwarding list an
allowlist. Without it every request through the proxy is refused.

See [ADR 2](docs/adr/0002-computation-on-the-client.md) for why.

## Dependency updates

Renovate runs self-hosted from `.github/workflows/renovate.yml`, so no GitHub App has to
be installed on the repository. Its first run opens an onboarding pull request that adds
the shared configuration.

The workflow falls back to its own token, which cannot update files under
`.github/workflows` and whose pull requests do not start a CI run. Set a `RENOVATE_TOKEN`
repository secret to a personal access token with the `repo` and `workflow` scopes to
lift both limits.

`overrides` in `pnpm-workspace.yaml` does two jobs. It holds `react` at one version for the
reason above, and it lifts a transitive dependency past an advisory its own package pins
below. It holds `qs` above
[GHSA-q8mj-m7cp-5q26](https://github.com/advisories/GHSA-q8mj-m7cp-5q26), which reaches
the workspace through Stryker, and `uuid` above
[GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq), which reaches it
through the Xcode project parser inside Expo's config plugins. `uuid` is held at 11.1.1
rather than at the newest patched release because that parser loads it with `require` and
uuid dropped its CommonJS entry point after 11. An entry is removable once the package
that pins it releases a version that does not.
