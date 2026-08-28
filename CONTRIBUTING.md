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

One thing is carved out: the two view layers, `apps/web` and `apps/native`. ADR 3 puts
everything correctness critical in `packages`, so what is left in a view layer is screens,
and the only test that kills a mutated screen is one that restates the screen. That is the
tautology this gate exists to detect, so the view layers are excluded rather than given
tests written to satisfy them. What they are for is the end-to-end suite, which a mutation
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
because the import ban leaves Core no host type to borrow.

It replays the corpus by route. Every capture is indexed under the path it was recorded
at, query string dropped, because the capture redacts the location parameters and no
adapter would reproduce them. A route the corpus never recorded throws instead of
answering, so no test can pass against a response nothing observed. The three refusals the
capture met arrive as themselves rather than as an invented failure payload.

Faults are scripted as a status and a share of requests in percent, drawn against a
hundred-slot table. `[{ status: 500, percent: 20 }, { status: 403, percent: 5 }]` is a
fifth of requests failing and a twentieth needing a session refresh. A faulted response
carries the scripted status and an empty body, because no body was ever recorded for one.

Arrival order is where the seed earns its place. Every request draws a latency, and
requests issued in the same turn are delivered in latency order rather than request order,
so code that accidentally depends on completion order fails rather than passes. Nothing
sleeps: a batch is released on the next microtask and its promises are resolved in the
order the seed decided, so out-of-order arrival costs no wall clock at all. The generator
is `pure-rand`'s xoroshiro128+, and `fake-upstream.test.ts` asserts both directions of
what determinism means: one seed reproduces its order exactly, and another seed produces a
different one. Each request draws its latency and then its fault percentile, in that order
and always, so scripting faults into an existing test does not reshuffle the arrival order
it was written against.

The harness is not part of Core's compiled product. `tsconfig.json` excludes `src/testing`
beside `src/corpus` and `tsconfig.test.json` takes it, so nothing that imports the corpus
reaches `dist`. The import ban is untouched either way: the Biome override still covers
all of `packages/core/**`, and the harness imports nothing but the corpus and a generator
that is pure TypeScript.

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
types before 0.87 and cannot be raised past what React Native 0.86 pins. Neither option
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
