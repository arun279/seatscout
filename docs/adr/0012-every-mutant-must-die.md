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

The incremental mode is Stryker's own, and it is a reuse of earlier results rather than a
second opinion about them: it matches a mutant by the content of the file it sits in and of
the tests that covered it, and re-runs anything that does not match. That is why the whole
run on `main` stays. A pull request whose cache is cold pays the whole run, which is the
honest cost of the first push on a branch that `main`'s seed usually spares it.

**The run's exit status is not what fails the pull request.** Stryker writes its report, the
footprint report reads the score out of that report and holds it to the break threshold the
same report names, and the job goes red on that. This is the shape size-limit already has
here, and for the same reason: a tool's exit status cannot say whether it measured something,
and the verdict belongs where the number is printed.
[ADR 6](0006-gates-cite-a-standard-or-measure-a-regression.md) carries the guard that makes
a run weighing no mutant fail.

**One thing is carved out: `apps/native`.** [ADR 3](0003-separate-view-layers-shared-core.md)
puts everything correctness critical in `packages`, and that application is a shell, so what
is left in it is screens, and the only test that kills a mutated screen is one that restates
the screen. That is the tautology this gate exists to detect, so it is excluded rather than
given tests written to satisfy it. What `apps/native` is for is the end-to-end suite, which a
mutation run over the unit tests cannot stand in for.

`apps/web` stays inside the gate: it is the view layer that will hold real behaviour, keyboard
traversal among it, and the platform adapters it already holds are judged there rather than
exempted by a line written while the directory was empty. That is why the browser store
adapter has unit tests of its own beside the browser run of its contract: a suite the mutation
gate cannot execute cannot be what judges a mutated adapter. The stateless proxy is not part
of the carve-out either: it has its own assertions, including that an unauthenticated request
is rejected, and a fail-closed check is exactly the kind most worth proving can fail.

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
