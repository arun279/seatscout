# 5. Build numbers come from the run counter

Date: 2026-08-28

## Status

Accepted

## Context

A release pipeline signs a build and hands it to a store. Almost none of that is worth
unit testing: there is no useful test double for App Store Connect, and a test asserting
that a workflow file contains a step proves only that someone typed it. Those parts are
verified by running them.

One part is different. Deciding what a run should produce, which platforms build, which
lane each runs, what marketing version and what build number apply, is pure logic, and it
is the only part of the pipeline whose failure cannot be undone.

Google Play documents its greatest accepted `versionCode` as 2100000000, refuses a value
already used by a previous version of the same app, and requires an update's value to
exceed the current one. Apple has no revert. A build number that regresses, or that jumps
somewhere it should not have, is therefore not a bug that can be fixed forward.

The build service offers to solve this. EAS can increment the build number itself. Taking
that offer would put the counter on Expo's side, which is the one piece that would not
travel if this project ever built elsewhere, and losing the sequence is exactly the
unfixable failure.

GitHub already publishes a counter. It documents `run_number` as a unique number for each
run of a particular workflow in a repository, beginning at 1 and incrementing with each
new run, unchanged by a re-run. Workflow and repository are its only stated scoping
dimensions, so branch is not one of them and every branch draws from the same sequence. It
documents `run_attempt` as beginning at 1 and incrementing with each re-run, and states no
upper bound on it.

## Decision

One resolver turns a trigger and the run counters into a plan or a refusal. Every trigger
is meant to reach the platform jobs through it, so that no trigger carries release logic of
its own.

The build number is the attempt's position in run history: one less than the run number,
multiplied by a hundred, plus the attempt. Ordering it that way makes it strictly
increasing along GitHub's own ordering of run history, whatever branch a run was cut from.

The hundred is a choice, not a citation. Packing two counters into one integer needs a
bound on the inner one, GitHub publishes no bound on re-run attempts, and so the resolver
imposes its own and refuses anything past it rather than letting an attempt spill into the
next run's numbers. A hundred attempts leaves room for 21000000 runs, and the two together
land on Google Play's ceiling exactly.

The marketing version comes from a tag: the ref's own name when a tag is being built, and
the nearest tag reachable from the commit otherwise. It is accepted only if it parses as a
semantic version, allowing the leading `v` that tags conventionally carry, and only if it
carries no prerelease and no build metadata, because Apple's `CFBundleShortVersionString`
is three period-separated integers and may hold only digits and periods.

Each platform has exactly one lane here. iOS releases through TestFlight, which needs a
submission to App Store Connect. Android releases through EAS internal distribution, which
serves the build from a URL. Those two facts are of different kinds and both are recorded:
EAS Submit's only targets are App Store Connect and Google Play, so asking for TestFlight
on Android names nothing that exists, whereas EAS internal distribution on iOS does exist
but needs ad hoc or enterprise provisioning that this project does not set up. A dispatch
pairing a platform with a lane it does not have is refused rather than quietly corrected.

The result is a plan or a refusal and never both. A plan's builds are the pairs that mean
something, as a type rather than as a check, so a plan cannot express a build that could
not run and cannot carry a field the resolver failed to work out. Refusals carry the reason
and the value that caused them.

## Consequences

The rule that cannot be got wrong is the one covered by property tests: any two runs
ordered by run history get build numbers in the same order, whatever else differs between
them, and every combination of trigger, ref and input yields a whole plan or a stated
refusal.

A build cut from an old branch still outranks what testers already have, because the build
number is a function of the run and of nothing else. In particular it is not derived from
the marketing version, which would invert the moment an older line was rebuilt.

Building on owned hardware stays possible, because the counter belongs to the repository
rather than to whoever runs the build.

Two things about the counter follow from where it comes from and are constraints on the
pipeline rather than on this module. The counter belongs to one workflow file, so renaming
or moving the release workflow, or splitting it in two, starts a second sequence at 1 and
is the regression this decision exists to prevent. And a run number is assigned when a run
is queued rather than when it finishes, so two runs that overlap can finish out of order.

In both of those cases, and when an old run is re-run after a newer one has already
shipped, the number offered is below what the store already holds and the store refuses it.
That costs a run. It is the recoverable half of the trade, taken so that the unrecoverable
half cannot happen.

The resolver is build tooling rather than product code, so it lives in `tools/` and not
under the layout ADR 3 defines for the application. `packages/core` does not depend on it,
and in a pnpm workspace a package can only resolve what it depends on, so there is no path
by which Core could import it.
