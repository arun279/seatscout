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
sets it because no better one exists to move it to: the metric's independent validation
says outright that a meaningful threshold value has yet to be identified (Muñoz Barón,
Wyrich and Wagner, *An Empirical Validation of Cognitive Complexity as a Measure of Source
Code Understandability*, ESEM 2020). That study is also why the measure is trusted at all.
Pooling about 24,000 human judgements of 427 snippets across ten earlier studies, it
concluded that cognitive complexity is "the first validated and solely code-based metric
which is able to reflect at least some aspects of code understandability". That is a
careful claim rather than a strong one, and it is more than any other complexity metric can
show. Its diagnostic names the file, the function, its score, the limit and the remedy,
which is the whole test of whether a number belongs in a gate.

Choosing it over cyclomatic complexity is also the choice the body that publishes both has
made. SonarSource ships a cyclomatic complexity rule, S1541, at a threshold of 10, and
leaves it out of every default quality profile; the cognitive complexity rule, S3776, is in
the default Sonar way profile at a threshold of 15. Their stated reason is that cognitive
complexity is the preferred metric. Biome's rule is S3776 at that threshold, and Biome has
no cyclomatic rule to enable in the first place.

Keeping any complexity gate is nonetheless a choice against the grain, and worth naming as
one. TypeScript, VS Code, Next.js, Node, Vue, Svelte, Astro, React Router and Biome itself
enable no complexity rule of any kind, and React's configuration turns ESLint's off by
name. That is a reasonable position for a large codebase with many hands and a long
history, where a limit introduced late grandfathers whatever preceded it. It is the wrong
position here for the reason this decision opens with: the gate is in place before the
code, so it costs nothing to keep and cannot be honestly added later.

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
moderate per method but strong once aggregated to file level. The report already prints
the line counts.

And the one thing McCabe's measure does well is already measured here, directly. Its
critics and its defenders agree that it counts the test cases a function needs for full
coverage and disagree about everything else, from Shepperd (*Software Engineering
Journal*, 1988), who found it "no more than a proxy for, and in many cases is outperformed
by, lines of code", to SonarSource, whose reason for formulating cognitive complexity was
that cyclomatic complexity excels at testability and not at maintainability. This
workspace does not need a proxy for test adequacy. The nightly mutation run measures it,
and breaks below 100 per cent.

Measuring it properly instead was considered and is not available. No maintained tool
computes cyclomatic complexity from a TypeScript syntax tree: `ts-complex` last published
in 2018 against TypeScript 2.8, `typhonjs-escomplex` has been at 0.1.x since 2018, and
`escomplex` and `complexity-report` have been at a 2016 alpha ever since. ESLint's
`complexity` rule is the maintained one, and taking it would mean running ESLint and
typescript-eslint beside Biome for a single rule.

There would also be no threshold to take from it. ESLint's default of 20 is off unless
switched on, is absent from `eslint:recommended`, and was settled in a 2015 issue thread as
a ceiling on the obviously unreasonable rather than a measured limit. The older number it
was weighed against is no firmer: NIST Special Publication 500-235, the document that
established 10, says in the same breath that "limits as high as 15 have been used
successfully as well" and that "an organization can pick a complexity limit greater than
10, but only if it is sure it knows what it is doing", and its recommended policy is to
limit to 10 or write down why not. Every published figure is per function in any case, and
the report's was per bucket, so none of them was even the right shape.

The other door this decision usually leaves open is shut too. A regression gate needs a
tool that measures new code separately, and none exists for this metric: SonarSource, who
originated new-code gating, publish no `new_complexity`, and the delta linters that do
exist gate lint findings rather than a complexity total.

Which is fortunate, because an aggregate would have charged for the remedy. Under McCabe's
own definition each extracted function is an unconnected component, so it adds one to the
program's total; Shepperd calls this "the bizarre result of increasing overall complexity
as a program is divided into more, presumably simpler, modules", and notes the total only
falls where the extraction also removes duplication. So a bucket total gated on growth
would have gone red for exactly the extract-method that Biome's rule asks for by name. NIST
supplies the inverse in the same section that sets the limit, reducing a module from 90 to
10 by adding a ten-branch switch that does nothing. A measure that moves the wrong way
under the remedy and the right way under a decoration is not one to fail a build on.

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
later does not move the number. Remaining headroom is reported, so a ratchet that has
drifted above the real size is visible.

size-limit signals a breach through its exit status while still printing its verdict, so
the report reads `passed` out of its JSON rather than looking at the status. That is why
it is the one subprocess here whose exit code is ignored.

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

The footprint report itself carries no threshold. It reports lines added, removed and
changed, in four buckets: product code from `apps/` and `packages/`, test code, build
tooling, and everything else, each split into code and comments.

Two of those boundaries are deliberate. Source outside `apps/` and `packages/` is tooling
rather than product, because ADR 5 already draws that line and blurring it would overstate
what the application had grown by. And the total is over the first three buckets only,
because the fourth holds generated files: a lock file rewrite is real footprint and is
reported, but adding it to the total would drown the lines somebody actually wrote.
