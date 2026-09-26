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
of whether a number belongs in a gate. A planted function of 16 is refused by both of those
numbers and the same function at 15 passes, so the limit is watched biting rather than read
out of a configuration file.

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
function here needed it, so it is recorded as available and not taken. Which of the two is
configured is held to a planted switch rather than to the word in the file, because the two
disagree about exactly that shape: a switch of eleven cases scores 12 under `classic` and 2
under `modified`, so the planted one is refused by that number and could not be refused at
all under the variant NIST rejects.

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
is refused by name and number, and a planted switch of eleven cases by the number `classic`
gives it; the same function at 10 and the same switch at nine cases pass in silence. All
four are committed and run on every commit, and the verdict is read out of oxlint's JSON
report, which carries the count of files it read beside the diagnostics, so a silence over
nothing does not read as a pass. Over an empty
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
Each gate written here is a package under `tools/<name>/src`, with its work in functions a
test calls and an entry point that only wires them together, which puts them inside both the
unit suite and the mutation gate.

**A gate is watched refusing a planted violation wherever a fixture can commit one.** A
fixture the gate must refuse sits beside one it must accept, the unit suite runs the gate
itself over both on every commit, and what it reads is the tool's own diagnostic rather than
a non-zero exit status, which anything at all can produce. A gate that stops detecting its
own fixture fails the build instead of waiting to be watched by hand. Each gate written here
as a package under `tools/<name>/src` keeps its fixtures beside its source; the gates that
are somebody else's tool keep theirs under `tools/planted-red/planted`, with one test file
each for the cognitive limit, the cyclomatic limit and its variant, the file length limit,
the class rule, the written declaration option, the duplication window, the import cycle
rule and the bundle ratchets. That whole set answers in about seven seconds on two workers,
which is why it sits in `pnpm test:unit` beside everything else rather than in a job of its
own. The fixtures live outside `src`, where they are neither product code nor mutated.

Not every gate here has one, and naming what does not is better than leaving the sentence
above to be read as covering everything. The Grit plugin that refuses a collected response,
the two bans that keep Cache Storage behind one writer, the two React hook rules and the
undeclared import rule were each watched failing by hand on the day they landed. Every one
of them could carry a planted red instead, and none does yet.

**A planted red holds the gate. A pair holds this record's wording, and neither does the
other's job.** A fixture proves a rule fires. It cannot prove that this document still says
300 where the tool says 300, because a fixture has no opinion about prose, so each sentence
here that carries a number or a rule name is also paired with a search of the tree in
`tools/claims-in-prose.pairs.gates.mjs`. Seven of those pairs now sit beside a planted red as
well, and two sentences that carried neither a number nor a name were dropped along with the
grep that was their only witness, since the red beside them says everything they said. Twelve
of the rest are sentences no fixture can reach at all: the mutation gate's break threshold,
which nothing can be planted against short of a whole mutation run;
the bundle globs and the ratchet each is weighed against; the journey's and the gesture's own
constants and the command that judges them; the counter this decision picked; and the licence
flag the `dependencies` job carries, which already has a planted red of its own in that job
because osv-scanner is the job's tool rather than the workspace's.

One gate is outside all of that and it is worth naming rather than leaving to be found. The
claims gate is four modules directly under `tools/` rather than a package, so it has no
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

A planted file of 301 lines is refused by its own count against the limit, and the same file
with its last line taken off passes. The green half is the red half one line shorter rather
than a second fixture, so what the gate is watched answering to is the line and nothing
else about the file.

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

**What counts as test code is written in five places, and they have to agree.** The
`*.test.ts` suffix was the whole definition in the first four: the pathspec of ADR 1's claim
about modules that build a `Source`, the mutate glob, the footprint report's bucket classifier,
and the `exclude` list of every product TypeScript project. Splitting the oversized test files
produced a second shape of test code, a `*.fixtures.ts` module holding the fixtures more than
one piece needs, because a `*.test.ts` importing another runs its suites twice. Each of them
now names that suffix too, and the duplication gate's ignore list in `.jscpd.json` is the
fifth, written when that gate arrived. Left alone, the same lines would have moved into the
product bucket of this report, into the mutation gate's subject, into ADR 1's count and into
three packages' emitted `dist/`, all as a side effect of a line limit and none of it decided
by anyone. Nothing binds the five lists together, so the next one will be found the same way
the fourth was, by somebody reading a config.

**TypeScript is set to every strictness it offers**, and the five options it does not switch on under
`strict` are on in `tsconfig.base.json`: `exactOptionalPropertyTypes`, `noImplicitOverride`,
`noFallthroughCasesInSwitch`, `noPropertyAccessFromIndexSignature` and `isolatedDeclarations`. Each is
binary and published, so none of them is a number this project chose. What they cost was paid once
rather than deferred: turning them on surfaced 58 index-signature reads written as property access, 11
optional properties assigned a value that could be undefined, and 228 exports whose type a declaration
emitter cannot write down. `noImplicitOverride` and `noFallthroughCasesInSwitch` surfaced nothing,
which is a reading and not a reason to leave them off. Every one is answered in the code. None is
suppressed, because the two ways to suppress one are a comment and a type assertion, and both already
fail the build.

