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

`stryker.config.json` mutates the `src` of every workspace package and breaks below a score
of 100, so a file the unit suite does not judge shows up as an uncovered mutant and fails the
run just as a survivor does.

**It runs twice.** On every pull request, inside the `footprint` job, incrementally: the run
reuses what an earlier run already judged about code that has not changed, and the score goes
in the pull request comment beside the other figures. And on every push to `main`, in the
`Baseline` workflow, which restores no incremental file and so judges the whole tree with
nothing to inherit from. That run leaves its incremental file in the Actions cache under
`main`'s commit, and every branch's run starts from it. Nothing cross-checks the two: the
branch run reuses the baseline's verdicts rather than reaching them again, so what the
baseline got wrong a branch inherits until the file it wrote is replaced.

**A red baseline leaves no seed, so it says so where somebody will read it.** The workflow
opens an issue labelled `baseline-red`, or comments on the open one, naming the step the run
itself reports as failed, the tests the initial run reported failing and the run; any green
Baseline afterwards comments on that issue and closes it, a run started by hand included,
because a maintainer confirming the fix by hand should not have to wait for the next push.
That is the shape [ADR 11](0011-a-nightly-reading-judges-the-world.md) already gives the
nightly reading, and for the same reason: the two red runs of 2026-09-19 were found by
somebody looking rather than by anybody being told. Filing is the half a run by hand skips,
so re-running one to watch it costs no issue.

`main`'s run follows the merge that changed `main` rather than a clock. On a schedule it
re-judged a tree that had not moved, and the seed a branch started from was always as old as
the last night rather than as old as the last merge. A merge landing while one is still
running cancels it, because the whole point is a seed at the tip and a run for a commit that
is no longer the tip cannot produce one. Without that a busy day queues twenty-minute runs
behind each other and the seed lags further than the schedule ever left it: `main` took
seventeen pushes on 2026-08-29 and five to seven on a normal day.

The `footprint` job saves its incremental file immediately after the mutation step and on any
outcome, rather than in a step that runs after everything else and only when everything else
passed. A job that judges every mutant and then fails or is cancelled in a later step used to
throw that work away: the cache action's own save is skipped on both, twice costing a branch
a nineteen-minute run it had already finished. What this does not do is bank a run cut short
in the middle of judging. The runner starts the save as soon as the step is cancelled and
terminates the mutation process afterwards, so the file saved is the one that was restored,
and the work in flight is lost either way.

Before either workflow saves that file, it reads Stryker's own initial-run count and holds
it to the tests `vitest list` collects over the files `stryker.config.json` mutates, in the
same related mode Stryker's Vitest runner selects with. A short or missing count means the
runner did not collect the whole related unit suite, so the job fails and the partial report
is not cached as a seed for later runs. A count of nothing fails too, because a pass has to
entail a measurement.

**That count is collected rather than run.** The step used to run every related test in
order to count them, and piped the runner's JSON into `jq`. So a single test timing out
failed the step with `xargs`'s exit code 123 and sent the name of the test that timed out
into `jq` with the rest of the output: the Baseline run of 2026-09-19 reported that code and
named nothing at all. A listing makes the same selection without the run, writes its JSON to
a file rather than into a pipe, and leaves its own errors on the step's output.

Related mode is not among the `list` command's flags in the pinned Vitest, so
`vitest.related.config.ts` carries it: each workflow names the mutated files in
`RELATED_FILES` and that configuration passes them to `test.related`.

The two counts are not reached the same way, and one difference survives that. A listing
leaves a skipped test out and Stryker's run counts it, so the first `it.skip` in the suite
makes the two differ by one. The tree holds none today, the numbers agreed at 984 when this
was changed, and the refusal names that case rather than leaving a reader to find it.

The incremental mode is Stryker's own, and it is a reuse of earlier results rather than a
second opinion about them: it matches a mutant by the content of the file it sits in and of
the tests that covered it, and re-runs anything that does not match. That is why the whole
run on `main` stays. A pull request whose cache is cold pays the whole run, which is the
honest cost of the first push on a branch that `main`'s seed usually spares it.

**Each report is a seed of its own, and every cache entry names one file.** `actions/cache`
derives a cache's version from its `path` list, so a job asking for two files cannot read a
cache saved for one, and a list that grows silently hides every seed saved before it: the run
that found this judged 4,987 mutants from nothing and was cancelled at its two-hour cap. Both
workflows therefore write `path: reports/stryker-incremental.json` wherever they carry the run
in Node and `path: reports/stryker-native-incremental.json` wherever they carry the run over
the app, and the second lives in a `stryker-native-` key family of its own. Ten cache entries
across the two workflows name one seed file each, and a list that grows back to two is a count
that no longer matches this sentence.

**Only a run that passed leaves a seed, under every key it writes.** A mutant that runs while
the file is loaded is covered by no single test, so the matching above cannot tell that a test
which kills it has since been added in another file, and a `Survived` verdict saved by a red
run would be handed to every later push on that branch. A red run therefore caches nothing and
the next push re-judges its own delta against `main`'s seed, which costs minutes and is the
price of never inheriting a verdict the tree has already disproved.

