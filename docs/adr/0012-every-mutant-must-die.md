# 12. Every mutant must die

Date: 2026-09-05

## Status

Accepted

## Context

A test that cannot fail is worse than no test, because it reports safety it does not provide,
and nothing static tells one apart from a test that works. Coverage does not: a line executed
by a test that asserts nothing about it is covered. A test count does not: it notices a suite
shrinking and says nothing about whether what is left asserts anything.

Mutation testing does tell them apart. It changes the code and asks whether the suite
notices. The question it leaves is where to set the bar, and the honest answer here is that
any bar below the top invites an argument about which surviving mutant is acceptable, at the
moment somebody least wants to have it.

## Decision

`stryker.shards.json` names one run for each workspace, and `stryker.config.mjs` takes the
shard named in `MUTATION_SHARD` out of that list: it mutates that workspace's `src`, runs that
workspace's own tests and nothing else, and breaks below a score of 100. The Expo app is the
one workspace divided further, into five file groups, for the reason the amendment below
measures. A file the unit suite
does not judge shows up as an uncovered mutant and fails the run just as a survivor does.

**The gate is divided by workspace because a static mutant costs the whole suite.** A mutant
executed while its module is loaded is covered by no single test, so Stryker runs every test it
has for it, which is what its own record of
[static mutants](https://stryker-mutator.io/docs/mutation-testing-elements/static-mutants)
says it does. Over the whole tree that was the 986 tests the repository held that day, 150
seconds net, for each such mutant: moving one module of constants on 2026-09-19 left 502 mutants to re-judge and
the run took 57 minutes, where the Expo app's own run took one or two. Stryker has no sharding
of its own ([stryker-js#4806](https://github.com/stryker-mutator/stryker-js/issues/4806)), so
each shard narrows both halves itself: `mutate` to one workspace, and the tests to that
workspace's own through the Vitest configuration the runner loads. `vitest.stryker.config.ts`
reads the shard `MUTATION_SHARD` names and includes that workspace's test files and no others,
so the initial run and every static mutant see one workspace's suite, and the wall clock is the
slowest shard rather than the sum.

Stryker's own `testFiles` does the same selection and is not used, because it also hands every
mutant a test filter, and Stryker 10.0.0 activates a static mutant that has a filter only once
its module has already loaded
([stryker-js#6144](https://github.com/stryker-mutator/stryker-js/issues/6144)). Under it the
mutant never takes effect: two static mutants in `tools/no-empty-run` survived a test that
asserts their exact output, and the rest of that file's came back as timeouts rather than
kills. A configuration that includes fewer files gives Stryker no filter, so a static mutant is
active before anything imports it. The Vitest runner's `vitest.related` is turned off for the
same reason in another form: on by default, it narrowed a static mutant to the few tests that
import the mutated file, and on the first run of the division 165 static mutants in
`packages/view-logic` survived for it alone.
`ignoreStatic` would have been the cheaper answer and is refused, because it narrows what the
gate judges rather than what the gate costs.

**A mutant is killed by the tests that own it or by nothing.** One a package's own suite never
reached, and another workspace's test happened to kill, now has no coverage in its own shard
and fails it. That is a hole in the owning suite rather than a cost of the division: each layer
of the testing owns something, and a package leaning on a screen to kill its mutants owned
nothing. The answer is the test the workspace was missing, never a shard widened back towards
the tree.

**A pull request judges the files it changes.** The `changes` job lists the source files the
pull request adds or modifies, plus the sources any changed test or fixture file imports, and
`tools/mutation.mjs --plan` splits them by shard into jobs. The change is read against the merge
commit's first parent, which is main as the change merges into it. GitHub's record of a pull
request's base can be older than that. On PR #198 it predated a merge to main made a minute
before the run. That merge's edits to two screens were then planned as #198's own. Under Vitest a job holds up to
eight files. Under Jest a job mutates only the lines the change adds or edits; a source reached
only through a changed test, and a shard's canary, are mutated whole. This is the scope Google's
code-review mutation testing reports on ([State of Mutation Testing at Google](https://research.google/pubs/state-of-mutation-testing-at-google/), 2018),
and it is what made it necessary: a pull request touching ten lines of one large screen mutated
all of it, and that one job took 58 minutes.

**Under Jest a job holds a set number of mutants, each named by its exact place.** The app is
cut finer than by file because each of its mutants re-runs every related screen test on both
platforms. Lines are not fine enough either: one component of 42 mutants, which no line range
could split, was cancelled at 60 minutes. So the plan finds the mutants first, with Stryker's
own instrumenter (`@stryker-mutator/instrumenter`, pinned to the same version as
`@stryker-mutator/core`) and the shard's `drawn-values` ignorer. It names each mutant by its
node's place, `file:line:column-line:column`, and packs those places in source order, up to the
`mutantsPerJob` its shard names in `stryker.shards.json`.

Stryker keeps a mutant when its node lies wholly inside a range, so the range of a function
would also take every mutant inside the function. The `exact-ranges` ignorer
(`tools/stryker-exact-ranges.mjs`) stops that: a range given with columns names one node, and
any mutant inside it is ignored unless its own node holds one of the job's ranges. A job judges
the mutants it names, plus any that lie between two of its ranges, and the plan counts those
too. Before it prints, the plan instruments each job again with the job's own ranges and both
ignorers, and fails unless every mutant lands in a job and no job holds more than its shard
allows. The job then holds Stryker's report to the plan: it must judge exactly as many mutants
as the plan gave it.

The limits are measured, against a job of 30 minutes. On PR #139 on 2026-10-04, 32 Jest jobs
judged at least one mutant. Each paid an initial test run of 1 to 10 minutes, then ran its
mutants four at a time, one on each of Stryker's test runner processes. A mutant of a Room
screen, which reaches 196 tests, held a process for up to about 5.5 minutes after an initial
run of up to 7: 12 mutants are three turns, about 24 minutes, so `search`, `ask` and `shell`
take 12. Three design-system primitives, whose job reached 850 tests, held a process for about
8 minutes a mutant after a 10-minute initial run: 12 would be about 34 minutes and 8 are about
26, so `design-system` takes 8. The theme reaches more tests than any other file (900 on that
pull request, with an 11-minute initial run), so it takes 8 as well.

Each job runs Stryker with `--mutate` set to exactly its files or ranges, under its shard's
runner and test configuration, and breaks below 100 like a whole run. The job also holds
Stryker's own count of the files it found to the number it was handed, so a path that reaches
nothing fails rather than passing over less than it was given. It refuses a job in which any
mutant ended as a runtime or compile error, and names each one with its error. Stryker leaves
such a mutant out of the score, so a break of 100 passes it, yet no test judged it. A job in which
every mutant errored would score NaN, which is never below a threshold. A file whose mutants are
all ignored, or that has none, has nothing to judge. A pull request that touches no source
file runs no mutation job, except that a change to the mutation machinery itself (the shard
list, the Stryker and Vitest configurations, the Jest configuration, the two ignorers,
`tools/mutation.mjs`, `tools/mutation-plan.mjs` or the lockfile) judges the `canary` file each
shard names whenever the change itself plans no job in that shard, so a machinery change is
seen killing mutants in every shard before it merges. A Jest shard's initial run gets 15 minutes
rather than Stryker's default 5: the theme file reaches nearly every screen test, which take 1
minute 55 seconds on a runner uninstrumented and passed 5 minutes under instrumentation.

Stryker.NET ships this scope as its
[`since`](https://stryker-mutator.io/docs/stryker-net/configuration/) option, which tests only
the code changed since a target. StrykerJS has no such option, so the diff goes through
`--mutate`, which its [incremental](https://stryker-mutator.io/docs/stryker-js/incremental/)
documentation uses to scope a run to named files. Nothing is inherited between runs, so no verdict is
reused that a later change has disproved, and a red run leaves nothing behind for the next push
to trust. `pnpm test:mutation` still judges every shard over the whole tree for anyone who wants
that reading.

The cost this removes was measured: with an incremental seed per shard, one pull request's
design-system shard took 48 minutes for 319 mutants, and the nightly whole-tree run of the same
shard took two hours and failed on timeouts under load rather than on survivors.

**Nothing is carved out, and it takes two runners to say so.** Vitest cannot render React
Native, so every shard but one runs under Vitest, and the shard over `apps/native/src` takes
that directory with Stryker's Jest runner over the `jest-expo` preset, with `coverageAnalysis`
`perTest` for every shard but the theme's, so a mutant runs only the tests that reach it (below).
It breaks
below 100 like the rest, and its Jest configuration already collects `apps/native` and
nothing else, so it needs no narrowing of its own. It must not be given `testFiles` either:
naming the files turns off the related-test filter the Jest runner applies to every mutant, so
every mutant would run every test.

**A Jest shard runs two mutants at a time, and allows each one Stryker's 1.5 per platform.**
Stryker allows a mutant `timeoutFactor` times the summed time of the dry run's tests, plus
`timeoutMS` and the dry run's overhead. Stryker's defaults are 1.5 for `timeoutFactor` and 5 s
for `timeoutMS`; this configuration sets 3 and 100 s, for the reasons below. Two things
made that allowance too short for the app. Most app mutants ended as timeouts, and Stryker counts
a timeout as detected, even when no test would have killed the mutant.

First, Stryker's Jest runner keeps one result per test name, and `apps/native/jest.config.js`
runs every test twice under the same name, once as iOS and once as Android. On a local run over
the Room's row bar and screen edge, the dry run's tests summed 190.9 s with 46.0 s of overhead,
and each mutant was allowed 193.0 s. That is 1.5 × 94.7 s + 5 s + 46.0 s: Stryker had counted
one run of each test in two. `stryker.config.mjs` multiplies the 1.5 by the number of projects the
shard's Jest configuration declares.

Second, the dry run is one process, but the mutants ran four at a time on a runner with four
virtual CPUs. So each mutant ran slower than the dry run that set its allowance. On two canaries,
the recent-searches list (12 mutants, 104 tests) and the film field (3 mutants, 196 tests), the
mutants ended like this:

| Runners at once | Factor | Recent searches: killed, timed out | Film field: killed, timed out |
| ---: | ---: | --- | --- |
| 4 | 1.5 | 0, 12 | 0, 3 |
| 4 | 3 | 4, 8 | 0, 3 |
| 3 | 3 | 9, 3 | 0, 3 |
| 2 | 1.5 | 10, 2 | 1, 2 |
| 2 | 3 | 12, 0 | 3, 0 |
| 1 | 1.5 | 11, 1 | 0, 3 |
| 1 | 3 | 12, 0 | 3, 0 |

Only both changes together ended every mutant killed. One runner at a time did that too, but its
jobs took 917 s and 989 s against 621 s and 545 s for two. So a Jest shard runs two at a time.
A shorter Testing Library wait, 250 ms instead of 1 s, changed no verdict at any setting, so a
wrong render waiting out its queries was not the cost.

**A Jest mutant runs only the tests that reach it.** With `coverageAnalysis` `off`, every mutant
ran every test Jest's related-tests search reached from its file: 104 for the recent-searches
list, 196 for the film field, 195 for the banner. Under `perTest`, Stryker records which tests
reach each mutant in the dry run and runs only those. Stryker's Jest runner has a bug there
([stryker-js#6108](https://github.com/stryker-mutator/stryker-js/issues/6108), with a fix open
in [#6219](https://github.com/stryker-mutator/stryker-js/pull/6219)). Under `perTest` it
re-resolves the test environment from the raw configuration, which has none of a preset's
settings, so it silently runs every test under Node instead of React Native. The workaround is
the one the issue gives: name the environment by absolute path. `apps/native/test/environment.cjs`
is React Native's own environment, wrapped in Stryker's documented `mixinJestEnvironment`, and
`jest.shared.js` names it by absolute path for the run and for each platform. That environment
marks itself, and `test/environment-held.cjs` fails every test file that does not carry the mark.
It did so on CI before the absolute path was added at the top level, which is how the bug was
seen. Once the fix ships, the absolute path can go, and the guard stays.

A mutant still loads every test file the related-tests search reaches, even when it runs only a
few of their tests. Stryker counts that loading in the dry run's overhead, and adds the overhead
to the allowance once, unscaled. With two runners, loading takes longer than in the dry run, which
ran alone. So a film-field mutant reached by few tests still timed out, at Stryker's default 5 s
of `timeoutMS`. Stryker's schema describes `timeoutMS` as the allowance for a busy machine. The
dry runs' overhead on the canaries was 40 to 67 s. So `timeoutMS` is 100 s: the largest overhead
measured, times Stryker's own 1.5. A real infinite loop does not wait for it, because under
`perTest` Stryker also stops a mutant once its code runs 100 times as often as in the dry run.

In the table, each cell gives killed, timed out, tests run per mutant, and the job's wall time.
"Extra allowance" is `timeoutMS`. The runs had two runners at factor 3; the 60 s row was measured
before the allowance was raised to 100 s.

| Coverage | Extra allowance | Recent searches | Film field | Banner |
| --- | ---: | --- | --- | --- |
| off | 5 s | 12, 0, 104, 440 s | 3, 0, 196, 578 s | 8, 0, 195, 1,730 s |
| perTest | 5 s | 12, 0, 40, 297 s | 1, 2, 57, 501 s | 8, 0, 16, 576 s |
| perTest | 60 s | 12, 0, 40, 375 s | 3, 0, 109, 409 s | 8, 0, 16, 668 s |
| perTest, one runner | 5 s | 12, 0, 40, 523 s | 2, 1, 93, 479 s | 8, 0, 16, 557 s |

So the Jest shards run `perTest`, with 100 s of extra allowance, except the theme's.

**The theme shard stays on `off`.** Under `perTest`, the dry run over `theme.ts`'s `appearanceOf`,
which `useTheme` calls on every render, grew without bound and ran out of memory: twice with
Node's default heap, and twice again with a 6 GB heap, while the runner still had 8 to 10 GB
free ([run 37866088016](https://github.com/arun279/seatscout/actions/runs/37866088016)). So a
larger heap only moves the failure. The theme also gains least from `perTest`: most of its
mutants are static tokens, and Stryker runs every test for a static mutant either way, 901 of
910 on CI. Its jobs took 794 to 945 s under `perTest`, against 891 to 1,353 s under `off`, while
the design system's fell from 873-1,177 s to 377-489 s. Each Jest shard names its coverage in
`stryker.shards.json`, and `tools/planted-red/src/mutation-timeout.test.ts` holds each one. The
theme can move to `perTest` once Stryker's coverage counting stops growing on a function every
render calls.

**A mutant's run stops at its first failing test.** Stryker's other runners stop a mutant's run at
the first failing test, unless
[`disableBail`](https://stryker-mutator.io/docs/stryker-js/configuration/#disablebail-boolean)
is set. Its Jest runner cannot: it sets Jest's `bail` to false, because Jest bails by exiting the
process ([jest#11766](https://github.com/jestjs/jest/issues/11766)), which would end Stryker's
runner. So a killed app mutant ran every test that reached it, failing one after another. Under
`theme.ts`'s `appearanceOf`, whose mutants fail most of the 908 tests the theme reaches, that run
grew until it ran out of memory, and Stryker scored two of its three mutants as runtime errors
rather than kills. `apps/native/test/stop-at-first-failure.cjs` does what `bail` would. The marked
environment calls it on every test event, and it acts only while `__STRYKER_ACTIVE_MUTANT__` is
set, which is during a mutant's run. Once a test fails under that mutant, it marks each later test
to be skipped, which jest-circus honours. A mutant is still killed by the test that failed, and a
survivor still runs every test, since nothing failed. `tools/planted-red/src/native-environment.test.ts`
holds the rule, including that a dry run or a plain run, with no active mutant, never skips. On CI,
with two runners and the shard's own coverage:

| Canary | Before: killed, errors, tests per mutant, job | After |
| --- | --- | --- |
| theme, `appearanceOf` (`off`) | 1, 2, 225, 3,097 s | 3, 0, 4, 690 s |
| theme, tokens (`off`) | 2, 0, 899, 1,353 s | 2, 0, 430, 551 s |
| recent searches (`perTest`) | 12, 0, 40, 375 s | 12, 0, 8, 197 s |
| film field (`perTest`) | 3, 0, 109, 409 s | 3, 0, 25, 440 s |
| banner (`perTest`) | 8, 0, 16, 668 s | 8, 0, 6, 547 s |

How long a mutant costs depends on the shard, so each shard's `mutantsPerJob` comes from its own
measurements. With two runners, a job of N mutants takes about 30 s to start, plus its dry run D,
plus r·D for every two mutants, where r is the time of one mutant's run over its dry run. With
each run stopped at its first failure, r measured on CI is 0.067 for the design system's banner,
0.22 for the recent-searches list, 0.30 for the film field and 0.61 for the theme's tokens. The
shell has no measurement with the stop yet, so it keeps its earlier 0.51, an upper bound, since
stopping early only shortens a run. D is the shard's slowest dry run across 84 recent jobs under
`off`, times 1.24 for the `perTest` shards, the largest gap measured between the two on the same
runner. Each `mutantsPerJob` is the largest N that keeps the estimate within the slowest app job
before these changes, 1,510 s:

| Shard | D | r | `mutantsPerJob` | Estimate |
| --- | ---: | ---: | ---: | ---: |
| design system | 800 s | 0.067 | 24 | 1,473 s |
| shell | 513 s | 0.51 | 6 | 1,328 s |
| Ask | 335 s | 0.30 | 22 | 1,471 s |
| search | 146 s | 0.22 | 82 | 1,496 s |
| theme | 692 s | 0.61 | 2 | 1,144 s |

These are the costs of killed mutants, since a job whose every mutant dies is the only kind that
passes. A survivor runs every test that reaches it, so a job holding one takes longer, and fails.

**One kind of value is ignored, by a plugin rather than by file.** `tools/stryker-style-tables.mjs`
skips the argument of `StyleSheet.create`, and a table declared at the top of a file the plugin
names: the theme, whose two appearances, type roles and scales are all table; the router's layout,
whose screen options are a declaration to the platform; and each module that draws, whose table is
the geometry, the stops and the stroke widths of a drawing. The list is the plugin's own and it is
read as a whole, so a module that computes rather than draws stays out of it and the headers a
device read carries are judged like any other adapter. A drawn or declared value
is held by the headed pass and its screenshots: the only test that kills a mutant in one restates
the value, which is a tautological test. Everything that holds behaviour is judged, screens
included.

## Consequences

**A test cannot read the repository's own sources**, because the runner hands the suite
instrumented copies of everything it mutates. The counts gate is held to the tree by
`pnpm counts` in `quality` rather than by a unit test, for that reason, and
its table of pairs sits outside `src` for the same one.

**A fixture derived at module scope hides mutants.** A mutant that stops a test file loading
at all produces no failing test, and the runner scores that as a survivor rather than a kill,
so a suite that derives its fixtures at module scope reports mutants as surviving that its
assertions would otherwise have caught.

**A dry-run timeout is a signal about the test's own size, not about the timeout.** Stryker
numbers mutants in file order and records per-test coverage in a plain object keyed by the
mutant id as a string. V8 keeps such an object's numeric keys in fast elements only while the
first index written stays under `JSObject::kMaxGap`, which V8 sets at 1,024, and falls to
dictionary elements otherwise, which made every coverage increment about six times slower when
benchmarked (34 ms against 211 ms per five million). `apps` sorts before `packages`, so when
the first screen of the web application this repository then held added about 700 mutants under
`apps/web`, Core's ids moved from the hundreds past 1,250 and the Seat Profile sweep,
unchanged, went from 1.6 s to 5.8 s under the dry run and timed out. It is now five sweeps of
one benchmark room each rather than one of five, with the same assertions partitioned. The
remedy is to divide the test's work, not to raise the timeout.

**The allowance the dry run does get has to reach every test.**
`vitest.stryker.config.ts` merges 30 seconds into the root configuration. That configuration
declares zero inline projects, because in the pinned Vitest a project declared inline inherits nothing
from the root unless it says `extends: true`. When it held two, the merge reached no test until
both said it, every test ran at the default 5 seconds under the instrumentation, and the sweep
above timed out again on 2026-09-19 on a tree whose own pull request was green.

**Two Stryker settings are less redundant than they look.** The vitest runner is named in
`plugins` because Stryker resolves its own plugin search against its package directory, which
under pnpm holds no siblings to find. And `ignorePatterns` keeps the root `tsconfig.json` out
of the sandbox, because Stryker rewrites whatever it finds there through
`ts.parseConfigFileTextToJson`, which TypeScript 7 no longer exposes. Nothing needs it to run
the tests: esbuild reads each package's own `tsconfig.json`, and the root file only lists
project references. With it out of the way the run works in a copy, so a run killed part way
leaves the working tree exactly as it found it. The copy itself is what such a run leaves
behind, so `cleanTempDir` is `always` rather than the default, which clears the sandbox only
after a run that finished.

The gate is a required check through `footprint`, the job that gathers every gate's result:
a mutation job that refused anything turns it red. The reason
[ADR 11](0011-a-nightly-reading-judges-the-world.md) gives for leaving the nightly reading out
of that list, that it reads a world this repository does not control, reaches nothing here.

## Amendment, 2026-09-26, revised 2026-10-03: the Expo app is five shards

One shard for `apps/native` could not judge a cold tree inside two hours: a pull request that
touched 18 of its files left 666 mutants to judge after the seed, and the run was cancelled at
the 120-minute limit twice. The cost is not the mutant count. With `coverageAnalysis` off, a
mutant runs every test file Jest's related-tests search reaches from its module, on both
platforms, and that reach is very uneven: `theme.ts` reaches 32 of the app's 43 test files,
the type, touch, platform and feedback primitives 15 to 30, and a screen file 3 to 7.

So the app is divided by file group, so the widest fan-in sits in the smallest shards: `theme`
(the files at the root of `src`), `design-system`, `search`, `ask`, and `shell` (every other
directory). Each shard runs `jest.config.js`, which composes the iOS and Android projects, so a
mutant is killed when either platform's tests kill it.

The first version of this amendment also split each group by platform, running one shard under
`jest.ios.config.js` and one under `jest.android.config.js`, to halve each mutant's cost. That
made a branch that runs on one platform only unkillable in the other platform's shard: the iOS
time picker's `"spinner"` display survived the Android shard on PR #161 although the iOS tests
assert it. A mutant the suite kills on some platform is killed, so the platform split went once
pull requests began mutating only the files they change, which is what bounds the cost now.
