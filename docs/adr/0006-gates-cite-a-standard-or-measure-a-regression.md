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
merge base. The norm is no comments at all: a comment is a signal that the code is
unclear. Expressing the gate as a ratio rather than a count is what makes it liveable,
because a comment that is genuinely needed can arrive with the code it explains. Only
files with a JavaScript or TypeScript extension count, which keeps the version comments
that pin action SHAs out of the measurement.

**Bundle size** is a ratchet recorded in `.size-limit.json` and enforced by size-limit.
The recorded figure is the size last accepted on `main`, so exceeding it is a regression
against `main`. It is lowered as the build improves, and it rises only by editing the
file, which is a reviewed line in a diff. The glob covers every emitted script rather than
an entry point, so deferring bytes into a chunk that loads later does not move the number.
Remaining headroom is reported, so a ratchet that has drifted above the real size is
visible.

The counter is [cloc](https://github.com/AlDanial/cloc), pinned to a released version and
checked against its SHA-256 before use. scc and tokei were the alternatives, and both were
rejected for the same reason: neither diffs. cloc classifies every changed line as added,
removed, modified or unchanged, and independently as code, comment or blank. That pair of
classifications is the report rather than an input to it.

cloc's JSON output is not byte-stable. Perl randomises hash ordering, so the object keys
come out in a different order on every run while the counts stay identical. The report
therefore parses the JSON and renders in an order of its own, and continuous integration
renders the report twice and compares the two files byte for byte.

## Consequences

The gates exist before the code they judge, which is the only time a regression gate can
be introduced honestly.

A change that adds a comment without adding the code it explains fails, and the way
through is to make the code say what the comment was going to.

Raising the bundle ratchet is a line in a diff that a reviewer sees, rather than a number
that quietly stops meaning anything.

cloc is a prerequisite for running the report locally, alongside gitleaks. Neither is an
npm package, so neither is installed by `pnpm install`.

The footprint report itself carries no threshold. It reports lines added, removed and
changed, split into product code, test code and comments, and it exists so that growth is
visible while it happens rather than discovered afterwards. Source outside `apps/` and
`packages/` is reported as tooling rather than as product, because ADR 5 already draws
that line and a report that blurred it would overstate what the application had grown by.