**The run's exit status is not what fails the pull request.** Stryker writes its report, the
footprint report reads the score out of that report and holds it to the break threshold the
same report names, and the job goes red on that. This is the shape size-limit already has
here, and for the same reason: a tool's exit status cannot say whether it measured something,
and the verdict belongs where the number is printed.
[ADR 6](0006-gates-cite-a-standard-or-measure-a-regression.md) carries the guard that makes
a run weighing no mutant fail.

**Nothing is carved out, and it takes two runners to say so.** Vitest cannot render React
Native, so `stryker.config.json` mutates everything that runs in Node and leaves
`apps/native/src` alone, and `stryker.native.config.json` takes that directory with Stryker's
Jest runner over the `jest-expo` preset. The second run sets `coverageAnalysis` to `off`,
because under `perTest` and `all` the runner re-resolves the test environment from a raw,
un-normalised config and silently replaces a preset's with the Node default
([stryker-js#6108](https://github.com/stryker-mutator/stryker-js/issues/6108), which names
`jest-expo`); `off` is unaffected. It filters by related tests, keeps an incremental report of
its own, and breaks below 100 like the first.

**One kind of value is ignored, by a plugin rather than by file.** `tools/stryker-style-tables.mjs`
skips the argument of `StyleSheet.create`, and a table declared at the top of the three files that
declare one: the theme, whose two appearances, type roles and scales are all table; the router's
layout, whose screen options are a declaration to the platform; and the screen band, whose table is
the geometry and the gradient stops of a drawing. It reaches no other file, so the headers a device
read carries are judged like any other adapter. A drawn or declared value
is held by the headed pass and its screenshots: the only test that kills a mutant in one restates
the value, which is a tautological test. Everything that holds behaviour is judged, screens
included.

Each run's set is written the same way in two places, because each gate is two numbers that have
to agree. The configuration says which files are mutated; the `footprint` job counts the tests
each runner finds over that same set, the listing in related mode for one and the Jest suite's
own total for the other, and holds each Stryker initial run to it. A set named one way in one
place and another way in the other is a run that judged less than it looked like it did, which is
what that step exists to catch.

`apps/web` stays inside the gate: it is the view layer that will hold real behaviour, keyboard
traversal among it, and the platform adapters it already holds are judged there rather than
exempted by a line written while the directory was empty. That is why the browser store
adapter has unit tests of its own beside the browser run of its contract: a suite the mutation
gate cannot execute cannot be what judges a mutated adapter. The stateless proxy is not part
of the carve-out either: it has its own assertions, including that a cross-site request is
refused and that a visitor over the rate limit is, and a refusal is exactly the kind of
behaviour most worth proving can fail.

## Consequences

**A test cannot read the repository's own sources**, because the runner hands the suite
instrumented copies of everything it mutates. The counts gate is held to the tree by
`pnpm counts` in `quality` and on pre-push rather than by a unit test, for that reason, and
its table of pairs sits outside `src` for the same one.

**A fixture derived at module scope hides mutants.** A mutant that stops a test file loading
at all produces no failing test, and the runner scores that as a survivor rather than a kill,
so a suite that derives its fixtures at module scope reports mutants as surviving that its
assertions would otherwise have caught.

**A dry-run timeout is a signal about the test's own size, not about the timeout.** Stryker
numbers mutants in file order and records per-test coverage in a plain object keyed by the
mutant id as a string. V8 keeps such an object's numeric keys in fast elements only while the
first index written stays under `JSObject::kMaxGap`, which V8 sets at 1,024, and falls to
dictionary elements otherwise, which made every coverage increment about six times slower
when benchmarked (34 ms against 211 ms per five million). `apps` sorts before `packages`, so
when the first screen added about 700 mutants under `apps/web`, Core's ids moved from the
hundreds past 1,250 and the Seat Profile sweep, unchanged, went from 1.6 s to 5.8 s under the
dry run and timed out. It is now five sweeps of one benchmark room each rather than one of
five, with the same assertions partitioned. The remedy is to divide the test's work, not to
raise the timeout.

**The allowance the dry run does get has to be written where a project reads it.**
`vitest.stryker.config.ts` merges 30 seconds into the root configuration, and in the pinned
Vitest a project declared inline inherits nothing from the root unless it says
`extends: true`. The two projects in `vitest.config.ts` both say it, and `pnpm counts` refuses
a third that does not. Without it the merge reached no test at all, every one of them ran at
the default 5 seconds under the instrumentation, and the sweep above timed out again on
2026-09-19 on a tree whose own pull request was green. Vitest's own migration guide makes
`extends: true` the default for an inline project in the next major, so this leans with that
change rather than against it.

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

The gate is not a required check, and the reason is cost rather than the reason
[ADR 11](0011-a-nightly-reading-judges-the-world.md) gives for the nightly. The two arguments
are not interchangeable.
