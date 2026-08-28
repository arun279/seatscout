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
nothing here is this project's invention.

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

The counter is [cloc](https://github.com/AlDanial/cloc), pinned to a released version and
checked against its SHA-256 before use. scc and tokei were the alternatives, and both were
rejected for the same reason: neither diffs. cloc classifies every changed line as added,
removed, modified or unchanged, and independently as code, comment or blank. That pair of
classifications is the report rather than an input to it.

cloc's diff report is not byte-stable, though its plain count of a tree is. Eight
consecutive diffs of the same two commits produced eight different byte sequences and one
set of numbers, which is Perl's randomised hash ordering reaching the JSON output. The
report therefore parses the JSON and renders in an order of its own, and continuous
integration renders the report twice and compares the two files byte for byte, whatever
verdict the gates reached.

## Consequences

The gates exist before the code they judge, which is the only time a regression gate can
be introduced honestly.

A comment cannot be merged while the merge base has none, and the way through is to make
the code say what the comment was going to.

Raising the bundle ratchet is a line in a diff that a reviewer sees, rather than a number
that quietly stops meaning anything.

cloc is a prerequisite for running the report locally, alongside gitleaks. Neither is an
npm package, so neither is installed by `pnpm install`.

The footprint report itself carries no threshold. It reports lines added, removed and
changed, in four buckets: product code from `apps/` and `packages/`, test code, build
tooling, and everything else, each split into code and comments.

Two of those boundaries are deliberate. Source outside `apps/` and `packages/` is tooling
rather than product, because ADR 5 already draws that line and blurring it would overstate
what the application had grown by. And the total is over the first three buckets only,
because the fourth holds generated files: a lock file rewrite is real footprint and is
reported, but adding it to the total would drown the lines somebody actually wrote.