The strictest of the five is watched biting from the file the whole workspace extends. A planted
project that extends `tsconfig.base.json` and holds one export whose return type is left to be
inferred is refused with TS9007, which names the option, and writes no declaration; the same export
with its type written compiles and leaves the declaration file behind, so the green half is a
measurement and not a silence.

One property of `tsc --build` is worth knowing before it surprises somebody. Under `--noEmit`
it skips the declaration transform, and every `isolatedDeclarations` diagnostic comes out of
that transform, so a tree whose build information is already up to date can pass
`pnpm typecheck` and fail `pnpm build` on the same files. A cold checkout reports them from
either, which is what continuous integration runs; `tsc --build --force` is how to see them
locally.

`noPropertyAccessFromIndexSignature` and Biome's `useLiteralKeys` ask for the opposite thing about the
same expression. The compiler wants a key that comes from an index signature read through brackets;
the lint rule wants a bracketed literal key written back as a property access. Biome cannot tell a
declared property from an index-signature one and the compiler can, so the rule is off and the option
is on. That is the only rule turned off for the whole workspace out of Biome's recommended preset, and
this is the reason it is off. The two `a11y` rules ADR 14 turns off are an override over one file.

`isolatedDeclarations` reaches every project that emits, and reaches the ones that do not as well.
`skipLibCheck` is set for `tools/footprint` alone, because `mutation-testing-metrics` 3.8.4 ships
declarations that are inconsistent with themselves under `exactOptionalPropertyTypes`: its
`MutantModel` declares `coveredBy?: string[]` and implements a `MutantResult` that declares
`coveredBy: string[]`. That is a third party's declaration file rather than this tree's code, there is
nothing here to fix, and the option is the one TypeScript documents for it. `tests/e2e` already set it.

