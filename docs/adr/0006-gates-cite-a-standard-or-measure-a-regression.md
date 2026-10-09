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

Every gate either cites a published standard or compares the change against `main`. The
absolute figure is reported either way.

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
the written declaration option, the duplication window, the import cycle
rule and the bundle weighing. That whole set answers in under half a minute on two workers,
which is why it sits in `pnpm test:unit` beside everything else rather than in a job of its
own. The fixtures live outside `src`, where they are neither product code nor mutated.

Not every gate here has one, and naming what does not is better than leaving the sentence above
to be read as covering everything. The Grit plugin that refuses a collected response, the two
React hook rules and the undeclared import rule were each watched failing by hand on the day
they landed. Every one of them could carry a planted red instead, and none does yet.

**Three React Native mistakes have no gate, and are read for by hand.** They are words outside
a `<Text>`, a `StyleSheet` entry nothing uses, and a platform component in a file without a
platform suffix. The only rules for them are in
[eslint-plugin-react-native](https://github.com/Intellicode/eslint-plugin-react-native), whose
maintainer says activity is low, and running ESLint over this TypeScript is closed for the
reason given under the cyclomatic limit.

**A planted red holds the gate. A pair holds this record's wording, and neither does the
other's job.** A fixture proves a rule fires. It cannot prove that this document still says 300
where the tool says 300, because a fixture has no opinion about prose, so each sentence here
that carries a number or a rule name is also paired with a search of the tree in
`tools/claims-in-prose.pairs.gates.mjs`, or in `tools/claims-in-prose.pairs.device.mjs` for the
walk and its reading on main. Some of those pairs sit beside a planted red as well,
and two sentences that carried neither a number nor a name were dropped along with the grep
that was their only witness, since the red beside them says everything they said. Others are
sentences no fixture can reach at all: the mutation gate's break threshold, which nothing can
be planted against short of a whole mutation run; the bundle globs and the main side each is
weighed against; the counter this decision picked; and the licence flag the `dependencies` job
carries, which already has a planted red of its own in that job because osv-scanner is the
job's tool rather than the workspace's.

One gate is outside all of that and it is worth naming rather than leaving to be found. The
claims gate is four modules directly under `tools/` rather than a package, so it has no
planted red, nothing in the unit suite judges it, and the mutation gate's glob does not reach
it, while it does gate a merge in `quality`. The rest of what sits directly under
`tools/` is the corpus capture and the modules it reads, the corpus indexer, the upstream
constant, the live suite's setup and the nightly alarm, none of which gates a merge.

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
this is the reason it is off.

`isolatedDeclarations` reaches every project that emits, and reaches the ones that do not as
well. `skipLibCheck` is set in `apps/native`, for the reason ADR 3 gives, and in `tests/app`,
and nowhere else.

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
and the only one a checkout can reach alone, since a checkout holds no measurement of `main`.

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
A count held to a committed number has neither property: the figure is what a reviewer last
accepted, it stands in a file, and it rises only by a line in a diff.

The ratchet stands at zero, which is what the tree holds, so the gate is absolute today: one
comment fails it and no amount of accompanying code rescues it. That is the intended reading
of a norm of none. The first deliberate comment is a line in `.footprint.json` in the same
diff, where the question of whether it belongs gets asked by a reviewer looking at both.

**Bundle size is held to main, weighed in the same job.** The `measure` job exports the app
twice: from the merge of the change into main that a pull request checks out, and from that
merge commit's first parent, which is main as the change merges into it. size-limit weighs both
with the globs in the change's `.size-limit.json`, which the job copies over main's so the two
sides are weighed alike. A bundle bigger than on main fails the job, by a byte or more, unless
the pull request carries the `bundle-grows` label. A bundle main does not ship yet weighs 0 B
there, so it is growth from nothing and needs the label too. So does any change to what
`.size-limit.json` weighs, read from main's own commit: every field of an entry but `limit`, which
weighs nothing. Narrowing or deleting a glob would otherwise drop a bundle from both sides and
pass. Applying a label takes GitHub's triage role or higher,
and the pull request's timeline records who applied it and when. Nothing requires a second
person: the label makes growth a deliberate, visible decision, not a reviewed one. The job reads
the labels from GitHub's API when it runs rather than from the event that started
it, so adding the label and running the failed jobs again is enough. The footprint comment
prints both figures and their difference for every bundle, label or not. A bundle that shrinks
makes main smaller for the next change, so the bar moves down by itself and rises only through
the label. The glob covers every emitted script rather than an entry point, so deferring bytes
into a chunk that loads later does not move the number.

It is held to the merge commit's first parent and not to `git merge-base`. The merge base is
where the branch left main, so main's own growth since then would count against the change;
the first parent holds everything main has merged since, so the difference is the change's
alone. Until this form, each figure stood in `.size-limit.json` as a ratchet a reviewer raised
in the diff. Every app change edited that one file, so two app pull requests landing one after
the other conflicted on it, and the second paid a whole CI run to settle one line. Weighing main
in the job removes the shared file, and the label keeps the one thing it gave: a deliberate,
recorded step before a bundle may grow.

Every kind of file the export ships is weighed: the script Hermes compiles for iOS, the one for
Android, and the faces and images every platform ships. Gating one kind and leaving another
unbounded would let bytes move from the weighed kind to the free one, which is the deferred
chunk under another name. Each glob is pointed at `apps/native/dist`, because the export is
what ships.

A glob that no longer reaches anything is worse than no gate, because it reads 0 B on both sides
and holds. Two fixture `size-limit` configurations are committed beside a planted file: over the
planted file size-limit weighs the glob from the directory its configuration sits in, which is
how main's export is weighed by the change's globs, and over globs that reach nothing it reports
0 B for each. The report refuses that reading rather than comparing it: every entry on the change
must have weighed at least one file, both sides must have weighed the same bundles, and main must
have been checked out and exported. When any of these fails, the footprint comment says which,
and the job fails whatever the labels say.

What a glob is pointed at has to be what ships rather than a stand-in for it, and for the
scripts that means the output of the application's own bundler. That is the load-bearing half
of this gate. The web application this repository once held was first weighed over `tsc`
output, a file per source file with no import specifier rewritten, and its figure moved once in
twenty-three merges, because a second file appeared in the directory rather than because
anything a reader downloads had changed. A ratchet over a per-file transpile is a ratchet over a
stand-in, which is the failure named at the top of this decision arriving one step earlier than
the deferred chunk. The app is therefore weighed over `expo export`, which is what Metro bundles
for a phone.

size-limit exits non-zero for a glob that matched no file while still printing its weights,
so the report reads the shape of its JSON rather than the status. That is why it is the one
subprocess here whose exit code is ignored, and why it refuses a run that weighed no bundle.
`@size-limit/file` compresses each matched file on its own and adds the results, so the
figure is a sum of per-file brotli rather than the brotli of everything concatenated.

**Accessibility has a published standard, so it is gated against that one.** `tests/app` serves
the app's web build with Vercel's `serve`, which compresses what it sends as any host does, and
`@axe-core/playwright` scans every screen from the Ask sheet to the Room against WCAG 2.2 at
levels A and AA, which is the [W3C Recommendation](https://www.w3.org/TR/WCAG22/) rather than a
bar this project invented. Any violation fails `quality`. The web build exists for this scan and
for nothing else. Its first runs found two real violations: the film list in the Ask sheet was a
list with no items in it (axe's `aria-required-children`), so each film is now a list item, and
the Ask sheet's sliders gave a screen reader no range or position. Both were fixed in the app's
own components, which is what makes a scan of the web build a signal about the app.

**Every screen test is audited as well, on each phone's own terms.** After every screen test,
before the screen is torn down, `apps/native/test/setup.tsx` runs `test/audit.ts` over
everything the test rendered. No test opts in and none opts out. It refuses, naming the control
and the criterion:

- words under 4.5 to 1 against the ground drawn behind them, or 3 to 1 at 24 or at 18.66 in
  bold, which are WCAG's 18 and 14 points in the units React Native lays out in (WCAG 2.2
  1.4.3);
- a chosen button, radio, tab or checkbox under 3 to 1 against its ground and its unchosen
  neighbours (1.4.11);
- something that can be pressed or answers touch directly with no role or no name, unless it
  is hidden from screen readers because a control beside it does the same job, or it only
  widens where a finger lands around a named control inside it (4.1.2);
- a control short of the platform's own touch floor, 44 pt on iOS and 48 dp on Android,
  counting its `hitSlop`, or reached through such a row around it (2.5.8, pressable words
  inside a sentence excepted as that criterion excepts them);
- a text field with no label (3.3.2);
- words with `allowFontScaling` off (1.4.4);
- a control that changes what is chosen, or the velvet commit, that plays no haptic feedback
  when the audit presses it (Apple's Human Interface Guidelines on playing haptics).

`test/audit.test.tsx` plants a violation of each rule and watches the audit refuse it. The two
overlap on contrast and names. What only axe reads is computed roles and the relationships
between them; what only the audit reads is each platform's touch floor and the haptics, which a
web build cannot show.

**That scan is named so that it cannot be deleted quietly.** `tests/app` is outside the unit
runner's include and outside the mutation gate's scope, so nothing judges what is in it. So
`pnpm test:e2e` lists the tests tagged `@accessibility` before it runs anything, and
Playwright's own answer to a filter matching nothing is to exit non-zero. Deleting the scan, or
untagging it, fails the job. What is asked for is a name and not a number: a floor on how many
tests `tests/app` holds is a figure this decision would have to justify, it would calcify
whatever the suite held on the day it was written, and a count does not protect a particular
scan in any case.

**The prose is linted for form and for links that resolve.** Every tracked markdown file goes
through [markdownlint-cli2](https://github.com/DavidAnson/markdownlint-cli2) under markdownlint's
own defaults, with one rule turned off: line length. Nothing here holds prose to a width, and a
width would be a number this decision chose. The records already met every other default but
three tables written without spaces around their pipes and one fence that named no language.
[lychee](https://github.com/lycheeverse/lychee) then checks every link in the same files that
points inside the repository, file and heading alike, with `--offline --include-fragments`.
Links to the web are left out of the gate, because a site being down would turn a pull request
red for something it did not change; checked once by hand on the day this landed, one of them
was broken, a `#readme` anchor GitHub draws with script, and it was corrected.
`tools/planted-red/src/markdown.test.ts` watches markdownlint refuse two headings at the top
level and a bare fence and pass a tidy record with a long line, and the `quality` job watches
lychee refuse a planted record with a missing file and a missing heading and pass one whose links
resolve.

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
fail and get decided in a diff. Sixteen identifiers satisfy every expression the lockfile's packages carry,
`AND` needing both sides and `OR` needing one. A licence osv-scanner cannot determine is reported as
`UNKNOWN`, and `UNKNOWN` is an identifier like any other here: it is not on the list, so it fails
rather than passing, which is the whole reason the list is an allowlist and not a denylist.
One was decided that way: argparse 3 declares `PSF-2.0`, the Python Software Foundation License
Agreement on its own, where argparse 2 declared `Python-2.0`, whose SPDX text already contains that
agreement. The terms the tree accepts did not change, so `PSF-2.0` joined the list.

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
chain, passes over all ten overrides in `pnpm-workspace.yaml`.

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
assumed, and runs in `quality` as `pnpm versions`. It carries no
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

**Each override in `pnpm-workspace.yaml` has a reason, and goes when the reason does.**
`react` is held at one version across the workspace, because a duplicate React shows up as a
hook error at run time rather than as a build failure;
[ADR 3](0003-separate-view-layers-shared-core.md) says why it moves with the Expo SDK. Five lift
a transitive dependency past an advisory, because the package that brings it in asks for a
version below the fix: `qs` above
[GHSA-q8mj-m7cp-5q26](https://github.com/advisories/GHSA-q8mj-m7cp-5q26), through Stryker;
`uuid` above [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq), through
the Xcode project parser inside Expo's config plugins; `decode-uri-component` above
[GHSA-vcc3-ghjq-m6fr](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr), through the query
parser inside Expo Router; `compression` above
[GHSA-vc2v-76pw-4v95](https://github.com/advisories/GHSA-vc2v-76pw-4v95), through Expo's CLI;
and `source-map-js` above
[GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q), through PostCSS and
css-tree. Two more come with markdownlint-cli2: `smol-toml` above
[GHSA-r4xh-jqrq-34v2](https://github.com/advisories/GHSA-r4xh-jqrq-34v2), which it pins exactly,
and `katex` above [GHSA-238p-pmpm-9mq7](https://github.com/advisories/GHSA-238p-pmpm-9mq7),
which `micromark-extension-math` loads for rendering math to HTML, which the linter never does.
The fix for `katex` is in 0.18, outside the range that extension asks for, so the lint's planted
red is what shows the newer release still loads. The last four replace only the exact version
that was asked for. `uuid` is held at
11.1.1 rather than at the newest patched release, because that parser loads it with `require`
and uuid dropped its CommonJS entry point after 11. `exit` is aliased to `exit-x`, because the
package Jest's own runner pulls in states its licence in npm's pre-SPDX form, so the licence
gate reads it as undetermined, and `exit-x` is the maintained fork Jest itself moved to.
`@types/jsdom` is held at 30.0.0, because the version 20 types `jest-expo` brings with the Jest
jsdom environment do not type-check, which `pnpm typecheck` shows the moment the entry is
removed. An entry can go once the package that pins it releases a version that does not.

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

**A screen's render cost is held to main as the change merges into it, past the drift
unchanged code shows.** [Reassure](https://github.com/callstack/reassure) renders each screen's
Testing Library scenario 20 times on the base and on the head, and reports a change as
significant when its probability is under 0.02 and it is at least 5 per cent. The probability
uses the baseline's spread over the square root of the runs, which is the spread within one
process; the base and the head are measured in two processes, with a checkout and an install
between them, and that drift does not shrink with more runs. Measured on unchanged code (runs
37937855304 and 37941070304: 18 jobs, each comparing a commit with itself twice), a scenario's
change had a standard deviation of 2.5 per cent at 10 runs and 2.09 per cent at 20, and reached
7.4 and 6.4 per cent. At 10 runs, 2 of 10 comparisons of unchanged code came out significantly
slower, and a pull request that touched only tools went red on a 5.4 per cent change to the
hand-off sheet.

So the job runs each scenario 20 times, the knob Reassure's
[methodology](https://callstack.github.io/reassure/docs/methodology) names for an unsteady
runner, and fails on a slower scenario only when it is significant and at or above 6.3 per cent:
three standard deviations of the measured drift at 20 runs, the control limit a Shewhart chart
draws. A scenario that renders more often fails at any size, since a count does not drift. Of
all 216 comparisons of unchanged code, at 10 runs and at 20, none reached that floor, including
those from runners whose own repeated measurement varied by 5 per cent or more. The floor
replaces Callstack's guidance as the condition for gating. Their methodology calls a runner
whose repeated measurement varies by less than 5 per cent steady, and the job used to gate only
on such a runner; at 20 runs, 5 of 13 jobs read 5 per cent or more, so the gate was off on more
than a third of runs. The job still measures the same code twice and prints that reading in its
comment, as information. `reassure check-stability` is that run's own name upstream, but its
command handler hands its own name to the test runner as a path pattern, so the job spells out
what the handler does, a baseline measurement and a comparison over the same commit.

The cost is stated plainly: a real slowdown under about 6 per cent now passes unseen, because it
is inside the noise. Twenty runs add about 45 seconds to the job (220 against 174 seconds, median
of the experiment's jobs), which keeps it well inside the mutation and `android` jobs that a pull
request waits on.

**Watched failing, watched silent.** The first run on the pull request that added the job left no
reading at all, because the failure was piped into `tee` and lost. The reading is taken under
`pipefail`, so a measurement that fails fails the job. The one absence that reports rather than
fails is when main has no screen to measure, which the step that measures the base records for
the step that judges.

**The app is walked end to end on an emulator, and the walk gates every push that touches it.**
The `android` job builds a release of the app for Android, with the Source answered in the
build from the corpus, and Maestro walks it once from the Ask sheet through the ranked Seat
Groups and the hand-off to the Room (`apps/native/e2e/journey.yaml`). It leaves every level it
visits twice, and after each it asserts the screen beneath is back. First by gesture: a drag
down on a sheet, which the app's own sheet answers, and on iOS the edge swipe on a pushed
screen and the drag down on the Ask sheet. On Android the edge swipe on the full-screen Ask
dialog and the Room is recognised by the system, not the app, which turns it into the same back
event the back key sends; injected edge swipes are not recognised on the runner's emulator even
with gesture navigation on (run 36223227514 swiped from the edge of Settings and opened a
subpage instead), so the walk sends that back event itself. Then by the way back a person
presses: the Ask sheet's own close control, and the Android back key. A step that finds nothing
fails the job, and `footprint`, which is required, needs it. The corpus stands in through
Metro: `SEATSCOUT_UPSTREAM=corpus` swaps `src/host/upstream.ts` for `e2e/upstream.ts`, which
answers from the same `fakeUpstream` the accessibility scan uses, so the bundle a phone runs
never carries the corpus. Any other value is refused, and `app.config.ts` turns updates off in
such a build so a published update cannot replace the stand-in. It is Android on an ubuntu
runner rather than iOS on a macOS one because the only maintained open-source frame-rate
reader, [Flashlight](https://github.com/bamlab/flashlight), reads Android only, so one build
serves both the walk and the reading, and published prior art for an Expo app on a macOS runner
puts one run at 15 to 25 minutes (the workflow comment in
[johntips/react-native-infinite-material-tab](https://github.com/johntips/react-native-infinite-material-tab/blob/main/.github/workflows/e2e.yml)).
[Lanterna](https://github.com/rogerfuentes/lanterna) was read and not taken: it is at 0.0.x,
and its iOS frame rate needs a native module Expo Go does not bundle.

**Both Android builds use the NDK and CMake the runner already has.** The ubuntu-24.04 runner
image ships NDK 27.3.13750724, 28.2.13676358 and 29.0.14206865, and CMake 3.31.5 and 4.1.2
([its readme](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md)).
React Native asks for NDK 27.1.12297006, `expo-updates`, which names none, gets the Android
plugin's default, 27.0.12077973, and every native module gets that plugin's default CMake,
3.22.1, so Gradle downloaded all three on every build. One download came back as a corrupt
archive and failed Baseline run 37936707241. The Gradle init script
`.github/gradle/preinstalled-android-tools.gradle` sets every Android project in the build to NDK
27.3.13750724 and CMake 3.31.5, after the project's own configuration, and the build step fails if
the NDK or CMake directory holds anything after the build that it did not hold before. The CMake
version is set on every project rather than only on those that name a CMakeLists, because React
Native's Gradle plugin points the app at its CMakeLists after the init script has run; set only
where a CMakeLists was named, the app still downloaded 3.22.1, and the step failed on it.

**What the emulator reads is measured on main, held to the run before, one measure at a time,
while it is steady.** The Baseline workflow's `device` job builds main's app on every push to
main, and not on the nightly schedule, which would read the same commit again. A push never
cancels a reading in progress: merges land faster than a reading takes, and cancelling let five
merges in a row go unread. GitHub lets the running reading finish and keeps only the newest one
waiting ([concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)),
so every reading that starts finishes and the queue never grows past one. Runs started by hand
wait in a group of their own, so a push cannot replace one either. It walks the
journey and has Flashlight read the walk for its default ten iterations with the app's data
cleared before each: the walk's own time, frame rate, CPU and memory. A measure is worse when
this commit's median is worse than the worst iteration of the reading the previous Baseline run
left. Flashlight's report has no median. It shows the average walk to the millisecond and the
average frame rate, CPU and memory to a tenth (`getAverageMetrics` in its reporter's
[`Report.ts`](https://github.com/bamlab/flashlight/blob/v0.18.0/packages/core/reporter/src/reporting/Report.ts)).
The judge rounds this commit's median and the previous run's worst to those same places before it
compares them, so a difference finer than the instrument shows its averages at is not called
worse. Before that, a median of 58.8 FPS was called worse than a worst iteration of 58.845 FPS.
The previous reading is the newest `device-reading` artifact a run on main left, and a first
run, with none to collect, is held to nothing. A run keeps its reading only when it held, so a
worse reading never becomes the one the next run is held to by accident. A cost a change was
meant to carry, such as a new screen in the walk, is accepted by hand: run Baseline on main from
the Actions tab with `accept` set to the reason. That run keeps its reading whatever it read. It
records who started it, when and why in the report it keeps, and on an issue labelled
`device-red`, which outlives the 14-day artifact: the open one, which it then closes, or a new one
it files closed. A reason made only of spaces accepts nothing. A run may accept only on main's
newest commit, so re-running an old accept run cannot bring back a stale reading. Otherwise a reading stays the reference for the 14 days an artifact is kept; after
that the next reading is held to nothing and becomes the reference. Each measure is held only
while its spread on both readings, the coefficient of variation that Reassure's own glossary
names for how steady a run is
([CONTEXT.md](https://github.com/callstack/reassure/blob/main/CONTEXT.md)), stays below the 5
per cent Reassure publishes for a steady runner. A measure at or over it is left out of the
report and the verdict, named with its spread, and the rest are still held. A reading that
measured nothing, failed, carried no frame rate or memory, or read a figure that was nothing on
every iteration is refused, and the job fails. A steady measure that got worse files an issue
labelled `device-red`, or comments on the open one, with the report, which names each measure,
this commit's median and the previous run's worst; a later reading that holds closes it. The
job stays green on a worse reading: it reports a trend, and it gates no pull request.

**Why the reading left the pull request.** On run 36287276171 the two sides' twenty walks took 27
of the run's 49 minutes. Flashlight's own [page on
CI](https://github.com/bamlab/flashlight/blob/main/website/docs/test/ci.md) says "An emulator
running on the CI will likely be too slow" and points to a device farm, and of the one farm it
names that serves emulators, "using emulators will not accurately reproduce the performance of a
real device". What this runner's emulator reads bears that out. It draws with a software renderer
(`-gpu swiftshader_indirect`), and the frame rate sits just under 60 on every run: 58.8 on that
run's branch and 58.6 at the merge base's worst, spreading 0.1 and 0.2 per cent. Start-up, the
walk's time and CPU were unsteady and already left out (below). Memory is the one measure that
moved, from 345.4 MB at the merge base's worst to 323.4 on the branch, at 4.8 and 2.9 per cent,
and a trend on main shows that movement as well as a gate on the pull request did. So nothing the
reading held had a reason to stop a pull request, and it runs on main as a trend with an alarm.
The journey walk, which asserts every screen is reached and every way back works, still gates
every push, and so does the axe scan of the app's web build.

**One pass, and no cold-launch measure.** Start-up was measured and never held. Flashlight's reading
of it spread 7.9, 19.6 and 12.1 per cent on three runs (36183944292, 36225719569, 36229377921), and
the cold launches `am start -W` timed still spread 8.1 per cent over forty launches on run
36245321569. So it is not measured. That run read both sides twice: when a measure spread 5 per
cent or more, everything was read again with twice the launches and iterations, as
[Reassure's README](https://github.com/callstack/reassure) suggests for a noisy runner. The
second pass cost about 59 of the `device` job's 91 minutes (the three APK installs in the log
are at 13:47, 14:16 and 14:46, and the step ended at 15:15), and its final report still left the
walk's time (6.3 per cent) and CPU (13.5) out as unsteady while holding frame rate (0.2) and memory
(2.4 and 3.7). The first pass's report was overwritten by the second, so whether those two were
already steady after ten iterations cannot be read from that run; the one-pass run that followed
(36287276171) held them at 0.1 and 0.2, and 2.9 and 4.8. Reassure's README calls more runs "a
trick of last resort" and a reading of 10 per cent or more a machine to fix, and Flashlight's own
[page on CI](https://github.com/bamlab/flashlight/blob/main/website/docs/test/ci.md) says an emulator
on CI is likely too slow and points to a device farm. So the job reads once, and a measure that is
unsteady on that pass is left out. One pass of both sides took 1,846 seconds on run 36287276171.
The Baseline job reads one side, and its limit is 60 minutes. The pull request's `android` job boots
the emulator, installs the app and walks once. That run also tried
Gradle's build cache on the app build: cold, it saved nothing (836 and 623 seconds against 859 and
699) and wrote a 1.79 GB entry per pull request into a repository cache already past GitHub's
10 GB. So a pull request never writes Gradle's caches. The
Baseline job sets Gradle up with `gradle/actions/setup-gradle`, whose open-source `basic` provider
writes the caches from main, and a pull request can read what the default branch saved; the
`android` job reads them with `cache-read-only`, so there is one entry for every pull request rather
than one per pull request.

**The app's bundles are three figures.** The script Hermes compiles for iOS and for Android,
and the faces and images every platform ships, each named in `.size-limit.json`. The phones' scripts are weighed before Hermes compiles them, from `expo
export --no-bytecode`, because the bytecode is not the same twice: Expo's exporter compiles
from a temporary directory named with `Math.random()` and the time (`exportHermes.js` in
`@expo/metro-config`), and Hermes writes that path into the bytecode. Metro's own output was
not the same twice either: Expo numbers modules in the order Metro meets them, and one commit
weighed 992708 and 990513 B for iOS on two runs of the same job (run 36231517101). So
`metro.config.ts` gives each module an id hashed from its path, refusing a clash by name, and
`quality` exports the scripts twice and fails if a byte differs. The longer ids cost bytes,
which is the price of a size that means the same thing on every run, and what lets the two
sides of the bundle gate be weighed in one job and compared byte for byte.

**A colour written into a screen is refused** by a Grit plugin, `tools/lint/no-colour-literals.grit`,
which `biome.json` points at `apps/native/src` except the theme and the tests. It refuses a string
that is a hex colour, a CSS colour function or one of the CSS Color Module Level 4 named colours,
because a literal carries one appearance and a token carries both. `silver` is the one named colour
it passes, because the theme declares a token of that name and reading a token by its name is what
the rule asks for.

**Watched failing, watched silent.** `tools/planted-red/planted/colours` holds a file per notation,
and `tools/planted-red/src/colour-literals.test.ts` runs the rule over each: the hex, the
functional and the named colour are each refused by name, and the token read passes in silence.

**An id two elements share is refused, by the web scan and first by a lint rule.** On the web
build every SVG id lives in one document. Two copies of a component, or two screens still
mounted, can define the same id. `url(#id)` then resolves to the first definition in the
document, which can sit in a screen hidden beneath. That is how the Room's glow vanished while it
borrowed a result card's. React's [`useId`](https://react.dev/reference/react/useId) gives each
copy its own id, and its documentation builds several related ids from one call.

The direct check is in the axe pass over the web build. On every screen it scans,
`tests/app/app.fixtures.ts` also lists each id that two elements carry, and any such id fails the
scan. `tests/app/ids.spec.ts` plants two drawings that share an id beside one that does not, and
watches the scan name the shared one and only it.

The cheap first layer is a Grit plugin, `tools/lint/no-literal-ids.grit`, over `apps/native/src`
except the tests. It refuses an `id` whose whole value is a literal: a string, a string in braces,
or a template with nothing in it. It passes an id built from a value, such as `useId()` alone, in a
template, or joined to a string. It cannot see a literal that reaches `id` through a constant or an
object, which is what the scan is for. `tools/planted-red/planted/ids` holds a file for each form,
and `tools/planted-red/src/literal-ids.test.ts` runs the rule over them.

**An import of a package the nearest manifest does not declare is refused** by Biome's
[`noUndeclaredDependencies`](https://biomejs.dev/linter/rules/no-undeclared-dependencies/). In a
pnpm workspace such an import resolves from the root's `node_modules` in development and fails
under Metro, which is a defect that cannot appear until the phone runs the code. The rule reads the
closest `package.json`, and its own documentation says it is not meant to reach a monorepo root, so
each package declares what its own files import. Switching it on refused 196 imports across twelve
packages, every one of them a test-time import that the root had been satisfying, and each is
answered by a line in the package that does the importing.

Declaring a test runner in a package has a second effect worth knowing before it surprises
somebody: Biome reads its domains off the same manifest, so the web application this repository
then held, naming `vitest`, switched on the `test` domain there and its rules found three more
diagnostics. All three were one fixture helper named `before`, which `noDuplicateTestHooks`
cannot tell from Mocha's hook of that name. The helper is now `precedes`, which is what it does
and what no test framework calls anything.

**Watched failing, watched silent.** An `import "expo-camera"` planted in
`apps/native/src/source.ts` is refused by package and by the manifest that does not declare it.
Taken out, the file passes.

The mutation gate has the same shape one tool along, and takes the same answer. Stryker
computes its score as mutants detected over mutants valid, scores `NaN` when none was valid,
and breaks on `score < threshold`, which `NaN` never satisfies: a run that weighed no mutant
logs a score of `NaN`, calls it greater than or equal to a break threshold of 100, and exits
zero. `pnpm test:mutation` therefore runs the gate and then a guard over the JSON report each
shard wrote, and the `footprint` job runs the same guard over every shard's report, so a shard
that left none is refused rather than quietly left out of the score. The guard fails when no
mutant in a report carries one of the four statuses the score counts. Requiring one weighed
mutant is not a floor on how many a run must weigh, which would be a number this project
invented. It is the difference between a measurement and none, which is what a pass already
claims. The guard also fails when any mutant ended as a runtime or compile error, which the score
leaves out although no test judged it.

An earlier revision of this decision claimed that the non-zero exit alone made an empty
glob fail the gate. It did not, because the code beside it discarded the status and
`[].every()` is true, so the sentence asserted the opposite of what ran. A change to
`outDir`, to a file extension, or to where an application lives would have gone green over a
measurement that never happened, which is the failure this decision opens with arriving
through the gate meant to catch it.

The bundler's determinism is load-bearing for the same reason the counters' is, and was
checked the same way rather than assumed: eight consecutive builds of one tree produced
eight byte-identical bundles and one size.

**One hook, and a job judges a tree once.** There was a pre-push hook that ran eleven checks
`quality` also runs, some scoped to the change. It is gone. The pre-commit hook stays, because
its checks over the staged files (secrets, format, lint, spelling and complexity) take seconds
and are the only thing that runs before CI. CI is the judge of the whole tree, because a hook
can be skipped, and it runs each check once per push. Nothing is reused from an earlier run: a
cache of verdicts keyed by tree ids saved little, because a rebase changes the tree, and it was
one more thing that could carry a stale answer. What keeps a push short instead is that a job
runs only when the change reaches what it judges. Mutation judges the source files the change
touches (see [ADR 12](0012-every-mutant-must-die.md)), and the `android` and `performance` jobs
run only when the change touches the app, its workspace packages, the lockfile, the workspace
or compiler settings, or the CI workflow. `footprint` waits for every job and refuses the
change when any of them failed, or when one that runs on every change was skipped. A draft runs
only the fast jobs; the slow ones run once the pull request is marked ready. The ruleset no
longer requires a branch to be up to date with `main` before it merges: with several pull
requests open, each merge forced the next to rebase and run the whole suite again. GitHub's
merge queue is the standard answer and gives the same protection without the loop, but it is
offered only for repositories owned by an organization. In its place a pull request run tests
the branch merged onto `main` as it stood, and each push to `main` runs `quality`, `secrets`
and `dependencies` over the merged result.

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

Each side is counted from a copy of the commit that `git archive` writes, rather than from
the working tree. That matters during a pull request run, where the checkout holds a merge
commit rather than either side of the comparison.

cloc finds comments with patterns rather than a parser, and its `--strip-str-comments` does not
reach every string: a template literal such as `` `${root}/*.test.ts` `` opened a block comment that
ran 76 lines to the next `*/`, and the comment ratchet refused a change that held no comment. So
before cloc counts a copy, [oxc-parser](https://www.npmjs.com/package/oxc-parser), the parser
oxlint is built on, blanks the inside of every string, template, regular expression and JSX text
in it, keeping every line and every real comment where it was. cloc then counts and diffs code it
can no longer misread. `tools/footprint/planted/strings-holding-comment-markers.ts.txt` holds each
shape; cloc counts it as 6 comment lines and 4 of code, and its blanked copy, which a test holds
byte for byte, as the true 3 and 7. A script the parser cannot read stops the report rather than
being counted as it stands.

## Consequences

The gates exist before the code they judge, which is the only time a regression gate can
be introduced honestly.

A comment cannot be merged while the ratchet stands at zero. Both ways through are named in
the report itself when the gate fails, because a gate that fails without naming the remedy
is a wall: make the code say what the comment was going to, or raise the ratchet in the same
diff, where a reviewer sees it beside the comment it pays for.

Growing a bundle takes the `bundle-grows` label, which a reviewer sees on the pull request,
rather than a number that quietly stops meaning anything.

The app's figure is everything Metro bundles for a phone, the slice of the shared packages it
reaches included, compressed. It is defined as what the export publishes rather than as what one
launch reads, and the report says so rather than leaving it to be inferred.

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
