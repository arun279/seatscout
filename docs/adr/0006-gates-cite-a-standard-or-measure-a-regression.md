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

There is a failure below all of that, and it is the one that actually happened here. A gate
can report a pass without having measured anything: an empty list every element of which
satisfies a predicate, a glob matching no file, a filter matching no test, a score of `NaN`
compared against a threshold, a tool signalling "nothing to weigh" and "over the limit"
through the same exit status. A verdict has to entail a measurement. Where a tool's own
output cannot say which of the two happened, the gate reads the shape of that output rather
than its status; where a subject can be empty, an empty subject fails.

A figure that gates nothing still has to earn its place, and the test is whether a reader
can act on it without weighing it. A count of lines added and removed passes: it is a
description of the change, and nobody has to decide anything about it. A total that has
risen by some amount, with no limit to compare it against, does not. It asks every
reviewer, on every run, to reach a private verdict on whether that amount matters, and
the verdicts stop being reached long before the figure stops being printed.

## Decision

Every gate either cites a published standard or compares the branch against its merge base
with `main`. The absolute figure is reported either way.

**Complexity** is measured twice, per function, each measure at a limit its own publisher
set, and both fail the build.

Understandability, by Biome's
[`noExcessiveCognitiveComplexity`](https://biomejs.dev/linter/rules/no-excessive-cognitive-complexity/)
at its documented default limit of 15. The rule and the limit are
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

This is the measure the body that publishes both enables by default. SonarSource ships a
cyclomatic complexity rule, S1541, defaulting to 10 in JavaScript and TypeScript, and leaves
it out of the default Sonar way profile; the cognitive complexity rule, S3776, is in that
profile, at 15 for the same languages. A SonarSource engineer gives the reason on their
community forum rather than in the rule's documentation: "only the rule using Cognitive
Complexity is enabled by default, as we believe it is best suited for the purpose of having
clean code." Biome's rule is the same measure at the same threshold, and Biome ships no
cyclomatic rule at all. That is why this is the measure that arrived first and for free, and
it settles which of the two a tool turns on by default. It does not settle whether the other
one should go unmeasured, and for seventy pull requests this decision read it as though it
did.

Keeping any complexity gate is nonetheless a choice against the grain, and worth naming as
one. Of the well-known JavaScript and TypeScript repositories whose lint configuration was
read for this decision, none enables a cyclomatic or a cognitive complexity rule, and
React's `.eslintrc.js` turns ESLint's off by name with `complexity: OFF`. That is a
reasonable position for a large codebase with many hands and a long history, where a limit
introduced late grandfathers whatever preceded it. It is the wrong position here for the
reason this decision opens with: the gate is in place before the code, so it costs nothing
to keep and cannot be honestly added later.

**Cyclomatic complexity is measured, per function, at NIST's limit of 10.** For the
project's first seventy pull requests it was not, and the reason given had two halves. One
half was right and is kept below, because it is why the figure that used to be printed had
to go. The other half was a misreading of the standard it cited, and correcting it is why
this gate now exists.

The half that holds: **the figure that was deleted was not cyclomatic complexity.** It came
from [scc](https://github.com/boyter/scc), which says of itself that it "does not build an
AST of the code as it only scans through it", counts branch and loop keywords instead, and
describes the result as "my own definition, but tries to be an approximation of cyclomatic
complexity", comparable only between files in the same language. And the aggregation removed
what was left: the report summed the figure per bucket, and above a single function is
exactly where the measure stops saying anything a line count does not already say.
SonarSource's cognitive complexity paper puts it flatly: "Cyclomatic Complexity is of little
use above the method level." Landman, Serebrenik, Bouwers and Vinju (*Journal of Software:
Evolution and Process* 28(7), 2016), defending the metric against the charge that it is
redundant with lines of code, found the correlation only moderate per method and stronger
once aggregated to file level, though that held for their Java corpus and not their C one.
None of that is an argument against measuring the metric properly, per function. It is an
argument against the thing that was there, and it stands.

**The half that does not hold: the mutation gate does not stand in for this limit, and NIST
says so in the sentence after the one that was quoted.** The argument made here was that
NIST is explicit that cyclomatic complexity "gives the number of tests", that its limit
therefore exists to bound testing effort, and that the mutation run bounds testing effort
directly. Section 2.5 goes on:

> There are two main facets of complexity to consider: the number of tests and everything
> else (reliability, maintainability, understandability, etc.). Cyclomatic complexity gives
> the number of tests [...] However, the pure number of tests, while important to measure
> and control, is not a major factor to consider when limiting complexity. [...] It is this
> correlation of complexity with reliability, maintainability, and understandability that
> primarily drives the process to limit complexity.

The facet the mutation gate covers is the facet NIST says is not what the limit is for. A
quotation was carried a clause too short and the conclusion drawn from it was the opposite
of the source's own.

**The number and its exception process.** NIST Special Publication 500-235 §2.5 records that
"the original limit of 10 as proposed by McCabe has significant supporting evidence", notes
that "limits as high as 15 have been used successfully as well" but that such limits "should
be reserved for projects that have several operational advantages over typical projects", and
sets the policy as: "For each module, either limit cyclomatic complexity to 10 [...] or
provide a written explanation of why the limit was exceeded." This workspace takes 10 and
writes no exception. ESLint's competing default of 20 is weaker ground: off unless switched
on, absent from `eslint:recommended`, and settled in a 2015 issue thread as a ceiling on the
obviously unreasonable.

**The variant is `classic`, because NIST refuses the other one.** Both live implementations
offer `classic` and `modified`, where `modified` charges a `switch` one point however many
cases it has. NIST rejects that form directly: it yields "a number of tests that cannot even
exercise each branch", and the document recounts a developer who "could take a module with
complexity 90 and reduce it to 'modified' complexity 10 simply by adding a ten-branch
multiway decision statement to it that did nothing". NIST does allow one exemption, for a
module that is a single multiway decision whose branches hold no complexity of their own. No
function here needed it, so it is recorded as available and not taken.

**What measures it, after the obvious answer stopped being available.** The standalone
packages are all dead: `ts-complex` last published in 2018 against TypeScript 2.8,
`typhonjs-escomplex` at 0.1.x since 2018, `escomplex` and `complexity-report` at a 2016 alpha
ever since. Token counters are not the measure, which is the first half of this section's own
argument: that rules out scc, and it rules out `lizard` for the same reason. This decision
used to say the live option was "running ESLint and typescript-eslint beside Biome for one
rule". That option is closed: `@typescript-eslint/parser` 8.69.0 refuses to load against the
`typescript` 7.0.2 this workspace pins, with "typescript-eslint does not support TS 7.0", so
buying it would mean installing a second TypeScript under an alias.

[oxlint](https://oxc.rs/docs/guide/usage/linter) implements ESLint's own rule as
`eslint/complexity`, with the same `max` and `variant` options and the same documented
meaning of `classic`, as a Rust binary that parses TypeScript itself and depends on no
TypeScript package. It runs as `pnpm complexity`, carries that one rule and every rule
category switched off, and adds two packages where ESLint with a parser added sixty. It is
the second linter in a workspace that was deliberately Biome-only, and the stated reason is
that Biome has no rule for this measure: `biome explain` answers "Unrecognized option" for
every spelling, and the published rule list's Complexity group has the cognitive rule and no
cyclomatic one.

**The two counters were compared rather than assumed equal**, because they are not. Against a
fixture, `eslint-plugin-sonarjs`'s S1541 charges nothing for a `catch` clause, a default
parameter or an optional chain, each of which is a predicate node in the control-flow graph
NIST's limit is defined over; ESLint's classic variant charges all three, and oxlint
reproduced ESLint's figures to the number on every function in this tree that exceeded 10.
Taking the counter that counts the graph is what pairing a McCabe limit with a tool requires,
and it is also the stricter of the two, so the choice is not the lenient one. The workspace
detail this predicts, and which is worth knowing before the first surprise: a `??` chain
defaulting eight options scores eight, because each default is a branch a test has to reach.

**The gate is an absolute rather than a ratchet, and that is forced.** A regression gate needs
a tool that measures new code separately, and none exists for this metric: SonarSource, who
originated new-code gating, publish no `new_complexity`, and the delta linters that do exist
gate lint findings rather than a complexity total. Which is fortunate, because a McCabe
aggregate would have charged for the remedy. Under McCabe's own definition each extracted
function is an unconnected component, so it adds one to the program's total; Shepperd calls
this "the bizarre result of increasing overall complexity as a program is divided into more,
presumably simpler, modules", and notes the total only falls where the extraction also removes
duplication. A program-level total gated on growth would go red for the very refactor an
over-complex function calls for. Per function, at an absolute, the metric behaves: extracting
lowers both numbers.

**Watched failing, watched silent, and the tree swept.** A planted function of cyclomatic 11
is refused by name and number; the same function at 10 passes in silence. Over an empty
subject the tool prints "No files found to lint" and exits 1, so it cannot pass without
measuring, which is why it needs no wrapper of its own. Run at `max: 1` to get the whole
distribution rather than only the violations, the tree held 404 functions scoring above 1, a
maximum of 15, and three functions over the limit: the fake upstream's `Fetch` closure at 15,
`verifying`, then in `verify.test.ts`, at 14, and `shapeOf` in `capture-corpus.mjs` at 14. All three
were extracted along a seam rather than exempted, and each extraction named something the code
had not: a `RecordedRequest` constructor, a search that runs before the verification under
test, and the split between a seat map's labelling scheme and the totals the upstream reported
about it.

One limit both measures share is worth stating here rather than discovering later. Each is
defined per function, as every published complexity rule is, so branching written at the top
level of a module is outside all of them. Nothing under `apps/` or `packages/` writes any. The scripts directly
under `tools/` used to, and that was the same shape as sitting outside the mutation gate's
scope: work that happens as a module loads is work nothing can call, so nothing can judge it.
Each of the three gates written here is now a package under `tools/<name>/src`, with its work
in functions a test calls and an entry point that only wires them together, which puts them
inside both the unit suite and the mutation gate.

**Each of those packages carries a planted red the unit suite runs on every commit.** A
fixture the gate must refuse sits beside one it must accept, so a gate that stops detecting
its own fixture fails the build instead of waiting to be watched by hand. The fixtures live
outside `src`, where they are neither product code nor mutated, and the reach check's planted
red builds a throwaway repository of its own and runs the entry point inside it, so it
depends on no checkout but its own.

One gate is outside all of that and it is worth naming rather than leaving to be found. The
claims gate is two modules directly under `tools/` rather than a package, so it has no
planted red, nothing in the unit suite judges it, and the mutation gate's glob does not reach
it, while it does gate a merge in `quality` and on pre-push. The rest of what sits directly under
`tools/` is the corpus capture and the modules it reads, the corpus indexer, the upstream
constant, the live suite's setup, the nightly alarm and the icon renderer, none of which
gates a merge.

**Lines per file** may not exceed 300, by Biome's
[`noExcessiveLinesPerFile`](https://biomejs.dev/linter/rules/no-excessive-lines-per-file/) at
its documented default, and it fails the build. It is the one gate here whose number is a
convention rather than a standard, and saying so is the point of writing it down.

ESLint's `max-lines`, whose default Biome's rule takes, is candid about it: "While there is
not an objective maximum number of lines considered acceptable in a file, most people would
agree it should not be in the thousands. Recommendations usually range from 100 to 500
lines." The provenance of the 300 is a vote in ESLint issue #6321, closing on a comment
asking for an explanation of the number that was never given. SonarSource's competing S104
defaults to 1000 over ncloc. So two publishers disagree by a factor of three, and one of them
says outright that there is no objective figure.

The empirical literature is worse than unhelpful; it points the other way. Basili and
Perricone (*CACM* 27(1), 1984) found errors per thousand lines falling monotonically with
module size, 16.0 at up to 50 lines against 6.4 above 200, and wrote "one surprising result
was that module size did not account for error proneness. In fact, it was quite the contrary
— the larger the module, the less error-prone it was." Hatton (*IEEE Software* 14(2), 1997)
gathered four such studies into a U-shaped defect density curve and put the optimum at 200 to
400 lines. Fenton and Neil (*IEEE TSE* 25(5), 1999) used exactly that "Goldilocks Conjecture"
to show what is wrong with the field and concluded it "lacks support". Hatton's band happens
to bracket 300; that is a coincidence and not a justification, since he measured Fortran and
Ada components against field defects rather than TypeScript files against readability.

So the number is taken on the same footing as the cognitive limit of 15: it is the documented
default of the tool this workspace already runs, it is not this project's invention, and
nothing better exists to move it to. What it is not is a measurement, and a reader should not
be left to infer otherwise from the company it keeps in this document.

One property of the counter is worth knowing before it surprises somebody: Biome counts a
multi-line token as one line, so a 342-line file whose body is a single template literal passes
at 300. That is a way past the gate for anyone who wants one, and it is the tool's own counting
rule rather than something configured here. It also means the honest figure for a file holding
a golden-output string is smaller than `wc -l` reports, which is why the three golden fixtures
in this repository sit comfortably under the limit.

The rule reaches JavaScript, TypeScript and CSS, which was measured rather than assumed with a
320-line file of each kind; it does not reach JSON or Markdown, which Biome does not lint.
Markdown is deliberately left outside it: no published tool sets a default length for prose,
and transplanting a source-file convention onto a document would be inventing a number. What
decides whether a document should be split is what it is for rather than how long it is. This
record is the longest in the directory and stays one record, because what it settles is a
single rule applied to every gate.

**Lines per function is measured and not gated**, and the evidence is worth keeping because it
is the sort that decays. At the default of 50 that ESLint and Biome share, this tree yields 33
findings and not one of them is a long procedure: 28 are `describe(...)` callbacks in test
files, from 55 lines to 669, while no `it(...)` body anywhere exceeds 50; four are closure
factories whose bodies are mostly named inner functions, which ESLint's own documentation
notes count toward their parent; and one is a 73-line function that is almost entirely a
returned array of markdown strings. Gating it would split a 39-test suite into fourteen files
of three tests and push named inner functions out into module scope with their state threaded
through parameters. The published range for the same metric spans 40 to 200, and its two
most-cited sources decline to set a limit at all: Google's C++ guide says "no hard limit is
placed on functions length", and the Linux kernel's 48 is a remark about one screenful. The
file limit above bounds the same thing honestly. The finding that would reverse this is a long
straight-line function body, and there is none.

**Where the tree stands under each of those three limits is printed on every pull request,
and printing is not a second gate.** The highest cyclomatic complexity, the highest
cognitive complexity and the longest file go in the footprint comment beside the limit each
one sits under. None of them gates there, because each already gates where it is measured,
in `quality` and on the pre-commit hook, and a second enforcement point for one number is a
second place for it to drift. What the figures are is headroom under a limit that bites:
a reader can act on "9 against 10" without weighing anything, which is the test this
decision sets for a figure that gates nothing.

The values are read by asking each linter for the same rule a second time at the lowest
threshold it takes and parsing its machine output, never by counting anything here.
`.oxlintrc.report.json` and `biome.report.json` sit beside the gating configurations and
differ from them in the threshold alone; the Biome one extends `biome.json`, so the file set
and the ignore rules are the same bytes rather than a second copy that can drift. Biome's
`json` reporter announces itself as experimental and subject to change in a patch release,
so a diagnostic whose number the report cannot read is a refusal by name and a rule that
reports nothing at all is a refusal too, rather than a peak taken over whatever survived.

Both Biome rules now carry their thresholds explicitly rather than relying on the documented
default. The numbers are unchanged and so is the verdict on this tree; what it buys is that
the comment reads the limit out of the file that gates, so it cannot print one the gate is
not using, and that a limit going missing is a refusal rather than a stale figure.

**The count of files within a tenth of the line limit is printed for a decision that is
already written down.** The 300 is the one number here that is a convention rather than a
standard, and it is raised on cost sustained across many files, never to make one file fit;
the first raise, if it comes, goes to 500, which is inside the range ESLint's own
documentation states. That decision needs to know how much of the tree is running close to
the limit rather than how one file is doing, so the count is the figure the decision takes
and it gates nothing.

**What counts as test code is written in four places, and they have to agree.** The
`*.test.ts` suffix was the whole definition in all four: the pathspec of ADR 1's claim about
modules that build a `Source`, the mutate glob, the footprint report's bucket classifier, and
the `exclude` list of every product TypeScript project. Splitting the oversized test files
produced a second shape of test code, a `*.fixtures.ts` module holding the fixtures more than
one piece needs, because a `*.test.ts` importing another runs its suites twice. Each of the four
now names that suffix too. Left alone, the same lines would have moved into the product bucket
of this report, into the mutation gate's subject, into ADR 1's count and into three packages'
emitted `dist/`, all as a side effect of a line limit and none of it decided by anyone. Nothing
binds the four lists together, so the next one will be found the same way this one's fourth
member was, by somebody reading a config.

**Comment load** is the number of comment lines in first-party source, and it may not
exceed the ratchet recorded in `.footprint.json`. Only files with a JavaScript, TypeScript
or CSS extension count, which keeps the version comments that pin action SHAs out of the
measurement.

It was a ratio until 2026-08-29, comments over code on the branch against the same ratio at
the merge base, and the ratio was the wrong form twice over. It permits unbounded absolute
growth: a hundred lines carrying ten comments becoming a thousand carrying a hundred holds
the density and adds ninety comments, which is neither downward pressure nor a number any
reviewer approved. And it passes over nothing when the merge base has no code, because the
inequality then reads `comments * 0 <= 0 * code`, which holds for every branch there is.
A count held to a committed number has neither property, and it is the form the bundle gate
beside it already takes: the figure is what a reviewer last accepted, it stands in a file,
and it rises only by a line in a diff.

The ratchet stands at zero, which is what the tree holds, so the gate is absolute today: one
comment fails it and no amount of accompanying code rescues it. That is the intended reading
of a norm of none. The first deliberate comment is a line in `.footprint.json` in the same
diff, where the question of whether it belongs gets asked by a reviewer looking at both.

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
it is the one subprocess here whose exit code is ignored. The status cannot say which of
two things happened, because size-limit exits non-zero both for a breach and for a glob
that matched no file. In that second case it prints `passed: true` at a size of zero and
omits `sizeLimit` entirely, since a check whose glob matched nothing has its limit cleared
before the verdict is printed. The report therefore reads the shape rather than the status,
and refuses a run that weighed no bundle or weighed one against no ratchet.
`@size-limit/file` compresses each matched file on its own and adds the results, so the
figure is a sum of per-file brotli rather than the brotli of everything concatenated.

**The journey** is measured on the built tree served by the deployment's own worker, in
Chromium, ten times over, and it is judged two ways. The three Core Web Vitals are held at
their 75th percentile to the thresholds Google publishes as good, 2.5 s for LCP, 200 ms for
INP and 0.1 for CLS, which is a standard rather than a figure chosen here. The moment the
first Seat Group is painted has no published threshold, so it is held to the merge base:
the job measures the base's own journey in a worktree and fails the branch when the head's
median is slower than the base's slowest, a margin drawn from the base's spread rather than
chosen. Under identical performance that verdict is wrong in under one run in a hundred,
measured by simulation over ten journeys a side. That simulation assumes the two sides are
drawn under the same conditions, so both are measured the same way: each side's ten journeys
run in a step of their own, outside the end-to-end suite. Measured inside the suite, the
branch's journey shares the runner with the rest of the suite while the merge base's has the
runner to itself, and the gate reads that difference in load as a difference in the branch,
by a margin that grows with every end-to-end test the branch adds. The absolute is reported
either way, a merge base with no journey is reported rather than passed over, and a journey
that renders no result fails, because a pass has to entail a measurement.

**Accessibility has a published standard, so it is gated against that one.**
`@axe-core/playwright` scans the shell and the results screen against WCAG 2.2 at levels A
and AA, which is the [W3C Recommendation](https://www.w3.org/TR/WCAG22/) rather than a bar
this project invented, and any violation fails `quality`. It was watched failing before it
was trusted, on a colour contrast of 1.91:1 against the 4.5:1 success criterion 1.4.3
requires. Every control's hit area is measured against the same document, its own box plus
the area the stylesheet gives inline controls, on the list and inside the open ledger, and
fails under 44 px. Biome lints the page for the half a static reader can compute and gets
there first: a missing or invalid `lang` fails before the browser is even installed. The two
overlap deliberately, and what is only axe's is contrast, computed roles, and anything a
script renders.

**Those scans are named so that they cannot be deleted quietly.** `tests/e2e` is outside the
unit runner's include and outside the mutation gate's scope, so nothing judges what is in it,
and for one revision the end-to-end run passed with no tests at all, which left a file
deletable with every gate green. So `pnpm test:e2e` lists the tests tagged `@accessibility`
before it runs anything and `pnpm test:journey` lists the ones tagged `@performance` before
it runs anything, and Playwright's own answer to a filter matching nothing is to exit
non-zero. Deleting one, or untagging it, fails the job. What is asked for is a name and not a
number: a floor on how many tests `tests/e2e` holds is a figure this decision would have to
justify, it would calcify whatever the suite held on the day it was written, and a count does
not protect a particular scan in any case.

**One question gets one gate.** The `dependencies` job scans the lockfile against the OSV
database and fails on any advisory. It once also ran `pnpm audit`, which since 2021 has been
a proxy in front of the same GitHub Advisory Database that OSV mirrors, so the two steps
asked one database the same question through two doors, and the job failed whenever the
weaker door did.

**A rule reported at a severity the linter exits zero on is no gate at all.** Biome's
recommended preset reports `useNodejsImportProtocol` as information, and `noOctalEscape` and
`noUnusedVariables` as warnings; all three are errors here. `biome.json` names them beside
the rules from outside the preset that this workspace asks for, so one file says everything
the linter gates on.

The mutation gate has the same shape one tool along, and takes the same answer. Stryker
computes its score as mutants detected over mutants valid, scores `NaN` when none was valid,
and breaks on `score < threshold`, which `NaN` never satisfies: a run that weighed no mutant
logs a score of `NaN`, calls it greater than or equal to a break threshold of 100, and exits
zero. `pnpm test:mutation` therefore runs the gate and then a guard over the JSON report it
wrote, which fails when no mutant in that report carries one of the four statuses the score
counts. That is not a floor on how many mutants a run must weigh, which would be a number
this project invented. It is the difference between a measurement and none, which is what a
pass already claims.

An earlier revision of this decision claimed that the non-zero exit alone made an empty
glob fail the gate. It did not, because the code beside it discarded the status and
`[].every()` is true, so the sentence asserted the opposite of what ran. A change to
`outDir`, to a file extension, or to where `apps/web` lives would have gone green over a
measurement that never happened, which is the failure this decision opens with arriving
through the gate meant to catch it.

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

A comment cannot be merged while the ratchet stands at zero. Both ways through are named in
the report itself when the gate fails, because a gate that fails without naming the remedy
is a wall: make the code say what the comment was going to, or raise the ratchet in the same
diff, where a reviewer sees it beside the comment it pays for.

Raising the bundle ratchet is a line in a diff that a reviewer sees, rather than a number
that quietly stops meaning anything.

The web bundle is a library build whose entries are the module the application publishes
and its service worker, with the page copied beside them rather than compiled into them.
The figure is all of the JavaScript the application contributes plus the slice of the
shared packages it reaches, compressed. It is defined as what the build publishes rather
than as what a page downloads, and the report says so rather than leaving it to be inferred.
Today the two coincide, since the page loads the module and the browser fetches the worker
beside it; the definition stays the build's output so that the figure keeps meaning the same
thing the day a build emits a chunk no page reaches. Nothing had to remember to re-set the
ratchet when the shell landed: the shell did not fit under 298 B, so the gate failed until
that diff raised it to 744 B.

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
lines added, removed and changed, in five buckets: product code from `apps/` and
`packages/`, test code, build tooling, prose, and data, each split into code and comments.

Three of those boundaries are deliberate. Source outside `apps/` and `packages/` is tooling
rather than product, because ADR 5 already draws that line and blurring it would overstate
what the application had grown by. The total is over the first three, because the last two
hold generated and written-down lines: a lock file rewrite is real footprint and is
reported, but adding it to the total would drown the lines somebody actually wrote. And
prose is its own bucket rather than part of the data one, because the comment count sat at
zero for the project's whole history while one document grew past 1,800 lines, three fifths
of the markdown in the repository, holding sections named for the domain rather than for how
to contribute. Explanation did not stop being written; it moved somewhere no gate
looked, and a comment gate that cannot see prose is measuring where the explaining is not.
It is reported and not gated, because the number a ratchet would hold it to depends on where
that prose ends up living.

The sorting is total, and that is a gate rather than a presentation choice. Anything matching
no rule used to fall into a catch-all, so a new extension or a moved directory took files out
of the measurement and the report said nothing. The classifier now names source, prose and a
listed set of data suffixes, and a path matching none of them fails the report and is printed
by name. The report also prints the file count per bucket on both sides and fails when a
bucket the merge base populated holds nothing on the branch, because a gate whose subject has
quietly emptied is reporting a verdict over a tree it no longer covers.