**Imports may not form a cycle**, by Biome's
[`noImportCycles`](https://biomejs.dev/linter/rules/no-import-cycles/), whose documentation gives its
source as ESLint's `import/no-cycle`. It is outside the recommended preset and reported at warning
when it is switched on, which is no gate at all by the rule below, so `biome.json` names it at error.
It belongs to Biome's `project` domain, so switching it on switches on Biome's scanner, and what that
costs was measured rather than assumed before it joined the hook: over this tree `pnpm lint` runs in
416 to 568 ms with the rule and 237 to 383 ms without it. The tree holds no cycle, so nothing had to be
broken to turn it on. A planted pair of modules importing each other is committed under
`tools/planted-red/planted`, and a test copies it into a git-ignored directory inside the project root
and runs Biome over it, because the rule reads the module graph and only resolves an import inside the
root it scanned. The pair is refused twice over, each import named with the path that closes the loop,
and a planted pair that imports one way passes. `ignoreTypes` stays at the default the rule documents
as enabled, which cuts a cycle only where the import is written `import type`; `verbatimModuleSyntax`
is on here, so an inline
`import { type X }` is not cut and is not ignored.

**Duplicated code** may not exceed 3 percent of the lines it is measured over, by
[jscpd](https://github.com/kucherenko/jscpd) at the threshold SonarSource publish as one of the four
conditions of the Sonar way quality gate: "Duplication in the new code is less than or equal to 3.0%".
The window the percentage is measured over is theirs too. For a language other than Java SonarSource
require "at least 100 successive and duplicated tokens" spread over "10 lines of code for other
languages", which is `minTokens` 100 and `minLines` 10 in `.jscpd.json`. Sonar hold that percentage
against new code and this gate holds it against all of it, which is the stricter of the two readings
and the only one a checkout can reach alone, since nothing measures `main` on a pre-push hook.

The subject is `{apps,packages,tools}/*/src` less the test suffixes, which makes `.jscpd.json` the
fifth place the definition of test code is written down. The tree reads 0.00 percent over 94 sources
and 8,767 lines today, so nothing is exempted, and the one pair of files that shared a shape was made
one file rather than exempted: two guard tools differing in a report path and a verdict are now one
tool parameterised by both. Neither copy was long enough to reach `minLines` 10 in the same window, so
the gate never saw them; a reviewer did.

jscpd's exit status cannot say which of two things happened. It exits zero for duplication inside the
threshold, and it exits zero for a run whose paths matched no file at all, a mistyped path included.
`pnpm duplication` therefore runs the gate and then a guard over the JSON report it wrote, which fails
when that report records no source read. It is the same guard the mutation run is judged by, told which
run to read: `tools/no-empty-run` holds the report path, the count that decides whether the run
measured anything, and the refusal for each of the two, and it is here for the reason this decision
opens with.

**Watched failing, watched silent.** A planted pair of modules whose shared run jscpd measures at 136
tokens is refused by percentage against the threshold, which the message names; two planted pairs just
outside the window pass, one a line short of it at 121 tokens and the other well inside the line floor
at 92 tokens, and the report records all four sources read. Neither of those two passes by sharing
nothing, which is shown rather than asserted: widening the window by one line and ten tokens makes
clones of both. So the window is watched at its own edges rather than read out of `.jscpd.json`. One
property of the report is worth knowing before it surprises somebody: the line count it prints for a
clone is one more than the span it holds to `minLines`, so the pair it reports at ten lines is the pair
that fell a line short of a floor of 10. A report recording no source read is refused by the guard; a
report the run never wrote is refused too.

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

Every kind of file the built directory serves is weighed, each against a ratchet of its own: the
scripts the bundler emits, the stylesheets beside them, the three woff2 faces the page preloads, and
the icons the page and the manifest name. A page costs a reader everything it fetches, so gating one
kind and leaving another unbounded would let bytes move from the weighed kind to the free one, which
is the deferred chunk under another name. The stylesheets are imports of the modules that draw with
them, so the bundler emits them as it emits the scripts, and `apps/web/dist/**/*.css` weighs what the
deployment serves rather than the sources it was built from. The fonts and the icons outweigh the
scripts and the stylesheets together, which is why they are weighed rather than left out: 118,924 B
and 134,269 B. Each glob is pointed at `apps/web/dist` rather than at `apps/web/public`, because the
copy is what the deployment serves. The icon glob covers the `.png`, the `.ico` and the `.svg` the
directory holds rather than the three raster sizes alone, for the same reason the stylesheet glob
covers every sheet: an icon that is not weighed is somewhere bytes can go. Each of the two new
ratchets was watched failing: lowered by a single byte, `size-limit` names the kind, the ratchet and
the byte it went over, and exits 1.

A ratchet a glob no longer reaches is worse than no ratchet, because it reads 0 B and passes. Two
fixture `size-limit` configurations are committed beside a planted file: over the planted file the
ratchet is refused by name, by ratchet and by the byte it went over, and over globs that reach nothing
`size-limit` reports 0 B for the font kind and 0 B for the icon kind, holds neither to a ratchet, and
passes each. The report refuses that reading rather than printing it: every entry must have weighed at
least one file and must have been held to a number, and a list where any entry fails either test
throws instead of becoming a verdict.

Their difference is not printed as a third. The ratchet is not a budget derived from a
device, a network or a page, so the room left under it is distance to a number this
project chose rather than a quantity about the world: no published standard sets a point
on that distance, and size-limit's own configuration has no notion of one. The regression
form is closed for the reason given above, that nothing measures `main` at review time, so
there is no earlier headroom to compare a branch's against. What is left is a figure a
reader cannot act on without weighing it, which is the test this decision sets for
anything it does not gate.

What a glob is pointed at has to be what the deployment serves rather than a stand-in for
it, and for the scripts that means the output of the application's own bundler. That is
the load-bearing half of this gate. The web application had none at first: its
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

**A gesture in the room** is measured the same way and for the same reason.
`tests/e2e/auditorium.spec.ts` opens the 304-seat Auditorium at a phone's size under a
four-times-slower CPU, pinches, wheels and drags it, and holds the 75th percentile of the
frame intervals to one frame of the display's own idle cadence, measured first on the same
page under the same throttle. The unit is the display's own frame and the percentile is the
one Core Web Vitals are defined at, which is the convention the journey above already
reports, so neither is a figure chosen here. It is a percentile because the gate's first
shape, every interval inside one frame, went red twice on a single 33.3 ms interval out of
forty-five, on machines that were also driving a second browser: one dropped frame in
forty-five is the runner and not the room, and a gate with no tolerance for a host's own
noise reports the host. Forty milliseconds of blocking added to the pointer handler takes
the percentile to two frames and the gate refuses it, watched, which is the shape of the
defect it exists for. The annotation carries the worst interval and the count of dropped
frames beside the percentile, so the tail is reported rather than hidden, and two counts
beside it say only that the gesture produced something, so a run cannot pass over nothing.

**The dropped frames in the room are a ratchet now rather than an absolute.** The gesture spec used to
hold the count of intervals longer than one idle frame to zero, and that absolute went red once on the
runner, on one interval out of forty-five, which is the host and not the room. The gesture is made ten
times over now, each on a freshly opened room so pan and zoom start where they started the first time,
and the count of dropped frames per gesture is written down beside the journeys and held to the merge
base by `tools/journey`: the head's median against the base's worst. The absolute is still reported,
per gesture, in the test's own annotation and in the command's report. The 75th percentile of the
frame intervals stays an absolute against the display's own idle cadence, because that is a published
unit rather than a chosen one and it is not what flaked.

**The journey** is measured on the built tree served by the deployment's own worker, in
Chromium, ten times over, on the device stand-in Lighthouse publishes rather than on the
runner as it comes: its mobile screen emulation, 412 by 823 CSS pixels at a device pixel
ratio of 1.75 under the Moto G Power user agent, and its Slow 4G network profile, 150 ms of
round-trip latency with 1.6 Mbps down and 750 Kbps up, applied through CDP's
`Network.emulateNetworkConditions`. Those are Lighthouse's own constants rather than figures
chosen here, and they are why the vitals are worth measuring at all: unthrottled, the
largest paint on this journey measured 56 ms against a 2.5 s threshold, which is a figure no
reader can act on. It is judged three ways. The three Core Web Vitals are held at their 75th
percentile to the thresholds Google publishes as good, 2.5 s for LCP, 200 ms for INP and 0.1
for CLS, which is a standard rather than a figure chosen here. That judgement is
`tools/journey`'s and not the spec's, so the percentile and the three comparisons sit inside
the mutation gate, with planted samples the command must refuse beside ones it must accept,
and a gate that stops detecting its own red fails the build; the spec measures, refuses a
journey that measured nothing on any axis, and leaves the verdict to the command. The moment
the first Seat Group is painted has no published threshold, so it is held to the merge base:
the job measures the base's own journey in a worktree and fails the branch when the head's
median is slower than the base's slowest, a margin drawn from the base's spread rather than
chosen. Under identical performance that verdict is wrong in under one run in a hundred,
measured by simulation over ten journeys a side. That simulation assumes the two sides are
drawn under the same conditions, so both are measured the same way: each side's ten journeys
run in a step of their own, outside the end-to-end suite. Measured inside the suite, the
branch's journey shares the runner with the rest of the suite while the merge base's has the
runner to itself, and the gate reads that difference in load as a difference in the branch,
by a margin that grows with every end-to-end test the branch adds. That assumption is
checked rather than trusted: every journey writes down the emulation it ran under, built
from the settings it applied rather than named by hand, and the ratchet holds one side to
the other only where the two agree. A branch that changes the stand-in is reported and not
held to a base measured another way, which is what this change itself needed. The absolute
is reported either way, a merge base with no journey is reported rather than passed over, a
head that wrote down no conditions or whose journeys disagree fails rather than passing on a
comparison it never made, and a journey that renders no result fails, because a pass has to
entail a measurement. The page's JS heap is read through CDP after a forced collection at
that same instant and reported beside the moment with the same statistic, gated by neither
threshold nor ratchet, because no publisher offers a byte budget and the projects that gate
memory gate a leak invariant rather than a magnitude.

**What the main thread was busy with is recorded on every journey and held to the merge base.**
Each of the ten journeys installs a `PerformanceObserver` for `longtask` with `buffered: true` before
the page's own scripts run, counts the entries, and sums each entry's duration in excess of 50 ms.
Both halves of that are the publishers'. The W3C Long Tasks API defines a long task as one "whose
duration exceeds 50ms" and reports nothing shorter; web.dev define total blocking time as the sum of
"its duration in excess of 50 milliseconds" over the long tasks after the first paint. What is
recorded here is that sum over the whole journey rather than over web.dev's window, because the
journey has no Time to Interactive to close the window at, and the record says so rather than calling
it Lighthouse's metric.

The figure is ratcheted to the merge base in the same head-median-against-base-worst form the moment
above takes, under the same conditions check, for the same reason: no publisher sets a blocking budget
for a runner. web.dev's 200 ms, which they publish as good "when tested on average mobile hardware",
is printed beside it and gates nothing, because this runner applies no CPU multiplier and the section
below says why it will not.

**Watched rising, and watched at rest.** Unthrottled, ten journeys on this machine run no task over
50 ms at all, so the reading is zero and the ratchet holds zero. A zero is a measurement and not the
absence of one, and it was shown to be: one 120 ms busy wait added to the page takes every journey to
one long task and 82 ms of blocking, and the ratchet then refuses the head by name against a merge
base that blocked for none, while the moment beside it stays green. The reading depends on the host,
which is why it is a ratchet and not a threshold.

**Lighthouse's fourth stand-in, the 4x CPU multiplier, is measured and deliberately not
applied.** Lighthouse documents that default as calibrated for a high-end desktop host and
tells a weaker machine to lower it, so the multiplier scales the host rather than the branch
and a fixed one decides the verdict by whose machine ran it. Lowering it instead would mean
choosing a number no one publishes, which is what this record refuses everywhere else, so it
is left off and the multiplier is what the gate is deliberately thrown by rather than what
it runs under: the shipped journey, run with the multiplier at 6, a figure inside
Lighthouse's own published calibration range, trips the gate.

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

**Every screen the end-to-end suite reaches is scanned by axe.** Two were reached without one: the
results screen offline, where the card offers no hand-off and the reason stands over the list, and the
results screen holding showtimes the Source never answered for, where the coverage strip offers a
retry. Both are scanned against WCAG 2.2 at A and AA now and measured for the 44 px target with the
rest of them. The Ask sheet with its seat controls and the coverage ledger already had scans, in
`on-device.spec.ts` and `journey.spec.ts`.

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

**The service worker's precache list is the page's own list, by set equality.** `cache.ts` names what
the worker puts in the shell cache and `index.html` names what the page fetches to draw itself, and
until now those were three copies of one list, in the worker, in its unit test and in the end-to-end
spec, with nothing holding any of them to the page. The end-to-end spec reads
`apps/web/public/index.html` now instead of restating it: the page itself, the module its inline
script imports, and every `<link>` it carries, whatever the `rel`. That set is held equal to what the
running service worker actually put in the cache, in a real browser against the built tree, so a
stylesheet the page links and the worker does not hold fails, and so does a path the worker holds that
the page never loads. Naming the kinds of link to take in was the earlier shape and it read four of
them, which passed over the `apple-touch-icon` the page links and the worker does not hold. Every link
counts now, and the one exclusion is written down as an exclusion: the touch icon is fetched by the
platform when the page is installed rather than by the page to draw itself, which is what the
comparison is about. A test plants a linked stylesheet the worker cannot hold and reads it back out of
the derived set, so the derivation is shown to take in a new link rather than assumed to. The unit
test beside it keeps its own written list, because that one is a golden assertion the mutation gate
judges and this one is a comparison between two live things. The reader throws rather than returning a
short list when the page links nothing at all or when a link carries no path it can read, because a
regular expression that had stopped matching would otherwise make the comparison vacuous, which is the
failure this decision opens with arriving inside a test.

**One question gets one gate.** The `dependencies` job scans the lockfile against the OSV
database and fails on any advisory. It once also ran `pnpm audit`, which since 2021 has been
a proxy in front of the same GitHub Advisory Database that OSV mirrors, so the two steps
asked one database the same question through two doors, and the job failed whenever the
weaker door did.

**Every dependency's licence is held to a list**, by `osv-scanner --licenses` in the `dependencies` job
that already asks the OSV database about advisories. The list is not a judgement about which licences
are acceptable in the abstract, which would be a line this project drew. It is the set of SPDX
identifiers the lockfile resolves to today, so the gate takes the regression form: a release that
changes a licence, and a new dependency that brings a licence family the tree has not carried, both
fail and get decided in a diff. Fifteen identifiers satisfy every expression 1,011 packages carry,
`AND` needing both sides and `OR` needing one. A licence osv-scanner cannot determine is reported as
`UNKNOWN`, and `UNKNOWN` is an identifier like any other here: it is not on the list, so it fails
rather than passing, which is the whole reason the list is an allowlist and not a denylist.

**Watched failing, watched silent.** The shipped list passes over the lockfile. Narrowed to the ten
permissive identifiers alone, the same scan exits 1 and names all thirty-one violators by package and
version. The `UNKNOWN` case is the one nothing in the tree exercises, so it is planted and run in the
job rather than watched by hand: `tools/planted-red/planted/licences` holds an osv-scanner
configuration overriding `typescript` 7.0.2's licence to `UNKNOWN`, and the `dependencies` job scans
the lockfile a second time with that configuration and the same allowlist, expecting the scan to fail.
A step after it fails the job when that scan passed. The file is not named `osv-scanner.toml`, so the
shipped scan cannot pick it up as a configuration of its own.

**The Expo SDK is asked about its own dependencies by the tool that ships with it.** Nothing written
here knows which versions the installed SDK was built against, and nothing here should: Expo
publishes that table and `expo install --check` reads it, naming every installed package whose
version the SDK does not expect. [expo-doctor](https://docs.expo.dev/develop/tools/) runs the same
check as one of twenty-one, which between them read the app config against its schema, the lock
file, the Metro configuration, duplicate and overridden dependencies, the peer dependencies the
native modules require, and the packages React Native Directory knows about. Both run in `quality`.
The first run failed one check of the twenty-one: `expo`, `expo-constants`, `expo-linking` and
`expo-router` were each a few patch releases below what the installed SDK expects. Those four are
moved to the versions it named. Expo documents `expo.install.exclude` as
the way to hold a package back from that check, and `apps/native/package.json` carries no such
list, because a package in it is a package the SDK is no longer asked about. The check this
workspace expected to fight, the one that refuses an override breaking a critical dependency
chain, passes over all seven overrides in `pnpm-workspace.yaml`.

Neither is on a hook, and the reason is not only what they cost. Measured over this workspace,
`expo install --check` answers in 1.7 seconds and `expo-doctor` takes 35, so the first is cheap
enough for a push and the second is not. Both read a table Expo publishes rather than a file in the
checkout, and run offline the first says outright that its validation is unreliable. A check whose
verdict depends on reaching a network is not one a push should wait on.

**Watched failing, watched silent.** `expo-constants` put back to the patch release it was on is
refused by both: `expo install --check` names the package and the range the SDK expects and exits
1, and `expo-doctor` fails two of the twenty-one, the version match and the duplicate native module
the mismatch creates. Moved forward again, both pass.

**One version of every shared dependency, across every manifest and the override file**, by
[syncpack](https://syncpack.dev), whose default policy is a single highest-semver group over every
dependency it finds. [manypkg](https://github.com/Thinkmill/manypkg) states the same rule in its
`EXTERNAL_MISMATCH` check. One difference decides it here. syncpack's `pnpmOverrides` dependency
type reads `overrides` from `pnpm-workspace.yaml`, which is where React is pinned; manypkg reads
`package.json` files alone. The pin and the two manifests that name `react` are therefore three
instances of one dependency under one policy, so a pin that drifts from the apps it exists for is
refused rather than noticed. The second difference is what each offers a dependency that has to sit
apart, which is what Expo's floors would one day ask for. syncpack gives it a version group with a
policy of its own. manypkg's documented answer is to write a specifier semver cannot parse, which
takes that package out of the gate instead.

syncpack is a compiled binary and answers over this workspace in 0.9 seconds, measured rather than
assumed, so it joins `push-checks` as `pnpm versions` as well as running in `quality`. It carries no
configuration file. The default group is already the policy this workspace wants, and a file
restating it would be a second place for that policy to drift.

pnpm's own catalogs are the other answer to this question and are not taken here. A catalog removes
the drift by construction rather than refusing it afterwards, which is the stronger shape. It does
not cover the ground this gate has to: the `overrides` block that pins React is not a catalog entry,
and nothing stops a manifest writing a literal version where a `catalog:` reference belongs.
syncpack is what would hold a workspace to its catalogs, by the `Catalog` policy its version groups
carry, so moving to them is a change that would sit behind this gate rather than in place of it.

**Watched failing, watched silent.** `react` raised to 19.2.4 in `pnpm-workspace.yaml` alone is
refused by name, with all three of its instances printed and the two that disagree marked; put
back, the same command reports no issue.

**A rule reported at a severity the linter exits zero on is no gate at all.** Biome's
recommended preset reports `useNodejsImportProtocol` as information, and `noOctalEscape` and
`noUnusedVariables` as warnings; all three are errors here. `biome.json` names them beside
the rules from outside the preset that this workspace asks for, so one file says everything
the linter gates on.

**React's two hook rules are named rather than left to detection.** Biome ships
[`useExhaustiveDependencies`](https://biomejs.dev/linter/rules/use-exhaustive-dependencies/) for
`react-hooks/exhaustive-deps` and
[`useHookAtTopLevel`](https://biomejs.dev/linter/rules/use-hook-at-top-level/) for
`react-hooks/rules-of-hooks`. Each rule page records the rule as recommended and as belonging to
Biome's `react` domain. A domain is read off the nearest manifest rather than written down, so
whether either rule reached `apps/native` at all was a question about detection rather than about
what this workspace had asked for. `biome.json` names both at error, which answers it either way
and is the same move the paragraph above makes for three other rules. Neither rule has anything to
say about the tree as it stands, which is a reading and not a reason to leave them unnamed.

**Watched failing, watched silent.** A `useEffect` planted in `apps/native/src/screen.tsx`, reading
the area it does not list, is refused by name with the dependency it missed and the line that uses
it. The same hook moved inside an `if` is refused as called conditionally. Taken out again, the
file passes in silence, which is what the whole tree does today.

**A screen's render cost is held to the merge base, and the runner says whether it may hold it.**
[Reassure](https://github.com/callstack/reassure) renders each screen's Testing Library scenario
repeatedly, on the base and on the head, and reports a statistically significant change rather than
a threshold anyone here chose. Callstack publish the two figures the `performance` job reads: a
runner whose repeated measurement of the same code varies by less than 5 per cent is steady enough
to gate on, and one at 10 per cent or more is not usable for comparison at all. So the job measures
the same code twice first, takes the widest change that run reports, and gates on a significant
regression only below 5 per cent; at or above it the job reports the comparison and says it did not
gate. `reassure check-stability` is that run's own name upstream, but its command handler hands its
own name to the test runner as a path pattern, so the job spells out what the handler does, a
baseline measurement and a comparison over the same commit.

**Watched failing, watched silent.** The first run on the pull request that added the job left no
reading at all, because the failure was piped into `tee` and lost, and the step that reads the
figure then took its own no-reading branch and passed. Both were corrected together: the reading is
taken under `pipefail`, and a missing reading now fails the job. The one absence that reports rather
than fails is a merge base with no measurement to compare against, which the step that measures the
base records for the step that judges. With the reading taken, the same runner reads 3.9 per cent
and the job gates.

**The app is walked end to end on an emulator, and the walk gates.** The `device` job builds a
release of the app for Android, with the Source answered in the build from the corpus, and Maestro
walks it from the Ask sheet through the ranked Seat Groups and the hand-off to the Room
(`apps/native/e2e/journey.yaml`). It leaves every level it visits twice, and after each it asserts the
screen beneath is back. First by gesture: a drag down on a sheet, which the app's own sheet answers,
and on iOS the edge swipe on a pushed screen and the drag down on the Ask sheet. On Android the edge
swipe on the full-screen Ask dialog and the Room is recognised by the system, not the app, which
turns it into the same back event the back key sends; injected edge swipes are not recognised on
the runner's emulator even with gesture navigation on (run 36223227514 swiped from the edge of
Settings and opened a subpage instead), so the walk sends that back event itself. Then by the way
back a person presses: the Ask sheet's own close control, and the Android back key. A step that finds nothing fails the job, and `footprint`, which is
required, needs it. The corpus stands in through Metro: `SEATSCOUT_UPSTREAM=corpus` swaps
`src/host/upstream.ts` for `e2e/upstream.ts`, which answers from the same `fakeUpstream` the browser
suite uses, so the bundle a phone runs never carries the corpus. Any other value is refused, and
`app.config.ts` turns updates off in such a build so a published update cannot replace the stand-in.
It is Android on an ubuntu runner rather than iOS on a macOS one because the only maintained
open-source frame-rate reader, [Flashlight](https://github.com/bamlab/flashlight), reads Android
only, so one build serves both the walk and the reading, and published prior art for an Expo app on
a macOS runner puts one run at 15 to 25 minutes (the workflow comment in
[johntips/react-native-infinite-material-tab](https://github.com/johntips/react-native-infinite-material-tab/blob/main/.github/workflows/e2e.yml)). [Lanterna](https://github.com/rogerfuentes/lanterna)
was read and not taken: it is at 0.0.x, and its iOS frame rate needs a native module Expo Go does
not bundle.

**What the emulator reads is held to the merge base, one measure at a time, while it is steady.**
The `apk` job builds this branch and its merge base side by side, and `device` reads both on one
emulator, the merge base first, as Reassure asks of any comparison. Start-up is the platform's own
cold-launch timing, the `TotalTime` that `am start -W` prints, over twenty cold launches; Flashlight's
reading of start-up spread 7.9, 19.6 and 12.1 per cent on three runs (36183944292, 36225719569,
36229377921), too wide to hold anything to. The walk is read by Flashlight for its default ten
iterations with the app's data cleared before each: the walk's own time, frame rate, CPU and memory.
A measure fails when this branch's median is worse than the merge base's worst reading, the rule the
browser journey already holds its first Seat Groups to. Each measure is held only while its spread on
both sides, the coefficient of variation that Reassure's own glossary names for how steady a run is
([CONTEXT.md](https://github.com/callstack/reassure/blob/main/CONTEXT.md)), stays below the 5 per
cent Reassure publishes for a steady runner. When any measure is at or over it, everything is read
again with twice the launches and iterations, Reassure's own advice for a noisy runner (its README
suggests raising the runs from the default 10 to 20). A measure still at or over it is left out of
the report and the verdict, named with its spread, and the rest are still held: a runner too noisy
for one measure never fails every pull request as unable to measure, and a measure too noisy to hold
is never printed as though it were held. A reading that measured nothing, failed, carried no frame
rate or memory, timed no cold launch, or read a figure that was nothing on every iteration is refused.
A merge base with no walk, as on the change that added it, holds this branch to nothing.

**The app's web build is held to the same accessibility standard as the web app.** `tests/app` runs
as a Playwright project of its own over Vercel's `serve`, which compresses what it sends as any host
does: axe scans every screen from the Ask sheet to the Room against WCAG 2.2 at A and AA. Its first run
found a real violation: the film list in the Ask
sheet was a list with no items in it (axe's `aria-required-children`), so each film is now a list item.
The Core Web Vitals journey is not held over the app's web build yet. It was built and run, and it
reads a p75 LCP of 3,304 ms against the 2,500 ms Google publishes as good, on a runner where the web
app reads 1,648 ms: the app's 1.3 MB script has to run before the first paint. The gate arrives with
the web build work that passes it, at Google's threshold, rather than now at a looser one.

**The app's bundles are four more ratchets.** The script Hermes compiles for iOS and for Android, the
web build's scripts, and the faces and images every platform ships, each against its own figure in
`.size-limit.json`. The phones' scripts are weighed before Hermes compiles them, from
`expo export --no-bytecode`, because the bytecode is not the same twice: Expo's exporter compiles
from a temporary directory named with `Math.random()` and the time (`exportHermes.js` in
`@expo/metro-config`), and Hermes writes that path into the bytecode. Metro's own output was not the
same twice either: Expo numbers modules in the order Metro meets them, and one commit weighed 992708
and 990513 B for iOS on two runs of the same job (run 36231517101). So `metro.config.ts` gives each
module an id hashed from its path, refusing a clash by name, and `quality` exports the scripts twice
and fails if a byte differs. The longer ids cost the web build 10,862 B of brotli, 282557 to 293419 B (run
36234684086), which is the price of a size that means the same thing on every run. Each ratchet went in at 1 B and the `footprint` job refused it, naming
each and printing its size; those sizes are the ratchets.

**A colour written into a screen is refused** by a Grit plugin, `tools/lint/no-colour-literals.grit`,
which `biome.json` points at `apps/native/src` except the theme and the tests. It refuses a string
that is a hex colour, a CSS colour function or one of the CSS Color Module Level 4 named colours,
because a literal carries one appearance and a token carries both. `silver` is the one named colour
it passes, because the theme declares a token of that name and reading a token by its name is what
the rule asks for.

**Watched failing, watched silent.** `tools/planted-red/planted/colours` holds a file per notation,
and `tools/planted-red/src/colour-literals.test.ts` runs the rule over each: the hex, the
functional and the named colour are each refused by name, and the token read passes in silence.

**An import of a package the nearest manifest does not declare is refused** by Biome's
[`noUndeclaredDependencies`](https://biomejs.dev/linter/rules/no-undeclared-dependencies/). In a
pnpm workspace such an import resolves from the root's `node_modules` in development and fails
under Metro, which is a defect that cannot appear until the phone runs the code. The rule reads the
closest `package.json`, and its own documentation says it is not meant to reach a monorepo root, so
each package declares what its own files import. Switching it on refused 196 imports across twelve
packages, every one of them a test-time import that the root had been satisfying, and each is
answered by a line in the package that does the importing.

Declaring a test runner in a package has a second effect worth knowing before it surprises
somebody: Biome reads its domains off the same manifest, so `apps/web` naming `vitest` switched on
the `test` domain there and its rules found three more diagnostics. All three were one fixture
helper named `before`, which `noDuplicateTestHooks` cannot tell from Mocha's hook of that name. The
helper is now `precedes`, which is what it does and what no test framework calls anything.

**Watched failing, watched silent.** An `import "expo-camera"` planted in
`apps/native/src/source.ts` is refused by package and by the manifest that does not declare it.
Taken out, the file passes.

**A class no stylesheet rules is refused by Biome's `noUndeclaredClasses`**, which the pinned
2.5.13 carries in its nursery group, and which replaced a check of this workspace's own:
twenty-two files that read the `<link>` elements of the page and parsed both the markup and
the stylesheets it linked with regular expressions.
Two of the rule's limits were measured rather than assumed, and both shape the tree around
it. It reads only a module that itself imports a stylesheet, and passes one that imports none
in silence: the sheets are therefore imports of the modules that draw with them, and
`apps/web/src/index.ts` imports every one of them in the order the page loaded them as links,
which is the cascade the bundler emits. And it reads a class spelled as a literal, or held in
a variable bound to one, but not a class built from a template or picked by a conditional.
That limit is a rule for the code rather than a hole in the gate: a class here is always a
literal, and the state that would otherwise be joined to it is a `data-` attribute the
stylesheet selects on. A seat is `class="seat"` with `data-state`, `data-designation` and
`data-recommended`; the ground of the pattern a wheelchair or companion space is filled with
is `class="space-ground"` with `data-state`; a ledger row is `class="ledger-row"` with
`data-unreached`. Every class in the tree is therefore a literal this rule reads, and a class
a spelling hides from it is a class that has to be rewritten rather than excused. A planted
module that imports a stylesheet and puts a class that sheet does not rule in a `className` is
refused by the class's own name, and a second module beside it naming a class the same sheet
does rule passes, so the rule is watched reading the sheet rather than refusing every class.

**What no rule reads from one module is a bare class two surface sheets both rule**, where
whichever loads last draws both. `apps/web/src/stylesheets.test.tsx` holds every surface sheet
to one ruling of a bare class, reading each as the browser parses it and descending into a
grouping rule, so a class ruled inside `@media`, `@supports` or `@layer` is seen too. The red
it is watched against is planted in `apps/web/tests/planted/`: two surface sheets that rule
the same two classes, one of those rulings inside a media query, beside a third class that
`house.css` and one surface both rule bare and the other names only under a descendant
selector, which is counted for neither. A rule two or more surfaces share has to move to
`house.css`, which is what that sheet is for.

The mutation gate has the same shape one tool along, and takes the same answer. Stryker
computes its score as mutants detected over mutants valid, scores `NaN` when none was valid,
and breaks on `score < threshold`, which `NaN` never satisfies: a run that weighed no mutant
logs a score of `NaN`, calls it greater than or equal to a break threshold of 100, and exits
zero. `pnpm test:mutation` therefore runs the gate and then a guard over the JSON report each
shard wrote, and the `footprint` job runs the same guard over every shard's report, so a shard
that left none is refused rather than quietly left out of the score. The guard fails when no
mutant in a report carries one of the four statuses the score counts. That is not a floor on
how many mutants a run must weigh, which would be a number
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

**A check on the machine may be scoped to the change; the one that gates a merge may not.**
The pre-push hook runs the unit tests that reach what the branch changed since its merge base
with `main`, lets the spell and dead-code checks read a cache, and reuses the build
information the type check already writes. Each of those is the tool's own documented switch,
`--changed`, `--cache` and `tsc --build`, rather than a filter written here. None of them
reaches `quality`, which installs from the lockfile into an empty runner and therefore reads
every file of every kind with no cache to reuse and nothing scoped. So the fast layer owns
feedback on the change and the gating layer owns the tree, and a scope that went wrong on
somebody's machine cannot narrow what a merge is held to. The measurement that made the split
worth having: on a quiet eight-core machine the whole unit suite takes 87 to 90 seconds on
three workers, and no other check in the hook takes two seconds once its state is warm.

One property of the scoping is worth knowing before it surprises somebody. `--changed` reads
the module graph, so a change to a file nothing imports selects nothing, however many tests
read that file from disk. `stylesheets.test.tsx` reads every sheet under `apps/web/src` and
the planted pair under `apps/web/tests/planted` with `readFile`. The sheets under
`apps/web/src` are imports of the modules that draw with them, so a change to one of those is
reached; the planted pair is imported by nothing, so an edit to it selects no test at all
locally while the suite fails on it. The planted reds have the same property one step along,
and it is the more useful half to know: `biome.json`, `.oxlintrc.json`, `.jscpd.json` and
`.size-limit.json` are in no module graph, so loosening a rule in one of them selects no test
on the hook. That is the hole in the fast layer, it is there by design, and the gating layer
closes it by running the suite whole.

The trigger list is written out rather than left to the tool's default, because the default
for the tool's own config file does not work. `**/{vitest,vite}.config.*/**` matches no path
at all, which was measured against the pinned picomatch rather than assumed, so
`**/vitest*.config.ts/**` is written beside it and the default is kept for the day it is
fixed. The setup files are written out for a second reason: Vitest appends a project's setup
files to that project's triggers, and the list this scoping reads is the root's, which has no
setup files of its own.

**A push that sends no commits runs none of it.** Git names the refs a push carries on the
hook's standard input and supplies `(delete)` in place of the local ref for one it is
deleting, so the hook reads those lines and returns when every one of them is a deletion. It
used to run the whole suite for a branch deletion instead, because lefthook compares against
`origin/HEAD` when the current branch has no upstream, which is every branch in a fresh
worktree, and two such pushes at once put a shared eight-core machine under a load average
above 300. A hook handed no ref at all runs everything rather than nothing, because a pass has
to entail a measurement here too, and those checks are their own hook so that
`lefthook run push-checks` reaches them without going through the reader at all.

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
