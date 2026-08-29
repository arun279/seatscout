# Contributing

## Prerequisites

- Node.js 24 or newer
- pnpm 11.24.0, pinned by `packageManager`
- [gitleaks](https://github.com/gitleaks/gitleaks), for the pre-commit secret scan
- [cloc](https://github.com/AlDanial/cloc), for the footprint report
- [actionlint](https://github.com/rhysd/actionlint) and
  [shellcheck](https://www.shellcheck.net), for the workflow and shell checks in the
  `quality` job

Run `pnpm install` after cloning. The install registers the lefthook Git hooks.

## Quality gates

Pull requests run the `quality` job, which is the list below in the order it runs them,
and three further jobs described after it. The end-to-end suite drives a real browser, so the
`quality` job installs Chromium before it runs, and it runs after the build because what it
loads is the built output. The accessibility gate lives there too: axe-core scans the shell
against WCAG 2.2 at levels A and AA and a violation fails the job. `pnpm test:e2e` lists the
tests tagged `@accessibility` before it runs anything, so the suite has to still hold that
scan for the run to start. Run the same gates locally with:

```sh
pnpm format:check
pnpm lint
actionlint
shellcheck deploy/*.sh
pnpm spell
pnpm typecheck
pnpm dead-code
pnpm live-injections
git ls-files '*.ts' '*.tsx' | xargs pnpm -s instrumented
pnpm cache-storage
pnpm counts
pnpm test:unit
pnpm build
pnpm --filter @seatscout/proxy exec wrangler deploy --dry-run
pnpm test:e2e
```

The list is the job, not a selection from it. Running a shorter one and finding it green is
how a contributor arrives red on a pull request, which is what this list is for.

Three further jobs run alongside them. `footprint` measures the change and is described
below. `secrets` scans the pull request's commits with gitleaks. `dependencies` runs
`pnpm audit` and scans the lockfile against the OSV database; both fail on any advisory.

`pnpm counts` holds a count stated in prose to the structure that carries the items. Four
times a sentence in this repository has counted something the code beside it had outgrown,
and every one was found by a reader rather than by anything that runs. `CONTEXT.md` said
Reference penalises three things and later four while the sum charged one more than
either. `CONTRIBUTING.md` said the nightly contract test reports six things while
`Divergence` carried eight, because the ticket that added the sellability kind stopped at
the code.

`tools/counts-in-prose.mjs` declares every such pair outright, the sentence and the
declaration it counts. It reads the number word out of the one and counts the interface
fields, union alternatives, object-literal weights or configuration keys of the other, and
fails when they disagree. The pairs cover Coverage, the Seat Profile's weights and
modelled distances, a Seat Group's bands, `UpstreamSeat`, `Catalogue`, the `Source` port,
`Unverified`, the divergence kinds and the denied globals.

It asserts nothing it was not told about, so it raises nothing a reader has to weigh and
cannot go off for a sentence nobody declared. It fails just as loudly when the sentence
has been reworded out from under it, when the declaration has been renamed, and when a
declaration is spelled in a way it cannot read, because a pair that quietly stops matching
is a pair that has stopped holding. Rewording one of those sentences therefore costs a
line in the declaration too, which is the trade the bundle ratchet already makes: the
number moves in a diff a reviewer reads.

Two limits are worth having in front of you rather than discovering. A count written
tomorrow is unguarded until it is declared, and nothing forces the declaration. And each
pair compares the numeral and nothing else, so a sentence that states the right count over
a list one item short still passes; the gate stops a count going stale and does not stop
an enumeration going short. There is no figure to choose in either half, which is why
[ADR 6](docs/adr/0006-gates-cite-a-standard-or-measure-a-regression.md) does not reach
this gate: that decision governs a gate that needs a number, and the exact checks beside this
one, the import ban and `pnpm live-injections` and `pnpm cache-storage`, sit outside it
for the same reason. The two facts this one compares are both in the repository.

The pre-commit hook runs six checks over staged files: it formats, lints and spell checks
them, refuses a source carrying mutation-test instrumentation, refuses a reach for Cache
Storage under `apps/web` and `apps/proxy`, and scans for secrets. The pre-push hook runs
four over the whole workspace: it type checks, runs unit tests, checks for dead code, and
holds the counts stated in prose. `lefthook.yml` is where both are declared.

TypeScript uses strict checking, unchecked indexed access checks, and erasable syntax.
Biome uses its recommended rules plus two published ones. The standard limit of
[`noExcessiveCognitiveComplexity`](https://biomejs.dev/linter/rules/no-excessive-cognitive-complexity/)
is the only complexity gate, and
[`noUnsafeTypeAssertion`](https://biomejs.dev/linter/rules/no-unsafe-type-assertion/) refuses
a type assertion, which is the widest way past the compile-time guarantees below. Unknown
words go in the `words` list in `cspell.json`.

A complexity failure names the file, the function, its score and the limit, and asks to
refactor the function until the score is under the limit; extracting part of it is the
usual way. There is no figure to weigh and no exemption to grant. Suppressing the rule in
place would take a comment, and comment load is gated separately, so the way through is the
refactor. Cyclomatic complexity is not measured at all;
[ADR 6](docs/adr/0006-gates-cite-a-standard-or-measure-a-regression.md) says why.

## Footprint, comment load and bundle size

The `footprint` job reports lines added, removed and changed in four buckets, each split
into code and comments: product code from `apps/` and `packages/`, test code, build
tooling, and everything else, which is where configuration, documentation and the lock
file land. The total covers the first three, so a lock file rewrite is reported without
drowning the lines somebody wrote. The same report carries the comment-to-code ratio
against the merge base, and the absolute bundle size against the ratchet in
`.size-limit.json`.

It goes to the run summary of every pull request, and to one pull request comment that is
updated in place as commits land. A pull request from a fork gets the run summary only,
because its token cannot write comments.

Two of the figures gate the merge. Comment load may not exceed the merge base, and no
bundle may exceed its ratchet. Raising a ratchet means editing `.size-limit.json`, which
is a reviewed line in the diff. When either fails, the report names both ways through
rather than only the verdict. A run that weighed no bundle at all, which is what a glob
matching no file produces, fails the job outright rather than reporting a verdict over a
measurement that did not happen.

The bundle figure is brotli, summed per file, over every script `apps/web`'s own Vite
build emits. The slice of the workspace packages that build reaches is inside the bundle,
so it is counted where a browser would receive it rather than named in an import statement
the measurement never follows. It is defined as what the build publishes rather than as what
a page downloads. Today the two coincide, since the page loads the module and the browser
fetches the worker beside it, but the definition stays the build's output so that the figure
keeps meaning the same thing the day a build emits a chunk no page reaches. The page itself
and its manifest are not scripts, so neither is in it.

`apps/web/vite.config.ts` is that build, and `pnpm build` runs `tsc --build` across the
workspace before it, because a bundler transpiles without type information and the
directory it writes is the one the deployment publishes. The minifier is Vite's own
default: a bundle this small is not the evidence on which to pick another.

The line counts gate nothing, and describe the change rather than judging it. The other
figures are either a gate's verdict or the operands it is computed from, so nothing here is
a bare total left for a reader to form a private opinion about.

No figure here is an absolute this project invented. See
[ADR 6](docs/adr/0006-gates-cite-a-standard-or-measure-a-regression.md) for why each is
shaped the way it is, why the counter is cloc rather than scc or tokei, and what the
comment-load gate means while the merge base still carries no comments.

The tool is four modules and a wiring line. `report.ts` renders the Markdown and reaches
the verdicts, `measure.ts` decides which commands the counter gets, `shell.ts` is the only
thing that starts a subprocess, and `main.ts` reads the
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
keyboard traversal among it, and the platform adapters it already holds are judged there
rather than exempted by a line written while the directory was empty. That is why the
browser store adapter has unit tests of its own beside the browser run of its contract: a
suite the mutation gate cannot execute cannot be what judges a mutated adapter. What
`apps/native` is for is the end-to-end suite, which a mutation
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

## The nightly contract test

The mutation gate judges the code against the tests. Nothing above it judges the world: every
other test runs against the committed corpus, so the whole suite stays green while the
upstream quietly changes shape underneath it. `packages/core/src/testing/contract.ts` is what
notices. It reads one seat map answer and reports every way it diverges from what the corpus
recorded, and it reads a live area and a live listing and reports either one that no longer
becomes a domain object or arrives with nothing in it. `contract.live.test.ts` holds the live
aggregator to that, and `.github/workflows/contract.yml` runs it nightly.

The same lane carries one more reading of the world: the live search timing described under
Running a search. A failure there opens the same issue, because the two are the same
question asked of the same Source, and the run log names which of them it was.

It states an assumption about the world rather than behaviour of this code, so it is not a
required check and never gates a pull request. The mutation gate is off that list for a
different reason, cost, and the two arguments are not interchangeable. `pnpm test:live` runs it against
`SEATSCOUT_UPSTREAM_ORIGIN` and `SEATSCOUT_AREA`, neither of which has a default for the
reason `corpus:refresh` has none. It has a vitest configuration of its own, and the root
configuration excludes `*.live.test.ts`, so neither the unit suite nor the mutation run ever
reaches the network.

**The corpus is the contract.** The recorded vocabulary is derived from the 42 captured maps
at the point of use rather than written down beside them: the top-level and seat key sets,
the four seat statuses and the three seat types. Nothing has to be kept in step with a
refresh, and a list written by hand cannot drift from what was measured. Eight things are
reported: a body that is not JSON, a field the parse needs and the answer no longer carries,
an answer that parses into nothing at all, a key never captured before, a seat status outside
the recorded vocabulary, a seat type outside it, a listed screening the catalogue did not
refuse that carries no word for on sale, and a neighbour link that disagrees with the
geometry.

**An unrecognised seat type is why this exists at all.** The seat map adapter maps a type it
does not recognise to `standard` rather than failing closed on it, deliberately, because
failing closed would drop whole Chains out of every search for the sake of a word nobody had
classified. That is only safe while something notices the vocabulary moving, and this is that
something. Availability is the other way round and fails closed, so a status outside the
recorded set is reported here rather than reaching a result as a Seat nobody can buy.

**The neighbour links are the live half of an invariant the corpus already carries.** The
Seat Group test holds all 10,974 captured links to the geometric bands; that guards the
fixtures. Here every link a live map sends must name the Seat immediately beside it in the
same row, on the side it claims, across a gap the same band rule calls contiguous. It is the
adapter's own rule applied to today's rooms, not a second copy of it.

**A refusal is not a divergence.** The aggregator declines a seat map request often and
politely, and it is wrong to report that as the shape having moved: a Showtime that sold out
overnight would turn this red, and a check that is red for reasons nobody can act on is a
check people learn to ignore. Only a 200 is judged. The reasons a refusal carries are not
judged either, because the adapter reads the status code and not the reason, and because the
first live run met a reason the corpus never captured. What guards against a wholesale
refusal is coverage: at least one answer must read as an Auditorium with Seats in it, so an
upstream that refuses everything fails rather than passing vacantly.

**The catalogue is judged the same way, and on one word further.** A live area must read into
Theaters and a live listing into a Catalogue, and neither may arrive empty, which is the same
vacuity guard the seat map half has: an area of no Theaters and a listing of no Showtimes both
parse perfectly and mean the upstream stopped answering. That is the pairing the adapter owes
for what it tolerates: it carries a listing row whose identity the aggregator dropped rather
than refusing the answer, and a tolerance nobody watches is how the next field leaves without
anyone noticing. What is not judged is how many rows arrive without an identity, because a
threshold on that is an invented number that would go red on a day nobody can act on. Nor is
that missing field named, the way a missing seat field is: a listing short of any of the five
is one refusal with no way to say which, and giving it one would mean exporting the aggregator's
listing shapes out of the adapter, where keeping them is the first of the four mechanisms that
hold the vocabulary boundary. The sellability word below is named because the adapter hands its
absence over as a fact, not because the test knows the shape it went missing from.

**The sellability word is judged, and it is the one word this half reads.** The catalogue reads
one value of it and takes every other value to say nothing the three flags do not already say.
The premise stated as an invariant is that a row the catalogue found no reason to refuse
carries the word for on sale, and that is what goes red: such a row carrying any other word, or
none. A row it did refuse is outside the invariant, including one refused for that very word,
so a Theater that stays off sale is not a nightly that stays red. It is the same argument as the
unrecognised seat type. Reading the word for one value is only safe while something notices a
second value arriving, and a further word meaning "not on sale" would otherwise reach a
maintainer as a Theater quietly spending the retry budget, which is how this one reached one.
The adapter hands over the word on each of those rows rather than its listing shapes, so the
boundary holds and there is no second declaration of the listing to drift. The word for on sale
is written down in the adapter rather than derived from the corpus, which is the opposite of how
the seat vocabularies are known, and deliberately: a refresh must not carry a renamed word into
the contract silently, because a rename is exactly what this check is strongest against.

**What the setup provides is checked on every pull request.** A live test asks for its answer
by name and gets `undefined` if the setup stopped providing it, which reaches a maintainer as a
type error inside a nightly that then blames the upstream. `pnpm live-injections` holds every
name the live suite injects to a name the setup provides, and it is a step in `quality`, so a
rebase that drops one fails the pull request instead of the night.

**The answers come from a global setup rather than from the test.** `tools/live-answers.mjs`
opens a session, reads an area, takes the day's widest release, and asks for one seat map per
Chain plus whatever the listing already knows to be unbookable, and hands on the area and the
listing answers it already made rather than asking for them twice, which is under twenty
requests half a second apart, the spacing the corpus refresh uses and the spacing at which 156
consecutive reads met no 5xx. Core has no `fetch` and cannot get one, so the reading happens
outside it and arrives as provided values; that is also what keeps the judgement itself a pure
function the mutation gate can reach. It is a second client of the aggregator rather than a
share of `capture-corpus.mjs`, because that tool's session exists to harvest the values it has
to redact and its getter exists to keep a request ledger, and neither belongs here.

**Nothing it writes may name the aggregator or the area.** A failure message that quotes a URL
would put both into a public run log and, worse, into a public issue, which is what the corpus
redaction exists to prevent. So a message names a route with its query string dropped, and a
transport failure is re-raised without the cause that carries the host. The workflow follows
the same rule: the issue it opens carries a link to the run and no captured output at all,
because the runner masks its secrets in the log and masks nothing in an issue body.

**A failed run opens an issue.** A scheduled run's own notification reaches one person, and
which person is a rule rather than a choice: whoever created the workflow, unless someone
later changed its cron line, unless someone later re-enabled it. That is neither discoverable
nor stable under editing, so the workflow labels and opens one issue instead, and comments on
it while it stays open rather than opening another. It closes nothing: whether the contract
question is settled is a judgement about the code, not about how the world happened to look
last night.

## The import ban

Everything under `packages/` must stay portable to any runtime, so it may not reach for
the DOM, React, React Native, or a runtime-specific API. `packages/core` holds the domain
model and the Source adapter; `packages/client` holds orchestration and the on-device
cache, and it runs unchanged in a native runtime that has no Web Storage. Two gates hold
that for both.

Each package's `tsconfig.json` sets `lib` to the language alone and `types` to nothing, so
no runtime's globals are declared to it. `document`, `window`, `caches`, `process` and
everything else supplied by a host rather than by the language are undeclared, and using
one is a type error. Neither package has a `fetch` either: what they need from a host
arrives as an injected dependency typed by core itself, which is the shape that keeps them
portable.

A Biome override on `packages/**` then covers what the compiler cannot see.
`noRestrictedImports` rejects React, React Native, Expo, Node and Cloudflare, and a second
override restates that same list and adds sibling workspace packages for `packages/core`,
which reaches none. It restates rather than extends because Biome replaces a rule's options
rather than merging them, so a pattern added to one list has to be added to the other.
`noRestrictedGlobals` rejects the host globals by name, which matters because a single
`/// <reference lib="dom" />` re-declares the whole DOM to the compiler and the type error
disappears. It matches a bare identifier and nothing else, so `globalThis.document` walked
past a ban on `document`, and the list therefore carries every name that denotes the global
object as well: `globalThis`, Node's `global`, and the DOM's `frames`, `opener`, `parent`
and `top`, beside the `self` and `window` already on it. `Function` is there for the same
reason, because `Function("return document")` hands one back without naming it.

That closes the reach through a *named* global object completely, and not only its member
form. `const held = globalThis`, the destructured `const { document } = globalThis`,
`Reflect.get(globalThis, "document")` and a computed key held in a variable are all refused
at the name, because none of them can be written without first naming the object. The rule
resolves scopes, so a local or a parameter borrowing one of those names is untouched: the
`window` that `seat-group.ts` gives each party-sized slice of a run still compiles, and so
does the `top` in `seat-profile.test.ts`.

**What it does not close is a receiver that is never named**, and a Grit plugin refusing the
member instead was written and measured before being dropped. Two findings decided that. A
member pattern cannot see `Function("return document")()`, which has no member. And it fires
on honest code, because `document`, `location` and `process` are ordinary words:
`theater.location` and the pure type `Theater["location"]` were both refused by it, and a
type cannot reach a capability at all. A rule that refuses honest domain code is a rule that
gets weakened, so the ban stops at the name.

**A third finding was recorded here and its generalisation is wrong**: that Biome's GritQL
has no pattern for an optional chain. It has one. `` `$_?.document` ``, `` `$_?.["document"]` ``,
`` `$_?.[$key]` `` and `` `$_?.text($...)` `` all match. What was actually measured is narrower
and is true: a metavariable in the property position after `?.` does not compile, so
`` `$_?.$name` `` and `` `$_?.$method($...)` `` fail the plugin to load rather than silently
matching nothing. A ban on the twenty two names would therefore have needed one literal
alternative per name instead of one pattern, which is a cost rather than a ceiling. The two
findings above decide the question without it and the conclusion is unchanged, but the
correction is not free elsewhere: it is why `no-collected-responses.grit` could be repaired
rather than only noted.

The compiler is what makes bare names unreachable, and it is the real gate. This half is a
second layer over the one route the compiler cannot see, a `lib` reference that re-declares
the DOM, and it is deliberately not airtight. Reaching a host global through a function
built by `(() => {}).constructor("return document")`, or through a name introduced by
`declare const document: { title: string }`, is refused by neither half and is known open.
Neither is reachable by accident, and both are plain in review.

Tests are compiled by a project of their own in each package. `tsconfig.json` excludes
`src/**/*.test.ts` and `tsconfig.test.json` takes them, with the language's default
libraries and no emit, because the test runner's declaration files reference `setTimeout`,
`AbortSignal` and other host globals that neither package has and that cannot be checked
under its `lib`. Both projects are referenced from the root, so test code is type checked
rather than skipped, and the Biome override still covers all of `packages/`: a `document`
in a test is a lint error where it is no longer a type error. The live tests are why the
split matters here rather than only in principle: one of them reaches the real Source
through the host's own `fetch`, which satisfies the port structurally and is nameable in
the test project alone.

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
included, its method, its cache mode, its headers lowercased, and its body. That is what lets
a test assert which headers were sent rather than only that a request happened, and it is also
what puts a query string under the gate at all, since replays are keyed on pathname alone. The
cache mode is logged as `null` where a caller asked for nothing, so a test that asserts the
adapter asks for `no-store` is distinguishable from a recorder that always says so. It observes
the substitution point rather than adding one: tests still substitute at `fetch`.

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
`seats` array in twenty seven of the forty two captured seat maps; one reports available
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
is a `string`, and a `string` is not a `TicketingUrl`. An assertion is what would get past
that, and `noUnsafeTypeAssertion` refuses one, so the workspace holds none.

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

A Showtime is bookable when its Presentation has reserved seating, has not begun, is not sold
out, and the listing does not say the Theater has stopped selling. Anything else is carried
with the reason it is not, so a Showtime the catalogue already knows to be unbookable costs no
request to find out. The first three are decided by flags rather than by the Source's own word
for whether a screening is on sale: the flags agreed with the word in all 928 captured rows,
they are total where a word is open, and reading them keeps one more piece of upstream
vocabulary out of the program.

**The fourth is decided by the word, because no flag can express it.** A Theater whose sales
are switched off carries the same flags as one that is selling, on every row, so the whole
listing reads as bookable while the Source's own word for those rows does not; the seat map
route then refuses each of them with a status the adapter reads as a transport failure, which
spends the retry budget and can open a circuit the whole area shares. It is asked about exactly
one value: every other word, recorded or not, leaves the row where the flags put it. The first
three reasons are also what a seat map refusal comes back with; this one is not, and the
reading type says so, so no status code can be mapped to it.

**Where it is asked is decided by which remedy survives it.** A room that never has a seat map
and a screening that has already begun both keep their reason, because neither is undone by a
Theater switching sales off and the Source's own listing agrees: the rows already past at such a
Theater carry the word for past, not the word for off sale. Sold out does not keep it. Its
remedy is another time at that Theater, and there is no buyable time at a Theater that is not
selling, so a row that is both is named for the Theater. The order is reserved seating, begun,
sales off, sold out.

That tolerance is what the nightly contract test watches: a row the catalogue found no reason
to refuse that does not carry the word for on sale, whether it carries a different one or none,
is a divergence. A row the catalogue *did* refuse is not one, so a Theater that stays off sale
does not turn the nightly red for as long as it stays off sale. What that watch can see is
bounded by what it reads, which is one area's widest release once a night: near-total against
the word being renamed or the field disappearing, since both hit nearly every row, and weak
against a further rare word at a rare Theater, which is the shape this case had.

An answer missing anything a Showtime or a Theater is built from is refused whole rather than
read into a listing with holes in it, for the reason a partial seat map is refused: a listing
short of a theater cannot be told from an area that is genuinely that empty.

**A row that carries everything but its identity is the one exception.** Nothing above the
seat map route reads that identity, so a row without one still has its Presentation, its start
time and its ticketing URL: it can be listed, narrowed and handed off, and the only thing it
cannot do is be asked for Seats. Refusing the answer for it does not prevent a hole, it makes
a larger one. The aggregator drops the field for whole theaters at a time, all of a theater's
rows or none, and five readings half an hour apart across five metropolitan areas found it gone
from a quarter of all rows, with every one of the sixty listings in the first reading holding at
least one, so under the general rule every search would answer `unreachable`.

Such a row goes to a third list on the catalogue, and the reason is asked before the identity.
A Showtime the catalogue already knows to be expired, sold out or general admission never
needed one, so it stays where it was and keeps the remedy that goes with its reason; folding
it into "could not be checked" would offer the operator's page for a screening that has
already started. What is left in the third list is exactly the candidates no request can be
spent on, which is what a search reports as coverage it could not reach. The three lists
partition the rows the answer held, and a test holds their total to the number of rows the
Source sent, so a row can move between them and cannot be dropped.

None of this weakens Availability. No Seat is presented as bookable on thinner evidence; a
Showtime that cannot be checked is reported as one that cannot be checked. And a field that is
present and is not what it was is not this case at all: that is a change of shape rather than a
missing datum, and the answer is refused whole for it as for every other field.
`SHOWTIME_FIELDS` is keyed by `keyof UpstreamShowtime` less the two that may be absent, the
identity and the sellability word, so a field added to the declaration and not to the table
still does not compile, and the kind of each of those two is asserted in the predicate beside
it.

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
carries one `y` in all 42 captured seat maps, and the count of distinct `y` values equals
the count of rows in all 42, so rows need no clustering tolerance and no invented threshold.
Depth is the row's rank over the last row's rank rather than its distance down the room,
because rows are not evenly spaced: 41 of the 42 maps draw at least two different row gaps,
14 of them draw their widest gap at least half again as wide as their narrowest, and one
twelve row house draws one gap 2.11 times another. Under a depth measured in map units an
aisle would push the row behind it further back than a row deserves, and "eighth row of
fourteen" would stop meaning eight fourteenths. A property test draws each generated room
twice, once as generated and once with every row gap set to one, and holds the two sets of
depths identical.

**Depth starts at the front row because nothing in a seat map locates the screen.** The
vertical offset that reads like a throw distance is the whitespace the background reserves
for the screen glyph, and it ranges from 1.9 to 11.4 seat widths across the corpus.

**The centreline and the span belong to the room, never to a row.** A Seat's lateral is its
own centre placed on the extent of every Seat centre in the Auditorium. Rows are neither
alike nor concentric: 25 of the 42 maps widen toward the back, 15 narrow, 2 are equal, and
one room spreads its row midpoints across 4.6 seat widths. Normalising a row against its own
extent would put the outermost Seat of a row of four exactly where it puts the outermost Seat
of a row of thirty two, which is the opposite of what a normalised position is for.

**No label is read, and none can be.** `normalised` is generic over anything carrying `x`,
`y` and `width`, so a Seat's printed label is not nameable inside it and ordering by one is a
compile error rather than a convention. The corpus is the reason: 14 of the 42 maps skip a
row index, one chain's four rooms label their Seats `101` to `919` with no letter anywhere, 6
of the 376 rows carry no agreed label prefix, and 33 of the 42 maps number the Seats of a
row against the direction they are drawn in. A property test relabels every generated room
with a generated function and holds every position unchanged.

A Seat also carries **how many seat widths it sits from that centreline**, signed the way
lateral is: the same offset over the same extent, divided by the Seat's own width instead
of by half the room. Lateral is a fraction of one particular room and means nothing said
aloud, while this is a distance anyone can picture, which is what an interface needs to say
where a Seat is. It is not a count of the Seats between here and the middle of the row: the
centreline is the room's, so a Seat halfway along a narrow row reads further out than one
halfway along a wide one, for the reason the paragraph above gives. Mirroring an Auditorium
negates it exactly as it negates lateral, which is the property that holds it, and five
captured Seats pin its scale.

The generated rooms are adversarial rather than tidy: uneven row gaps, rows of differing
widths and origins, Seats of differing widths, coincident Seats, rooms of one row, rooms of
one Seat, Seats delivered in shuffled order, and labels whose letters and numbers both run
against the geometry.

## Seat Groups

`packages/core/src/domain/seat-group.ts` turns an Auditorium's Seats into the unit of a
search result. It takes a party size and whether accessible seating was asked for, and
answers with runs of adjacent bookable Seats, each exactly the size of the party and each
carrying the number of consoles it crosses.

**Rows and adjacency come from the drawing.** Seats fall into rows by the `y` they are
drawn at, which yields the corpus's 376 rows, and into order along a row by where their
centres sit, which is the position the whole application compares Seats by. The spacing
between two neighbours, centre to centre and divided by a Seat's width, lands in one of
three bands: up
to 1.45 is contiguous, up to 2.05 is the console between two recliners, and above that is
an aisle. Over the 6,395 in-row gaps the corpus holds, that is 5,688, 540 and 167. The two
boundaries are cuts through a continuous distribution rather than gaps in it, which is why
a console is recorded rather than treated as a break: a run never crosses an aisle, may
cross a console, and says how many, because three people can sit either side of one.

**A gap beside an accessible space is that space's own width, not a console.** 78 of the
540 sit next to a wheelchair or companion Seat, and the Seats either side of one are
contiguous, which leaves 462 real consoles.

**A run yields one Seat Group, not every window in it.** The chosen window crosses the
fewest consoles and, among those, sits most centrally in the run. Centring is what makes
the answer independent of which end of the row it is measured from; where the slack is odd
and two windows are equally central, the one nearer the left wins, because the rule has to
be decidable and the room offers nothing further to decide it with.

**Wheelchair and companion Seats break an ordinary run** rather than being deleted from
the row before the geometry is read, which would leave the Seats either side of an
accessible space looking two aisles apart. A Query that asks for accessible seating admits
them and then answers only with Seat Groups that carry one: over the corpus that turns 40
of 42 seat maps into 40 that offer a pair including an accessible Seat, where merely
lifting the exclusion offers ordinary pairs in two of them and leaves the barrier standing.

**The neighbour links are held to the geometry rather than read.** All 10,974 the
aggregator sent name the immediately adjacent Seat in the same row, on the side they claim,
and not one crosses a console or an aisle, while 279 contiguous gaps carry no link at all.
A test asserts the agreement over the corpus, the nightly contract test asserts it over
today's rooms, and no code builds a run from a link.

Two measurements are what this is judged by. All 42 captured seat maps have three free
Seats in one row, and a party of three can be seated in all 42. Five of them can only do it across a
console, which is what treating a console as an aisle would silently cost.

## The order the keyboard walks

`packages/core/src/domain/auditorium-map.ts` is the ordering the seat map's keyboard model
reads, supplied by the domain model so the view improvises none of it. It answers with the
Auditorium's Rows front to back, each holding its Seats left to right, its own number, its
label, how many of its Seats are bookable and what sits in each gap along it. It also says
where the recommended Seat Group is, as places in `rows` and in that Row's `seats`, both
counted from zero rather than from one as `ordinalFromFront` is, and null where the Seat
Group is not in this Auditorium at all. `nearestInRow` takes a Row rather than a place in
`rows`, because taking a place would need either an unchecked index or a branch nothing can
reach, and a branch nothing can reach is a mutant nothing kills; a view that is moving from
one Row to the next holds the Row already.

**Rows and order come from the normalised position, never from a label.** Seats group by
`depth` and order by `lateral`, and the function that does it is generic over anything
carrying a normalised position, so a printed label is not nameable inside it, which is the
mechanism that keeps `normalised` honest one layer down. A property test relabels every
generated room with a generated function and holds the order unchanged.

**A Row's number is its place in the order, and it is contiguous by construction.** The
Source's own row index is not, skipping a value in 14 of the 42 captured seat maps, and
Cinemark West Plano screen 28 holds 14 Rows while that index runs to 16. It is also
unreachable: `UpstreamSeat` never declared it, so no Seat carries it and ordering by one
would not compile. What the corpus test asserts instead is that the fourteen Rows are
numbered one to fourteen while the capture's own index reaches sixteen, and, over all 42,
that the count of Rows equals the count of distinct `y` the room draws.

**A Row's label is the initial its Seats agree on, or nothing.** Six of the 376 captured
Rows agree on none, all of them AMC accessible Rows putting a `WC` Seat in a lettered Row,
and those Rows have no label to show. One initial is enough because it tells every Row of
every captured Auditorium apart, which a test asserts rather than assumes. The whole agreed
prefix is not the answer, because eight Seats numbered `401` to `408` agree on `40` and sit
in row 4.

**The nearest Seat to a lateral is its own inverse.** Asking a Row for the Seat nearest a
Seat's own lateral answers with that Seat, which is what makes Down and then Up land where
it started once the view holds the anchor still. A tie goes to the Seat on the left,
because the rule has to be decidable. The anchor itself is not here: a goal column is
interface state.

**The gap after each Seat is the Seat Group bands, not a second opinion.** `gapBetween` is
shared with `seat-group.ts`, so a console is a console in both, and it measures centre to
centre so that it agrees with the order a Row is taken in whatever the Seats' widths. Over
the corpus that is 5,766 contiguous gaps, 462 consoles and 167 aisles: one per adjacent
pair, so a Row of *n* Seats carries *n* − 1 of them and the last Seat has no gap after it.

What the map deliberately does not carry is a third value for availability. A Seat is
bookable or it is not, because `A` is the only upstream status whose meaning is
established; there is no status the corpus establishes as "taken", so nothing here can say
so and the view must not either.

## The catalogue phase and the on-device cache

Every search begins by resolving its catalogue terms, and that work is split across three
packages along the seam ADR 3 draws.

`packages/core/src/domain/catalogue.ts` narrows a Catalogue to `ShowtimeTerms`, which is the
part of a Query a Showtime can answer by itself: the Theaters it may be at, the Formats it
must carry one of, and the window its start time falls in. The client's `CatalogueTerms`
extends it with the three that name a listing rather than narrow it, which is the whole of
the difference between the two. Narrowing a Catalogue yields a Catalogue, so all three of
its lists are narrowed by one predicate and a Showtime the listing already knows to be
unbookable, or could not give an identity, is still reported against the terms it satisfies.
The predicate reads a Showtime's Presentation and start time and never its identity, which
is what lets the third list exist at all. Absence of a term is what means "no constraint"; an
empty list of Theaters or of Formats admits nothing, because a filter that accepts none accepts
none.
Chain and Amenity are deliberately not among the terms: the listing carries a chain code and
no chain name, and the adapter drops the amenities that do not name a Format, so neither
exists above the boundary to filter on.

`packages/client` holds the cache. `openCatalogue` answers a `Reading<Catalogue>` for a set
of terms, from the store while its entry is fresh and from the Source otherwise, remembering
what the Source answered. A cache hit reports the moment the listing was actually fetched
and an attempt count of zero, so the age a result carries is the age it has and a hit is
told apart from a read. There is no staleness threshold and adding one would be wrong:
re-verification before a booking hand-off is unconditional, so a stale catalogue cannot
reach one.

**The catalogue is cached for two hours, and it is the only thing in the workspace with a
lifetime.** Seat availability is never cached at all. Two hours is the conservative end of
"hours": one listing request costs 375 ms measured against the live aggregator and is
dwarfed by the seat-map fan-out that follows it, while a listing held too long is a
screening that was added after it was written and is never offered. `cacheForMs` overrides
it, and a value of zero reads the Source every time.

**A cached catalogue routinely offers Showtimes that have already begun.** 80 of the 824
Showtimes in the captured listing were already past at capture, so roughly one candidate in
ten can be expected to have started. That is the `started` Coverage outcome rather than a
cache fault, and the phase carries those Showtimes through with their reason rather than
hiding them.

`packages/client` compiles against Core's own sources rather than through a project
reference, and Core publishes two entry points to make that legible: `@seatscout/core` and
`@seatscout/core/testing`, which is the fake upstream the client's tests substitute at. A
project reference would be the conventional wiring and cannot be used here, because
`tsc --build --noEmit`, which is what `pnpm typecheck` runs, refuses a referenced project
that disables emit.

Core's entry now names `openSource` and the port's types, which the client needs because
ADR 3 puts orchestration outside Core. The Source port is still internal in the sense that
matters: no caller of the product's own interface meets it, and tests substitute at `fetch`
rather than at it. What a package's entry exports is held to what another package imports,
which is the rule that keeps Core's entry from listing everything under `src` and is why
`openCatalogue` is not on the client's entry until something outside the client composes it.

### What may be written

`KeyValueStore` is two operations. `read` answers `unknown`, because what a device hands
back is not to be believed and the caller has to say what it will accept. `write` takes a
`CachedCatalogue`, and that is the whole of the deny list: **a Seat cannot be written to the
store, because the only thing the store accepts is a record carrying a Catalogue, and a
Catalogue holds Showtimes rather than Seats**. `store.write(key, seats)` is a type error,
and so is `store.write(key, JSON.stringify(seats))`, which is the way round that a store of
strings would have left open. It is the technique `corpus/types.ts` and the catalogue
adapter already use for what may be *read*, pointed at what may be written.

What comes back is checked before it is used: a numeric fetch moment, and a catalogue
carrying its three arrays. All three are checked rather than the two the reader will
obviously touch, because an entry written by an older build is a real thing a device holds
and a missing array would reach a search as an absent Coverage outcome. Anything else is a miss and the Source is read again. It is not
checked deeper than that, because deeper is the adapter's own parse restated against data
the adapter wrote, and because the store it came from is the reader's own device rather than
a third party's answer.

Nothing is read back as absent that a store answered with `null`, because absent is
`undefined`. `read` answers `unknown`, so `null` is a value a store might hold like any
other, and conflating the two would make a store that lost an entry indistinguishable from
one that held a null.

A cache entry is named after the three terms that identify it, encoded as a JSON array, so
an area holding the separator cannot collide with another entry. Terms that only narrow the
answer are not part of the name, so changing a Format filter re-reads the cache rather than
the Source.

### The store contract, run twice

`storeContract` is part of the package's surface rather than of its tests, because an
adapter author is who needs it and the native adapter is who needs it next. Each clause
answers with what the store did wrong, or with nothing. One of them is why the in-memory
store serialises rather than holding the object it was given: a store hands back its own
value, so a test double that hands back the caller's object would let a caller mutate what
another caller is about to read, and would pass in Node what fails in a browser.

The in-memory store runs it under vitest. The browser adapter runs the same clauses in a
real browser: `tests/e2e/store-contract.spec.ts` serves the built
`packages/client/dist/store-contract.js` and the bundle `apps/web` ships from one origin
and renders each clause's verdict onto a page, which is also what makes a headed run
readable by a person. The page carries no import map, and that is the point: the contract
module imports nothing at run time, and the web bundle carries what it reaches inside it,
so output the deployment could not resolve fails a test here rather than passing the
bundle gate's weigh-in. The contract module is served by its own path rather than through
the client's entry because most of the package does leave itself for Core, and an entry
that grew to reach any of it would break this page for a reason that has nothing to do
with the adapter under test. A contract that passes only in Node proves
nothing about the adapter that ships, which is why the browser run exists; and because the
mutation gate runs vitest and not Playwright, the adapter is judged by unit tests of its own
as well.

The contract's own tests are what keep it from being vacuous: each broken store fails
exactly the clause it breaks, the operations and keys it performs are pinned, and its
diagnostics are asserted, because a contract that cannot say what went wrong is a contract
nobody can act on.

Its values are empty Catalogues, because a `Showtime` carries branded identity that only
parsing a response can mint and a contract that forged one would need the cast this
repository does not contain. What the contract owns is the store's behaviour; a populated
Catalogue makes its round trip through a real store in the catalogue phase's own tests.

`tests/e2e` is type checked like the rest of the workspace rather than only transpiled by
the runner, with `skipLibCheck` on for that project alone. Playwright's declarations name
`Buffer` and `Symbol.asyncDispose`, which would otherwise oblige the workspace to install
Node's types and raise its library for one directory; our own use of those declarations is
checked either way.

### The browser adapter

`apps/web/src/store.ts` is where it lives. Core may not reach for `localStorage`, and
`packages/client` may not either: it runs unchanged in a native runtime, which has no Web
Storage. Per-platform adapters belong to the per-platform unit, which is what ADR 3 already
says about view layers.

`apps/web/src/index.ts` publishes it, alongside the shell's own start function, and that
entry is what the bundler is given and what the deployment therefore holds. `tsc` type
checks `apps/web` twice rather than once, because a service worker and a page cannot share
a library: `tsconfig.json` covers the page under the DOM, and `tsconfig.worker.json` covers
the worker and its cache under `WebWorker`, which is the split `apps/proxy` already makes
for the same reason. Neither emits; Vite does that. Their build info sits beside the
project rather than in `dist`, which the bundler empties on every run.

The same adapter file holds the upstream session, because it is the same Web Storage and
the same two failure modes. It is a second accessor rather than a second key on
`KeyValueStore`, whose write takes a `CachedCatalogue` and must keep taking only that; the
session is a string the transport carries, under a key of its own, and it is asynchronous
for the reason the store is, so a native runtime with no synchronous storage is a drop-in
rather than a rewrite.

Web Storage can be absent or refuse outright: a private window, cleared site data, storage
disabled by policy. **Reaching it is attempted once, and where it refuses the adapter falls
back to memory, which lives as long as the accessor that made it.** That is the honest answer rather than a
failure, because the port never promised durability, memory is still on the device, and a
search that cannot cache is one that reads the Source again rather than one that breaks. A write the
storage refuses, which is what an exhausted quota looks like, is dropped rather than raised,
because a write that did not land is a miss and a miss costs one request. A value that comes
back as something other than what was written reads as absent for the same reason.

### The shell, and what its service worker may cache

`apps/web/public/index.html` is the page the deployment serves at `/`. It is provisional
and says so on its face: a heading, a sentence, and one line reporting whether this device
holds an upstream session. It is copied into the build output rather than compiled, so the
two scripts beside it keep the names the worker and the page refer to. Its only inline
script imports the entry and calls `startShell`, which is why that entry has no import-time
side effect and can therefore be imported by a test page as well as by the shell.

**The service worker cannot cache seat Availability, and that is structural rather than
observed.** `apps/web/src/worker/cache.ts` is the only file the deployment ships that may
name Cache Storage, and `tools/no-cache-storage-reach.mjs` is the whole of the gate: it
takes the staged content of every tracked file under `apps/` and refuses any that carries
the letters `caches`. It runs over that tree in `quality`, and again in the pre-commit hook
whenever a file under it is staged. It reads source text rather
than an AST, and that is the point: a member pattern sees only the spellings it enumerates,
and `self?.caches`, a key held in a variable, a template literal, `Reflect.get(self,
"caches")` and a renaming destructure all reach Cache Storage without being one, and none of
them can be written without the letters. It was watched refusing all twenty reaches planted
across those surfaces, and staying silent on the three that have to pass. On the gates it
replaces, seven of twelve spellings walked past in a source file and eight of twelve in the
shipped page.

**It names three files and trusts none of them further than it has to.** `cache.ts` is exempt
because it is the writer. `worker/cache.test.ts` and `worker/sw.test.ts` are allowed the single
literal `vi.stubGlobal("caches",`, which is struck from those two files alone before the letters
are looked for, because that is how they hand the module under test a fake and the runner's API
takes the global's name as a string. Everything else in them is refused: a test writing
`self.caches.open(...)` draws the same error a source file would, and it has to, because a test
file can be exported from and an export reaching `apps/web/src/index.ts` reaches
`dist/index.js`. Both weaker shapes of this exemption were built and broken first. Exempting
`*.test.ts` wholesale let a reach travel that export route into the built output. Striking the
idiom in *every* file let any file declare its own `vi` whose `stubGlobal` returns
`Reflect.get(self, name)`, so the call that hides the letters was also the call that made the
reach. Naming the two files closes both: the idiom is struck only where the runner really puts
it.

**The surface is every application rather than `apps/web/src`.** `public/index.html`
carries an inline module script that ships to every device, and the `noRestrictedGlobals` ban
on `caches` was scoped `apps/web/src/**`, so a bare `caches.open("shell")` there was refused by
nothing. Biome does lint JavaScript inside an HTML `<script>`, which is worth stating because
it is the opposite of what it looks like: the deleted plugin fired there on the member forms,
and only the scoped rule missed. `apps/proxy` is in it because it is the Worker that serves
seat maps, `caches.default` is the Cloudflare idiom for holding a response, and that proxy
holds nothing about anybody, which `deploy/README.md` states as a property of what it
publishes. The deleted plugin covered neither surface's real risk: it matched a member *named*
`caches`, and `caches.default` is a member *of* it.

**It names `apps/` and no application inside it**, because `pnpm-workspace.yaml` declares
every application as `apps/*` and a gate that lists its subjects one by one governs the
applications that existed when it was written. Naming `apps/web` and `apps/proxy` left
`apps/native` outside it and would have left a fourth application outside it too, with
nothing failing on the day one appeared. The directory is the workspace's own answer to
which packages are applications, so a new one is governed from its first commit.

**It decodes every escape, because otherwise it does not hold at all.**
`\u0063aches` is a lawful identifier that a bundler emits as `caches`, and `self["\u0063aches"]`
is a lawful key, so an escape is a two-character edit to any reach. Enumerating the forms one
at a time is how this half was got wrong once already: reading `\uXXXX` and `\u{...}` and
nothing else left `self["\x63aches"]` walking past, and left the two cheapest routes open
besides, a line continuation inside the string and the identity escape `"\c\a\c\h\e\s"`,
which needs no digits at all and which every engine reads as `caches`. So the decoder is
general rather than a list: `\u{...}`, `\uXXXX` and `\xXX` become their code point, a
backslash before a line terminator takes the line terminator with it, and every other
backslash is dropped, which is what a string literal does with one. The one form that
escapes that reading is a legacy octal escape, which is a syntax error in a module, and
Biome's own `noOctalEscape` now refuses it as an error rather than as the warning its
recommended preset makes it. Neither Biome rule this check replaced normalised any of it, so
it closes routes that were open the whole time rather than ones this check created.

**The cost was measured rather than assumed, and it is zero.** Across every tracked file
under `apps/`, one carries the letters once the idiom is struck, and it is the writer. The
word does appear elsewhere in the workspace, which is what decided the surface rather than a
wider one: `packages/client/src/catalogue.test.ts` has `it("caches for two hours...")` in a test
name, and `tests/e2e/shell.spec.ts` reads Cache Storage back on purpose to assert what the
worker holds. Both would be refused by a workspace-wide check and neither is a reach. What this
does cost is prose: a Markdown file under `apps/` could not use the word and would have
to write Cache Storage instead, and `deploy/README.md` is the nearest thing to one.

**What it surrenders and what stays open, stated rather than implied.** The deleted plugin was a
workspace-wide member rule, so `self.caches` under `tools/` or `tests/` is now refused by
nothing; that is a real loss and a small one, since neither ships and the end-to-end suite reads
Cache Storage there on purpose. The check reads the index, so it judges what is staged rather
than what is in the editor, which is right for a commit gate and is why it is not in the
list of gates to run by hand above. And two routes remain open: a name assembled at runtime,
which no source-text check can see, and a reach written inside one of the three files named
above. Both need a deliberate decoy rather than a slip, both are plain in review, and the second
would also have to be exported into the build past a bundle ratchet that a test file's imports
would break by two orders of magnitude. They stand on the same
footing as the import ban's own known-open routes. `cache.ts` exports one writer,
`precacheShell`, which **takes
no argument**: what it caches is that module's own constant list of the files the build
publishes, so no caller can choose, and nothing outside that list can be written. The
worker's request path reaches Cache Storage
only through `cachedShell`, which reads, and it reads through `CacheStorage.match` rather
than through the cache's own, so no writable handle exists outside the writer. Nothing the
fetch handler sees can therefore be cached, and a request outside the shell is not answered
by the worker at all: it never calls `respondWith`, so the response never enters the worker.

A shell request is one the worker can answer correctly and nothing else: same origin, a
`GET`, and a path on the list. Everything else is left to the network untouched, because a
path alone is not an identity: another origin's `/index.js` is not this one's, and a write is
not a read.

A shell request is answered from the network while there is one, and from the cache when
the network fails. Cache-first would pin a device to the shell it first installed, because
the worker only re-caches while it installs and it only installs again when its own script
changes. Network-first costs a request that was going to be made anyway and keeps the
device on the shell the deployment is serving; the copy the cache holds is a fallback for
having no network, which is the only thing asked of it.

`tests/e2e/shell.spec.ts` drives all of it in a real browser against the built output,
served by `vite preview` from `playwright.config.ts`'s `webServer`. The server is
configured `appType: "mpa"`, because its default answers any unmatched path with the page,
which would make the pass-through assertion below vacuous: a seat map route would come back
as the shell rather than as a miss. It is a stand-in and not a replica: it answers 404 where
the deployment sends the same request to the proxy. The suite watches the worker take
control, reads Cache Storage back and asserts it holds the shell and nothing else, requests
a seat map route and a published file the shell does not list and asserts neither is added,
reloads with the network disabled, and writes a session through the shipped module and
reads it back after a reload.

**Accessibility is checked here, on every pull request.** `@axe-core/playwright` scans the
shell against WCAG 2.2 at levels A and AA, which is the [W3C
Recommendation](https://www.w3.org/TR/WCAG22/) rather than a bar this project invented, and
any violation fails `quality`. It was watched failing before it was trusted, on a colour
contrast of 1.91:1 against the 4.5:1 success criterion 1.4.3 requires.

The scan is the only one in the repository, and until this was fixed it was deletable with
every gate green: `tests/e2e` is outside the unit runner's include and outside the mutation
gate's scope, and the end-to-end run passed with no tests at all. So `pnpm test:e2e` now
runs `playwright test --list --grep @accessibility` first, and Playwright's own answer to a
filter that matches nothing is to exit non-zero, which is what makes deleting the scan fail
the job. The flag that let an empty suite pass is gone with it. This is a name rather than a
number: there is no floor on how many tests `tests/e2e` holds, because a count is a figure
[ADR 6](docs/adr/0006-gates-cite-a-standard-or-measure-a-regression.md) would have to
justify, and a count is not what protects a particular scan anyway.

**What this does not govern is the browser's own HTTP cache**, which is a third mechanism
beside Cache Storage and the catalogue's Web Storage. The proxy passes an upstream response's
headers through unchanged, so what a browser is entitled to hold for a seat map is decided
upstream. That was measured on 2026-08-29 and it is now closed from the other end: the
upstream sends no `Cache-Control`, `Expires` or `Last-Modified` on a seat map, which under
[RFC 9111](https://www.rfc-editor.org/rfc/rfc9111#section-4.2.2) leaves a storable response
with no freshness to calculate, so Chromium revalidates rather than reusing. Adding a
`Last-Modified` upstream would have been enough to change that silently, so the adapter no
longer relies on its absence: every request it makes asks for `no-store`. That belongs to
Core's transport rather than to this worker, because a native client has no worker.

**Biome lints the page for accessibility too, and gets there first.** A missing or invalid
`lang` fails `lint/a11y/useHtmlLang` or `useValidLang` before the browser is even installed.
The two gates overlap deliberately: what is only axe's is everything a static reader cannot
compute, which is contrast, computed roles, and anything a script renders.

## The Seat Profile

`packages/core/src/domain/seat-profile.ts` scores a Seat Group against a Seat Profile. It
answers with one number, the Group's centroid in normalised position, and the named reasons
the interface shows instead of the number. It reads a Seat's normalised position and nothing
else, so a Seat Group has to carry the positions the normalised Auditorium gave it rather
than be rejoined to the room by identifier. That is what `seatGroupsIn` being generic over
the Seat it is handed is for.

**The off-axis term is an angle, not a distance.** It is how many seat widths off centre the
Group sits, divided by how far it sits from the screen. The same sideways offset therefore
costs more the nearer the screen. A penalty on `|lateral|` alone is separable in depth and
lateral: it applies the same lateral function in every row, so the only thing left to decide
which row's side seats are punished hardest is which row is physically wider, and that
varies by room. Of the 42 captured seat maps 25 widen toward the back, 15 narrow and 2 are
equal. Stated as an invariant, at the same lateral offset the penalty must be larger in the
front row than in the last. Over the 42 the angular form satisfies that in 42 at every
screen gap from 6 to 48 seat widths; the separable form satisfies it in 0. The separable
form is not a second scorer in the test: it is the point of the Profile's own parameter
space where the row pitch is zero, so every row stands the same distance from the screen.

**Every target, weight and modelled distance is on the Profile.** Reference targets depth
0.67 and lateral 0.0, and charges for the depth it misses, the angle it sits at, the front
band, the wall band, and each console the Group crosses. Three of its numbers are geometry
the seat map does not carry, all in seat widths: the screen stands 6 in front of the front
row, rows stand 1.71 apart, and the front band ends 6.97 seat widths from the screen. The
last two are conversions rather than choices. UNIC and EDCF put the minimum row distance for
regular seating at 1200 mm and quote seat widths of 500 to 750 mm for shared armrests and
650 to 900 mm for double armrests and recliners, so 700 mm is the middle of the width every
one of their seating types can be, and 1200 over 700 is 1.71. ST 202's sixteen feet is
4877 mm, which over the same 700 mm seat is 6.97.

Nothing in the ordering turns on those distances. The suite sweeps the screen gap from 6 to
48 seat widths and the row pitch from 1 to 2.3, which spans the 1.9 to 2.3 the corpus
actually draws, and every conclusion holds at every point.

**The wall band is a wall band, not a last-row rule.** Nothing in ST 202, ST 196 or THX
singles out the last row. What ST 202 keeps, in the microphone placement area of its
Figure 4, is measurement positions more than sixteen feet from the screen and more than five
feet from any wall. That is a front band and a wall band, and the wall band covers the rear
wall and the outermost Seat of every row alike. Outermost means furthest from the centreline
on its own side, so a row that lies entirely to one side of the centreline has its outer end
against a wall and its inner end beside open floor, and a Seat drawn on the centreline is
against neither. That is unobservable in the corpus, where every row straddles the
centreline, and it is what keeps the score falling away outward along a row instead of
stepping back up at the inner end.

**The number is never shown.** `RankReasons` carries the row from the front, the room's row
count, how many seat widths off centre the Group sits, whether it is in the front band,
whether it is against a wall, and whether it is tied with the target. There is no rank
ordinal, because an ordinal asserts a difference between fifth and fourth that the room
cannot support. A result is tied when it is within half a row and one seat of the target,
which is the finest an Auditorium subdivides; that predicate is contract rather than
rendering, because the list draws its rule where the tie ends.

**The score is a pure function of the Seat Group and the Seat Profile.** The centroid it
takes over the Group's own positions is summed in a canonical order, so an Auditorium
delivered in a different order scores identically rather than within a rounding error. The row a Group sits in is counted rather than divided out of
its depth, so a Group of three in the eighth row of eleven is in row 8 and not in row
7.999999999999998.

Three measurements are what this is judged by. At Reference, all 42 captured seat maps put
their best Seat on the centreline of its row, within one row of the reference row, with the
score falling away outward along both sides of every row. Across 144 weightings and modelled
distances swept against five benchmark Auditoriums, one from each of five Chains, that holds
at 720 of 720. And the equal-offset invariant above holds at 42 of 42 and, for the separable
form, at 0.

## Running a search

`packages/client/src/search.ts` is the mechanism the rest of the workspace exists for, and
the only place that composes all of it. `openSearch` takes the dependencies the catalogue
phase takes and answers with a function from a Query to a `Search`: `snapshot()`,
`subscribe()`, a terminal `done`, and `abort()`. A Search is hot, so the listing read
starts when it is made rather than when something is awaited. `done` settles with the
terminal snapshot for every answer a port can give; it is not wrapped in a catch, so a port
that breaks its own contract and rejects surfaces rather than being swallowed.

`packages/client/src/ranking.ts` is what turns one Auditorium into results, and it is shared
rather than owned by the search: a `SeatGroupResult`, the ordering of the Groups a room
offers, and the question of whether one particular Group is still in it. Re-verification asks
the second and third of those about the same room, so the two operations cannot grow separate
ideas of what a result is or which of two Groups is better.

A Query is the catalogue terms plus the party size, whether accessible seating was asked
for, and a Seat Profile that defaults to Reference. The catalogue terms resolve from the
on-device cache; everything else needs a seat map, so it fans out.

**A snapshot is the whole ranking, and its reference is stable between changes.**
`snapshot()` answers with the same object every time until something changes and a
different one afterwards, which is React's `useSyncExternalStore` contract and the reason
that shape was chosen: a store that builds a fresh object per call re-renders every
consumer forever. Its arrays are copies rather than the accumulators behind them, so a
snapshot a caller is still holding cannot change under it.

**Scores are immutable and knowledge is monotone.** A score is a pure function of the Seat
Group and the Profile, computed once when the Auditorium arrives and never recomputed, so a
later arrival changes where a result sits and never what it is. A result in one snapshot is
in every later one, and no Coverage outcome ever loses a member.

**The ranking is a total order, so it does not depend on arrival order.** Best score first,
and where two Showtimes score alike, the lower Showtime. Two Showtimes can score exactly
alike, because two rooms drawn the same score the same, and a stable sort alone would leave
the tie broken by whichever answered first. Within one Auditorium the same rule applies to
the Seat Groups: the room's best, and among equals the one nearest the front and the left,
which is the order `seatGroupsIn` already yields.

**A Showtime contributes one result: the best Seat Group in the room.** Adjacent Groups in
one room differ by one seat and by less than the model can resolve, so a flat list of all of
them would be a list of duplicates; the alternatives live on the seat map. A Showtime whose
room cannot seat the party is still checked and still counted; it simply has nothing to
offer.

The room's best is taken by sorting and reading the head rather than by a maximum with a
comparison, which looks like the long way round and is not. No captured Auditorium holds two
Seat Groups that score alike, so a `>` there would be a branch the mutation gate cannot
judge; a comparator has no such branch, and `toSorted` is stable, so the two pick the same
Group.

**A result carries no ticketing URL.** `SeatGroupResult.showtime` is a view of `Showtime`
without `ticketing`, built field by field rather than spread, so the URL is absent at
runtime and not merely erased from the type. Only re-verification yields one
([ADR 4](docs/adr/0004-booking-ends-at-a-deep-link.md)). The named Showtime outcomes on
Coverage are the other way round and do carry it, because the remedy for a Showtime nobody
can check is the operator's own page. What a result carries beside its Seat Group is the
moment the Auditorium was read and how many attempts it took, which is what a card counts an
age up from; the Source and the upstream status the Availability judgement came from stay on
each Seat, where the judgement was made.

**A result says what the filters removed.** Availability and Designation are predicates
applied before ranking rather than terms in the score, so a result states how many of the
Auditorium's Seats each of them held back: the unavailable ones, and then the accessible
ones among what is left. The two counts are disjoint in that order, so no Seat is counted
twice. A Query that asks for accessible seating removes none on that ground and says so with
a zero.

**Coverage has seven outcomes and its ledger closes in every snapshot.** Checked, sold out,
no seat map, already started, sales switched off, never identified and could not be reached;
not reached yet is the remainder rather than a field, so the seven and the remainder add to
`candidates` in every snapshot and not only in the last. Five of them are populated by the
listing before a request is spent; the fan-out adds to three of those five from what a seat
map refusal says, and to `failed`. An expired screening is `started` and never `failed`,
because a cached listing routinely offers screenings that have begun and a retry cannot help
one; `failed` stays the only retryable set, and it carries identities rather than Showtimes
because a retry is the one remedy that has to name what it retries.

A Showtime at a Theater that has stopped selling is named rather than counted, and its remedy
is the operator's own page: retrying can never work while sales are off, and the fan-out never
reaches it, because the listing gave its reason before a request was spent. Only the listing
ever puts a Showtime there. No seat map refusal does, and the reading type the port hands back
excludes the reason, so a status code cannot be mapped to it by accident.

That holds for as long as the listing a search reads knows. A Theater that switches sales off
inside the two hours its listing is cached for is still described as selling by the entry the
search reads, so those Showtimes are fanned out, exhaust their retries and land in `failed`
until the entry expires. Only a fresh listing can say otherwise, and the alternative would be
a status code meaning "this will never work" sitting in a table beside the ones that mean "try
again".

A Showtime the listing could not identify is the one candidate no request can be spent on,
so its shortfall stands for the life of the cache entry: only a fresh listing can restore an
identity, and the cache is what a search reads. That is why it is never offered a retry, and
why no result is ever built for it, which in turn means re-verification is never asked about
one. Its remedy is the operator's own page, through the ticketing URL its Coverage entry
still carries, and that is a hand-off the verification path is not asked to keep.

A listing that cannot be read is not a search with no candidates. It settles in a phase of
its own, `unreachable`, because a screen that says "nothing matched" when nothing was
looked at is the silent partial result Coverage exists to prevent.

**The fan-out is 24 workers over one queue.** Twenty four is the measured optimum rather
than a number chosen here; the figures are in the table below. Workers pull from one shared
iterator, so nothing is indexed and no worker holds a slice. `abort()` abandons the queue
rather than cancelling what is already in flight: each worker stops at its next turn round
the loop, no further request is issued, an answer that arrives after it is discarded rather
than recorded, and `done` settles with the snapshot as it stood. An unbounded fan-out would
issue every request in one turn and leave `abort()` nothing to stop.

Every answer publishes, which re-sorts the results and copies the Coverage lists, so a
search of *n* candidates does *n* sorts and *n* copies. That is deliberate and it is what
progressive delivery costs: at the few hundred candidates a Query has, the work is trivial
and the allocation is short-lived. Coalescing the notifications is a rendering decision and
belongs where the rendering is.

### Reading a response body

A `fetch()` is not complete until its body is consumed. Collecting responses across a
fan-out and reading their bodies afterwards holds every connection open and can stall; the
runtime's own release notes record having to grandfather deployed code that did it. So:

```ts
// Wrong. Every connection stays open while no body is being read.
const responses = await Promise.all(paths.map((path) => fetch(path)));
const bodies = await Promise.all(responses.map((response) => response.text()));

// Right. Each body is consumed as soon as its own headers arrive.
const bodies = await Promise.all(paths.map(async (path) => (await fetch(path)).text()));
```

`tools/lint/no-collected-responses.grit` is a Biome plugin that refuses the first form, in
both halves. A `map` callback that calls the transport and reads no body off anything is
collecting responses, whatever it awaits. A `map` callback that reads a body off **its own
argument** is reading them afterwards, whatever the body reader is called. Both halves count
`text`, `json`, `arrayBuffer`, `blob`, `bytes` and `formData`, and the second half keys on
the argument, so a callback that obtains its own response and then reads it is the right
form rather than a violation. It runs in `pnpm lint`, so it gates a pull request and the
pre-commit hook alike.

**Both halves count the optional forms too, and as first written neither did.**
`paths?.map(...)` walked past the rule entirely and `response?.text()` walked past its reader,
so `$_?.map` and `$_?.flatMap` now sit beside the plain ones and a `body_read` pattern carries
one literal alternative per reader name. The six names are spelled out a second time rather
than factored through `reader()` because `` `$receiver?.$reader($...)` `` does not compile,
which the import ban section states precisely. The half that looks for **no** body read needed
this as much as the half that looks for one: without it a callback reading its own response as
`(await fetch(path))?.text()` counted as reading nothing and was refused for it. It keys on
method names, so a non-`Response` receiver with a method of the same name draws it:
`rows.map((row) => row.json())` already did, and `rows?.map((row) => row?.json())` now does
too. That is the rule's pre-existing false positive widened consistently rather than a new
kind, and nothing in the workspace trips it.

Biome's own rules were looked at first and none of them expresses this. `noAwaitInLoops` is
the nearest, and it is the wrong one twice over: it catches the serialised form rather than
the two-phase one, and it would fire on the retry loop and on the store contract, which are
sequential on purpose. A plugin is Biome's supported way to add a rule, so that is what this
is. It was watched failing on both halves of three spellings of the wrong form planted in
the adapter, and watched passing on two spellings of the right form, before it was trusted.
The optional forms were watched the same way, on a matrix of fourteen: eight spellings of
the wrong form all refused, six of the right form all silent.

### The live timing

This is the latency recorded against the live Source on 2026-08-23, before any of this code
existed. Every figure the live timing test uses comes from it and none is invented here.

| step | time |
|---|---|
| Session bootstrap | 209 ms |
| Every bookable Showtime for one Movie, one date, 31 Theaters | 375 ms |
| 48 seat maps at concurrency 24 | 0.67 s |
| the same 48 at concurrency 12 | 0.96 s |
| the same 48 at concurrency 6 | 10.30 s |

A whole search is therefore about 1.3 s, and concurrency 24 is roughly fifteen times faster
than 6, which is what makes fan-out width the dominant performance lever in the system.

`packages/client/src/search.live.test.ts` runs one whole search against the live Source in
the same lane as the contract test and holds it to that table. It reads the listing, reads
every **bookable** candidate's seat map raw at the recorded optimum width, and then runs the
real search over the same work. Its fan-out is allowed the larger of two bounds: the
recorded 0.67 s scaled to the seat maps actually read, and the same raw pass taken moments
earlier converted to its concurrency-12 equivalent by the table's own ratio, which is to say
no slower than the same work at half the width. The whole search is then allowed that bound
plus the recorded bootstrap and listing, which is the 1.3 s figure written out from its
parts.

Taking the larger of the two bounds is what keeps a slow afternoon at the Source from
reading as a regression in this code, and what it catches is a fan-out that has lost its
width or grown a stall, which is the only way this code can be the reason a search is slow.
The width is written out in the test rather than imported: if the fan-out's own width ever
changed, the recorded bound would catch it, so the two do not have to be the same constant
to be comparable.

It needs `SEATSCOUT_UPSTREAM_ORIGIN` and `SEATSCOUT_AREA` like everything else in that
lane, and it spends roughly two searches' worth of requests: one raw pass and one real one.

## Re-verifying before hand-off

`packages/client/src/verify.ts` is the only place a **result's** ticketing URL comes from. A
search result carries none, so the interface refuses a hand-off that skipped this step rather
than a comment asking for one ([ADR 4](docs/adr/0004-booking-ends-at-a-deep-link.md), and the
reason is that a Seat can go between being shown and being bought). `CONTEXT.md` defines
Re-verification and its two ways of answering no.

**It takes the result and the Query the result came from.** The result cannot name its own
listing, and the listing is the only thing that carries a ticketing URL: a seat map answer
holds an Auditorium's Seats and nothing else, so nothing about the Showtime a Seat belongs
to is recoverable from it. The Query's three listing terms are what find the Showtime again,
and its party size, accessible seating and Seat Profile are what rank the alternatives on
the same yardstick the search ranked on. Passing them is what makes a verification answer
about the search it belongs to instead of about a default.

**It asks the Source for the Auditorium and nothing else.** The listing is read through the
same on-device cache a search reads, so a hand-off moments after a search spends no request
on one. The catalogue's own two-hour lifetime applies: what a hand-off must not reuse is an
Availability judgement, and a ticketing URL is not one.

**It re-reads the Auditorium every time, whatever the result's age.** There is no threshold
and adding one would be a number that changed nothing: this is the only source of a
ticketing URL, so a stale reading can never reach a hand-off and there is nothing for a
threshold to decide.

**A Seat Group is still there when every Seat in it is still there and still bookable.**
That is the predicate, and it is deliberately not "the room still offers this Group".
`seatGroupsIn` yields one Group per uninterrupted run, the window of that run crossing the
fewest consoles and then nearest its middle, so a Seat coming free *beside* a Group moves the
window the run offers: in the
captured Auditorium the suite uses, freeing one Seat shifts the offered pair from `F9+F8`
to `F8+F7` while both of the Seats someone is holding are free. Looking the Group up among
the offered ones would call that taken and send someone to alternatives they did not need.

**What comes back is a fresh reading of that Group, not the one it was handed.** The Seats,
the moment, the attempt count and what the filters removed all come from the Auditorium as
it reads now, through the same `resultOf` a search builds a result with. Its key and its
score are the same, because a key is the Showtime and the Seats and a score is a pure function
of the Group, the Auditorium it sits in and the Profile. The third of those is easy to miss:
`scoringIn` derives the row count, the half span and which Seats stand against a wall from
every Seat in the room, so a room that reads back a Seat short moves the score without the
Group changing.

The one value carried across rather than re-read is how many consoles the Group crosses, and
it is carried because it is part of what the caller is asking about rather than part of what
the answer says: a Seat Group is its Seats and the consoles between them, and both are how
the room is drawn rather than what is on sale in it. That it is load-bearing is checked in a
room where the best Group at a party of three does cross one, because in the 42 captured seat
maps a party of two never does and a suite that only asked about pairs could not tell
a carried count from a zero.

**Everything else fails closed.** A Group whose Seats have gone answers `taken`, and so does
a Showtime the listing no longer offers and an Auditorium the Source refuses as sold out,
begun, or general admission. Only a Source that could not be reached, in the listing or in
the Auditorium, answers `unreachable`. Two reasons is the whole set, and neither carries a
URL, so an answer that cannot judge cannot hand off.

**A Group that has gone is answered with the Auditorium's other Seat Groups, ranked.** Not
one of them, which is the search's rule and is right there, because adjacent Groups in one
room differ by a Seat and by less than the model can resolve while adjacent Groups in
different rooms do not. Here they are the alternatives to one Group in one room, which is
exactly what a search declines to flatten into its list. They are built by `seatGroupsIn` and
ordered by `scoringIn`, the same two the search uses, so no second notion of "better" exists
to drift from the first.

**A Showtime the listing could not identify has no result to verify.** No result is built for
one, so for as long as a verification reads the same cached listing the search did, there is
nothing of the right type to hand over. A verification that outlives that cache entry can meet
a fresh listing that has since lost the identity, and it answers `taken` with no alternative:
there is nothing to ask a seat map with, and an answer it cannot judge must not offer a way to
buy. What that costs is the operator's-own-page remedy the Coverage entry would have offered,
which is the price of having two ways to answer no; a fresh search restores it, and a result
older than the cache entry it was built from has earned one.

### Why an unverified hand-off does not compile

`TicketingUrl` is branded, and the only declaration of that brand is the field of the
aggregator's own response the parser reads. A `string` is not one, nothing mints one, and a
search result's Showtime is `Omit<Showtime, "ticketing">`, built field by field so the URL is
absent at runtime rather than merely erased from the type. So the only value of that type a
caller can reach *from a result* is the one a successful verification returns.

A Catalogue still carries Showtimes and a Showtime still carries its URL, which is deliberate
rather than an oversight: the remedy for a Showtime nobody can check is the operator's own
page, and the named Coverage outcomes depend on it. What has no path to one is a result, which
is the hand-off ADR 4 is about.

Two things get past a brand. One is a type assertion, and that is why
`noUnsafeTypeAssertion` is on: both spellings are refused, `as` and the angle-bracket form,
while `as const` is not an assertion in that sense and stays allowed. The rule is Biome's own
rather than a plugin because Biome has one, which is the order to try them in; a plugin was
written first and deleted on finding it. It sits in `nursery`, and if a version bump ever
renames it, Biome refuses an unknown rule key and exits non-zero, so the gate cannot quietly
stop gating.

The other is a type predicate that claims one, and it cannot be refused, because it is how a
brand is minted in the first place: the catalogue parser's `carries` narrows a response to a
declaration whose field is already a `TicketingUrl`. A rule against it would be a rule against
parsing.

So what remains is a reviewed line in a diff. A predicate that claims a brand it did not
parse, a suppression of the lint rule, a widening of the brand, or a `declare` that conjures a
`TicketingUrl` would each work, and each is visible. The property is that no ordinary code
path reaches a URL, not that a determined author cannot; the same is true of every
compile-time guarantee in this workspace.

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
asserts against the file rather than against intent, over the file's whole key set and
over the assets block's own. Run it with `pnpm --filter @seatscout/proxy dev`.

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

## The deployment

`apps/proxy/wrangler.json` is the whole deployment: one Worker whose `assets.directory`
is everything `apps/web` builds, and whose script is the proxy. A request matching a
built file is served by the platform without invoking the Worker at all, and every other
request reaches the proxy. That is the platform's default routing and it is why the
configuration is five keys rather than a routing table. Two consequences are worth
knowing. Asset requests are free and outside the daily request quota, which is what makes
the free tier sufficient rather than a compromise. And the assertion the proxy verifies is
therefore checked on proxy requests and not on asset requests, which is correct: the
access layer is what gates what `apps/web` builds, and that is this repository's own
compiled source, with no user data in it and no reach upstream. `/` is served from
`index.html` by that same default routing, which is what closed it as a path into the
proxy; no key of the configuration changed to do it.

`assets` declares a directory and nothing else. Naming a binding would hand the Worker a
reader for what it publishes, and `run_worker_first` would put the Worker in front of
every asset, which is what a Worker that needed to transform assets would do and would
cost the quota exemption above. Both are one reviewed line away if a reason arrives.

`.github/workflows/deploy.yml` deploys on merge to `main` and on manual dispatch. It runs
`wrangler` from the workspace rather than through a deploy action, so the version that
deploys is the version the lockfile pins and the dry run below already exercised. With
neither `CLOUDFLARE_API_TOKEN` nor `CLOUDFLARE_ACCOUNT_ID` set it skips the deploy job and
says so in the run summary, so a fork gets a green build rather than a confusing red one;
with one of the two set it fails and names the other, because that is a half-configured
repository rather than one nobody has set up.

The `quality` job runs `wrangler deploy --dry-run`, which needs no credentials, no account
and no network. It bundles the Worker, reads the asset directory and reports the bindings,
so a configuration that no longer produces a deployable Worker fails a pull request rather
than a deploy. It is half of what holds the claim that a second instance stands up from
this repository alone; the other half is the configuration test above, which is what keeps
a value belonging to one deployment out of the configuration in the first place. Neither
substitutes for a real deploy against a real account, and neither claims to.

`deploy/` holds the runbook and two scripts, `setup.sh` to walk the dashboards and
`verify.sh` to read back what took effect without reading a secret. They are in the
repository rather than beside it because self-hosting is in this project's scope and the
public README already promises them; `shellcheck` runs over them in the `quality` job.

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
