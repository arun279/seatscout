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

A figure that gates nothing still has to earn its place, and the test is whether a reader
can act on it without weighing it. A count of lines added and removed passes: it is a
description of the change, and nobody has to decide anything about it. A total that has
risen by some amount, with no limit to compare it against, does not. It asks every
reviewer, on every run, to reach a private verdict on whether that amount matters, and
the verdicts stop being reached long before the figure stops being printed.

## Decision

Every gate either cites a published standard or compares the branch against its merge base
with `main`. The absolute figure is reported either way.

**Complexity** is measured once, by Biome's
[`noExcessiveCognitiveComplexity`](https://biomejs.dev/linter/rules/no-excessive-cognitive-complexity/)
at its documented default limit of 15, and it fails the build. The rule and the limit are
both published, so neither is this project's invention, and the limit stays where the tool
sets it because no better cognitive one exists to move it to: the metric's own validation
says outright that a meaningful threshold value has yet to be identified (Muñoz Barón,
Wyrich and Wagner, *An Empirical Validation of Cognitive Complexity as a Measure of Source
Code Understandability*, ESEM 2020). That study is also why the measure is trusted at all.
Pooling about 24,000 human judgements of 427 snippets across ten earlier studies, it
concluded that cognitive complexity is "the first validated and solely code-based metric
which is able to reflect at least some aspects of code understandability". That is a
careful claim rather than a strong one, and it is contested: Lavazza, Abualkishik, Liu and
Morasca (*Journal of Systems and Software* 197:111561, 2023), reanalysing the same data,
found lines of code and Halstead's measure performed marginally better. What survives is
narrower than "the best measure" and enough for this purpose: a per-function score with a
published limit, validated against human judgement rather than asserted. Its diagnostic
names the file, the function, its score, the limit and the remedy, which is the whole test
of whether a number belongs in a gate.

Choosing it over cyclomatic complexity is also the choice the body that publishes both has
made. SonarSource ships a cyclomatic complexity rule, S1541, defaulting to 10 in
JavaScript and TypeScript, and leaves it out of the default Sonar way profile; the
cognitive complexity rule, S3776, is in that profile, at 15 for the same languages. A
SonarSource engineer gives the reason on their community forum rather than in the rule's
documentation: "only the rule using Cognitive Complexity is enabled by default, as we
believe it is best suited for the purpose of having clean code." Biome's rule is the same
measure at the same threshold, and Biome ships no cyclomatic rule at all.

Keeping any complexity gate is nonetheless a choice against the grain, and worth naming as
one. Of the well-known JavaScript and TypeScript repositories whose lint configuration was
read for this decision, none enables a cyclomatic or a cognitive complexity rule, and
React's `.eslintrc.js` turns ESLint's off by name with `complexity: OFF`. That is a
reasonable position for a large codebase with many hands and a long history, where a limit
introduced late grandfathers whatever preceded it. It is the wrong position here for the
reason this decision opens with: the gate is in place before the code, so it costs nothing
to keep and cannot be honestly added later.

**Cyclomatic complexity is not measured.** An earlier revision of this decision reported
it per bucket and gated nothing on it, on the argument that complexity growth is the kind
a line count hides. None of that survived being checked.

The figure was not cyclomatic complexity. It came from [scc](https://github.com/boyter/scc),
which says of itself that it "does not build an AST of the code as it only scans through
it", counts branch and loop keywords instead, and describes the result as "my own
definition, but tries to be an approximation of cyclomatic complexity", comparable only
between files in the same language.

The aggregation removed what was left. The report summed the figure per bucket, and above
a single function is exactly where the measure stops saying anything a line count does not
already say. SonarSource's cognitive complexity paper puts it flatly: "Cyclomatic
Complexity is of little use above the method level." Landman, Serebrenik, Bouwers and
Vinju (*Journal of Software: Evolution and Process* 28(7), 2016), defending the metric
against the charge that it is redundant with lines of code, found the correlation only
moderate per method and stronger once aggregated to file level, though that held for their
Java corpus and not their C one. The report already prints the line counts.

And the one thing McCabe's measure does well is already measured here, directly. Its
critics and its defenders agree that it counts the test cases a function needs for full
coverage and disagree about everything else, from Shepperd (*Software Engineering
Journal*, 1988), who found it "no more than a proxy for, and in many cases is outperformed
by, lines of code", to SonarSource, whose reason for formulating cognitive complexity was
that cyclomatic complexity excels at testability and not at maintainability. This
workspace does not need a proxy for test adequacy. The mutation run measures it directly
and breaks below 100 per cent. It runs nightly rather than per pull request, so the honest
statement is that test adequacy is measured every day rather than at every merge, and a
branch can sit green for a few hours before it is checked.

Measuring it properly instead is possible, and costs a second analyser. The standalone
packages are all dead: `ts-complex` last published in 2018 against TypeScript 2.8,
`typhonjs-escomplex` at 0.1.x since 2018, `escomplex` and `complexity-report` at a 2016
alpha ever since. But `eslint-plugin-sonarjs` is maintained, and version 4.2.0 ships S1541
as `cyclomatic-complexity` with a default threshold of 10; ESLint's own `complexity` rule
is the other live option. Either means running ESLint and typescript-eslint beside Biome
for one rule.

That package is worth reading for what it does with the two rules rather than only for
what it contains. In its own metadata S1541 is `recommended: false` and S3776, cognitive
complexity, is `recommended: true`. So the same body chooses the same way three times over:
in the rule's default quality profile, in the linter plugin's recommended set, and in what
Biome inherited from it.

There is a threshold that could be taken, and it is fair to say so plainly. NIST Special
Publication 500-235 records that "the original limit of 10 as proposed by McCabe has
significant supporting evidence", and its recommended policy is to limit each module to 10
or write down why not. That is a published standard with an exception process, which is
exactly the shape this decision accepts elsewhere. ESLint's competing default of 20 is
weaker ground: off unless switched on, absent from `eslint:recommended`, and settled in a
2015 issue thread as a ceiling on the obviously unreasonable.

So the reason not to gate on 10 is not that the number is arbitrary. It is that the number
is sound for a purpose this workspace already serves another way. NIST is explicit that
cyclomatic complexity "gives the number of tests", and qualifies its own limit: an
organisation may exceed 10 "only if it is sure it knows what it is doing and is willing to
devote the additional testing effort required by more complex modules". The limit exists to
bound testing effort, and the mutation gate bounds that directly. Every published figure is
per function besides, and the report's was per bucket, so none of them was even the shape
the report needed.

The other door this decision usually leaves open is shut too. A regression gate needs a
tool that measures new code separately, and none exists for this metric: SonarSource, who
originated new-code gating, publish no `new_complexity`, and the delta linters that do
exist gate lint findings rather than a complexity total.

Which is fortunate, because a true McCabe aggregate would have charged for the remedy.
Under McCabe's own definition each extracted function is an unconnected component, so it
adds one to the program's total; Shepperd calls this "the bizarre result of increasing
overall complexity as a program is divided into more, presumably simpler, modules", and
notes the total only falls where the extraction also removes duplication. A program-level
total gated on growth would therefore go red for the very refactor an over-complex function
calls for. The figure this report actually carried had the opposite defect and was no
better for it: scc counts branch keywords per file, so extracting a function moves it not
at all, and it would have sat still through exactly the change worth seeing.

One limit of what survives is worth stating here rather than discovering later. Cognitive
complexity is defined per function, as ESLint's `complexity` rule and every other
published complexity rule are, so branching written at the top level of a module is
outside all of them. Nothing under `apps/` or `packages/` writes any. The scripts directly
under `tools/` do, and they sit outside the mutation gate's scope for the same underlying
reason: a script whose work happens as it loads is one nothing can call.

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
later does not move the number. The measured size is printed beside the ratchet, so a
ratchet that has drifted above the real size is visible from the two figures.

Their difference is not printed as a third. The ratchet is not a budget derived from a
device, a network or a page, so the room left under it is distance to a number this
project chose rather than a quantity about the world: no published standard sets a point
on that distance, and size-limit's own configuration has no notion of one. The regression
form is closed for the reason given above, that nothing measures `main` at review time, so
there is no earlier headroom to compare a branch's against. What is left is a figure a
reader cannot act on without weighing it, which is the test this decision sets for
anything it does not gate.

What the glob is pointed at has to be the output of the application's own bundler, and
that is the load-bearing half of this gate. The web application had none at first: its
build was `tsc`, which emits a file per source file and rewrites no import specifier,
so the directory being weighed held modules no browser could resolve, and the workspace
packages those modules imported were named in an import statement rather than present in
the measurement. The figure moved once in the twenty-three merges after this decision was
taken, and it moved because a second file appeared in the directory, not because anything
a browser would download had changed. A ratchet over a per-file transpile is a ratchet
over a stand-in, which is the failure named at the top of this decision arriving one step
earlier than the deferred chunk. The web application therefore builds with Vite, which
ADR 3 already chose, from the first commit at which there is something to measure rather
than from the first screen.

The pairing that keeps that honest is in the end-to-end suite rather than in the gate. It
serves the built output over HTTP with no import map and runs the store contract against
it in a real browser, so output a browser cannot resolve fails a test instead of passing a
weigh-in.

size-limit signals a breach through its exit status while still printing its verdict, so
the report reads `passed` out of its JSON rather than looking at the status. That is why
it is the one subprocess here whose exit code is ignored. It also exits non-zero when the
glob matches nothing, so a build that emits no script fails the gate rather than passing
it unmeasured. `@size-limit/file` compresses each matched file on its own and adds the
results, so the figure is a sum of per-file brotli rather than the brotli of everything
concatenated.

The bundler's determinism is load-bearing for the same reason the counters' is, and was
checked the same way rather than assumed: eight consecutive builds of one tree produced
eight byte-identical bundles and one size.

The line counter is [cloc](https://github.com/AlDanial/cloc), pinned to a released version
and checked against its SHA-256 before use. scc and tokei were the alternatives for that
job, and both were rejected for the same reason: neither diffs. cloc classifies every
changed line as added, removed, modified or unchanged, and independently as code, comment
or blank. That pair of classifications is the report rather than an input to it.

Its JSON is not byte-stable, which was checked rather than assumed. Eight consecutive cloc
diffs of the same two commits produced eight different byte sequences and one set of
numbers, which is Perl's randomised hash ordering reaching the JSON output; a plain cloc
count of a tree, by contrast, is stable, so anyone checking only that would conclude the
wrong thing.

The numbers are stable and only the ordering is not. The report therefore parses the
counter's JSON, aggregates it, and renders in an order of its own, and continuous
integration renders the whole report twice and compares the two files byte for byte,
whatever verdict the gates reached.

Each side is read through cloc's `--git`, which counts the commit rather than the working
tree. That matters during a pull request run, where the checkout holds a merge commit
rather than either side of the comparison.

## Consequences

The gates exist before the code they judge, which is the only time a regression gate can
be introduced honestly.

A comment cannot be merged while the merge base has none. Both ways through are named in
the report itself when the gate fails, because a gate that fails without naming the remedy
is a wall: make the code say what the comment was going to, or change this decision.

Raising the bundle ratchet is a line in a diff that a reviewer sees, rather than a number
that quietly stops meaning anything.

The web bundle is a library build whose entries are the module the application publishes
and its service worker, with the page copied beside them rather than compiled into them.
The figure is all of the JavaScript the application contributes plus the slice of the
shared packages it reaches, compressed. It is not a page weight, and the report says so
rather than leaving it to be inferred: the glob covers every script the build emits, while
a page loads the ones it reaches. Nothing had to remember to re-set the ratchet when the
shell landed: the shell did not fit under 298 B, so the gate failed until that diff raised
it to 704 B.

A complexity finding is acted on where it is raised, by the author, before the branch
leaves the machine: the same rule runs in the pre-commit hook over staged files. Nothing
about it reaches a reviewer as a figure to weigh.

What is given up is worth stating plainly rather than implying it was worthless. No
cyclomatic complexity figure is produced anywhere now, by any job or hook, so a file's or a
tree's branch count is no longer visible at all. What stands in its place is narrower and
firmer: understandability, per function, from a syntax tree, at a published limit; and test
adequacy, measured directly by the mutation gate rather than approximated by a branch
count. Neither answers "how much branching does this file hold", and nothing here does.

cloc is a prerequisite for running the report locally, alongside gitleaks. Neither is an
npm package, so neither is installed by `pnpm install`.

The line-count table carries no threshold, unlike the two sections beside it. It reports
lines added, removed and changed, in four buckets: product code from `apps/` and
`packages/`, test code, build tooling, and everything else, each split into code and
comments.

Two of those boundaries are deliberate. Source outside `apps/` and `packages/` is tooling
rather than product, because ADR 5 already draws that line and blurring it would overstate
what the application had grown by. And the total is over the first three buckets only,
because the fourth holds generated files: a lock file rewrite is real footprint and is
reported, but adding it to the total would drown the lines somebody actually wrote.
