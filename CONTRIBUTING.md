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
no test kills. Nothing is carved out of that: a file the unit suite does not judge shows
up as an uncovered mutant and fails the run just as a survivor does.

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

## Dependency updates

Renovate runs self-hosted from `.github/workflows/renovate.yml`, so no GitHub App has to
be installed on the repository. Its first run opens an onboarding pull request that adds
the shared configuration.

The workflow falls back to its own token, which cannot update files under
`.github/workflows` and whose pull requests do not start a CI run. Set a `RENOVATE_TOKEN`
repository secret to a personal access token with the `repo` and `workflow` scopes to
lift both limits.

`overrides` in `pnpm-workspace.yaml` lifts a transitive dependency past an advisory its
own package pins below. It holds `qs` above
[GHSA-q8mj-m7cp-5q26](https://github.com/advisories/GHSA-q8mj-m7cp-5q26), which reaches
the workspace through Stryker. An entry is removable once the package that pins it
releases a version that does not.
