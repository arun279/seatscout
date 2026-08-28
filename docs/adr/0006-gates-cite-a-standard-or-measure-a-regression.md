# 6. Quality gates cite a standard or measure a regression

Date: 2026-08-28

## Status

Accepted

## Context

A gate needs a number, and where that number comes from decides whether the gate is worth
having.

An invented absolute is the weakest source. It carries no authority, so it gets argued
down rather than met, and it is usually satisfiable without doing the thing it was meant
to encourage. A ceiling on the initial JavaScript bundle is the standard example: moving
work into a chunk that loads a moment later satisfies the number and ships the same bytes
to the same user.

An absolute also has to be chosen at some moment, and whatever exists at that moment
becomes the floor. Gates of this kind have to be in place before there is much to measure,
because one added later grandfathers in everything that preceded it.

Growth itself is the thing worth seeing. A repository does not usually acquire a bad
comment-to-code ratio or an oversized bundle in one change; it acquires them a few lines
at a time, in changes that each looked small.

## Decision

Every gate either cites a published standard or compares the branch against its merge base
with `main`. The absolute figure is reported either way.

**Cognitive complexity** uses Biome's
[`noExcessiveCognitiveComplexity`](https://biomejs.dev/linter/rules/no-excessive-cognitive-complexity/)
at its documented default limit of 15. The rule and the limit are both published, so
nothing here is this project's invention. This is the only complexity gate.

**Cyclomatic complexity** is reported and gates nothing. The figure comes from
[scc](https://github.com/boyter/scc), and its own documentation is careful about what it
is: an approximation reached by counting branch and loop keywords as it scans, rather than
a measurement taken from a syntax tree, and one that is only meaningful between files in
the same language. Everything measured here is TypeScript, so that limit does not bind,
but the report calls it an estimate because that is what it is.

It earns its place for the same reason the line counts do. This report exists to show
growth rather than to stop it, and complexity growth is the kind a line count hides: a
function can absorb a great deal of branching without gaining many lines. A second gate
on top of Biome's would only invent a threshold, which is the thing this decision forbids,
so the number is put in front of a reviewer and left there.

**Comment load** is comments per line of first-party source, and it may not exceed the
merge base. Only files with a JavaScript or TypeScript extension count, which keeps the
version comments that pin action SHAs out of the measurement.

The ratio form is what keeps the gate honest as the code grows, but it is worth being
plain about what it means today. The merge base carries no comments, so the ratio there is
zero and the gate is currently absolute: one comment fails it, and no amount of
accompanying code rescues it. That is the intended reading of a norm of none rather than
an accident of the arithmetic. It also means the first deliberate comment cannot be
merged without changing this decision, which is the point at which the question of whether
it belongs gets asked properly.

**Bundle size** is a ratchet recorded in `.size-limit.json` and enforced by size-limit.
Nothing measures `main` at review time: the recorded figure is whatever a reviewer last
accepted, and the gate holds the branch to it. It is lowered as the build improves, and it
rises only by editing the file, which is a reviewed line in a diff. The glob covers every
emitted script rather than an entry point, so deferring bytes into a chunk that loads
later does not move the number. Remaining headroom is reported, so a ratchet that has
drifted above the real size is visible.

size-limit signals a breach through its exit status while still printing its verdict, so
the report reads `passed` out of its JSON rather than looking at the status. That is why
it is the one subprocess here whose exit code is ignored.

The line counter is [cloc](https://github.com/AlDanial/cloc), pinned to a released version
and checked against its SHA-256 before use. scc and tokei were the alternatives for that
job, and both were rejected for the same reason: neither diffs. cloc classifies every
changed line as added, removed, modified or unchanged, and independently as code, comment
or blank. That pair of classifications is the report rather than an input to it. scc is
pinned the same way and used only for the branch count, which cloc does not produce.

Neither counter's JSON is byte-stable, and both were checked rather than assumed. Eight
consecutive cloc diffs of the same two commits produced eight different byte sequences and
one set of numbers, which is Perl's randomised hash ordering reaching the JSON output; a
plain cloc count of a tree, by contrast, is stable, so anyone checking only that would
conclude the wrong thing. Eight scc runs over the same tree likewise produced eight byte
sequences, one ordering of languages, and one identical map of file to branch count: there
it is the per-language file arrays that come back in whatever order the workers finished.

In both cases the numbers are stable and only the ordering is not. The report therefore
parses each counter's JSON, aggregates it, and renders in an order of its own, and
continuous integration renders the whole report twice and compares the two files byte for
byte, whatever verdict the gates reached.

scc has no equivalent of cloc's `--git`, so each side is measured by extracting that
commit with `git archive` into a temporary directory. That also keeps the measurement off
the working tree, which during a pull request run holds a merge commit rather than either
side of the comparison.

## Consequences

The gates exist before the code they judge, which is the only time a regression gate can
be introduced honestly.

A comment cannot be merged while the merge base has none. Both ways through are named in
the report itself when the gate fails, because a gate that fails without naming the remedy
is a wall: make the code say what the comment was going to, or change this decision.

Raising the bundle ratchet is a line in a diff that a reviewer sees, rather than a number
that quietly stops meaning anything.

cloc and scc are prerequisites for running the report locally, alongside gitleaks. None of
the three is an npm package, so none is installed by `pnpm install`.

The footprint report itself carries no threshold. It reports lines added, removed and
changed, in four buckets: product code from `apps/` and `packages/`, test code, build
tooling, and everything else, each split into code and comments. It reports the branch
count for the same buckets, on both sides of the comparison and as a change.

Two of those boundaries are deliberate. Source outside `apps/` and `packages/` is tooling
rather than product, because ADR 5 already draws that line and blurring it would overstate
what the application had grown by. And the total is over the first three buckets only,
because the fourth holds generated files: a lock file rewrite is real footprint and is
reported, but adding it to the total would drown the lines somebody actually wrote.
