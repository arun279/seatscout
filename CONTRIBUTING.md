# Contributing

## Prerequisites

- Node.js 24 or newer
- pnpm 11.24.0, pinned by `packageManager`
- [gitleaks](https://github.com/gitleaks/gitleaks), for the pre-commit secret scan
- [cloc](https://github.com/AlDanial/cloc), for the footprint report
- [actionlint](https://github.com/rhysd/actionlint) and
  [shellcheck](https://www.shellcheck.net), for the workflow and shell checks in the
  `quality` job

Neither cloc nor gitleaks is an npm package, so neither arrives with `pnpm install`.

Run `pnpm install` after cloning. The install registers the lefthook Git hooks and prunes
any worktree registration whose directory has gone, so a stale entry cannot outlive the
checkout it named.

## Read these first

[CONTEXT.md](CONTEXT.md) is the domain vocabulary. Code, tests, types and commit messages
use those words and no synonyms, so a word that feels wrong is changed there before it is
changed anywhere else.

[docs/adr](docs/adr) records the decisions the code rests on, one to a file. Anything here
that looks arbitrary is explained in one of them, and each section below names which.

## Running it

```sh
pnpm build
pnpm --filter @seatscout/proxy dev
pnpm --filter @seatscout/native start
```

`pnpm build` runs `tsc --build` across the workspace and then Vite over `apps/web`. The
proxy serves what that build writes, so build first, then open the URL wrangler prints.
`ACCESS_TEAM_DOMAIN`, `ACCESS_AUD` and `UPSTREAM_ORIGIN` configure it, none of them
committed, and it serves nothing while any of the three is missing.

Expo prints a URL of its own; open that one in Expo Go. `/ios` and `/android` are ignored
because `expo prebuild` generates them.

## Before you push

Pull requests run the `quality` job, which is this list in the order it runs it:

```sh
pnpm format:check
pnpm lint
pnpm complexity
pnpm duplication
actionlint
shellcheck deploy/*.sh
pnpm spell
pnpm typecheck
pnpm dead-code
pnpm live-injections
pnpm cache-storage
pnpm counts
pnpm claims
pnpm test:unit
pnpm build
pnpm --filter @seatscout/proxy exec wrangler deploy --dry-run
pnpm test:e2e
pnpm test:journey
pnpm journey --head reports/journey/samples.json \
  --head-gesture reports/journey/gesture.json --no-baseline
```

The list is the job, not a selection from it. Running a shorter one and finding it green is
how a contributor arrives red on a pull request, which is what this list is for. The last
line is the half of the journey gate a checkout can run alone; the job also builds the merge
base in a worktree, runs its journey, and holds this one to it.

Three further jobs run beside it. `footprint` runs the mutation gate and reports what the
change weighs. `secrets` scans the pull request's commits with gitleaks. `dependencies`
scans the lockfile against the OSV database and fails on any advisory, then reads every
dependency's licence and fails on any SPDX identifier outside the allowlist that job
carries, a licence it could not determine included.

Two hooks run some of that earlier, and `lefthook.yml` declares both. The pre-commit hook
runs six checks over staged files. The pre-push hook runs ten over the whole workspace, the
unit suite among them, which is why a push takes longer than a commit. Neither is a
substitute for the list above: both are subsets of it, chosen for what is cheap enough to run
that often.

`pnpm cache-storage` reads the index, so it reports on the last `git add` rather than on the
edit in front of you.

## When a gate refuses

Each of these has one way through and no exemption to grant.

- **Complexity.** The failure names the file, the function, its score and the limit.
  Extract part of the function. Suppressing the rule would take a comment, and comment load
  is gated too.
- **File length.** Split the file.
- **A comment.** Say it in the code, or raise the ratchet in `.footprint.json` in the same
  diff, where a reviewer sees the comment it pays for. Every ratchet in this repository
  moves that way, the bundle's included.
- **A count stated in prose, or a claim a record makes about this repository.** Correct the
  sentence or correct the tree, then follow the sentence into
  `tools/counts-in-prose/claims.ts` or `tools/claims-in-prose.pairs.mjs`, where every pair is
  declared. A new ADR fails `pnpm claims` until it is paired in the second of those or
  recorded in `tools/claims-in-prose.unchecked.mjs` as carrying no claim a search can hold.
- **A word the spell check does not know.** Put it in the `words` list in `cspell.json`. The
  `flagWords` list beside it is the opposite and has no remedy; ADR 8 says what it refuses and
  why.
- **A collected response.** `pnpm lint` runs a Grit plugin,
  `tools/lint/no-collected-responses.grit`, over every `map` and `flatMap`. It refuses a
  callback that fetches without reading the body it gets back, and one that reads a body it
  was handed rather than one it fetched. Read each body inside the callback that fetched it;
  [ADR 2](docs/adr/0002-computation-on-the-client.md) says why a fan-out must.
- **A class no stylesheet rules.** `pnpm lint` runs Biome's `noUndeclaredClasses`, which holds
  every class a module puts in a `className` to the stylesheets that module imports. Add the
  rule to the sheet that owns the surface, import the sheet that already carries it, or take
  the class off the element. `foundation.css` holds the tokens and the reset every surface
  starts from, `house.css` holds what two or more surfaces draw, and every other sheet is named
  for the one surface it draws. The rule reads only a module that imports a stylesheet, so a
  screen imports the sheets it draws with; `apps/web/src/index.ts` imports all ten in the order
  the page loaded them as links, which is the cascade the build emits. It reads a class spelled
  as a literal or held in a variable bound to one, and passes a class built from a template or
  picked by a conditional, so a class here is always a literal and the state that would join it
  goes in a `data-` attribute the sheet selects on; ADR 6 says why.
- **Duplicated code.** `pnpm duplication` fails when jscpd finds more than 3 percent of the
  lines under `{apps,packages,tools}/*/src` duplicated, which is the figure SonarSource
  publish in the Sonar way quality gate. The failure names both files and the lines they
  share. Take the duplication out; there is no list to add a file to.
- **A dependency's licence.** The `dependencies` job holds every licence in the lockfile to
  the SPDX allowlist written into `.github/workflows/ci.yml`. A licence osv-scanner cannot
  determine reads as `UNKNOWN` and fails like any other identifier that is not on the list.
  Add the identifier to that list in the same diff, where a reviewer sees which dependency
  brought it.
- **An import cycle.** Biome's `noImportCycles` names the import that closes the loop. Move
  what both modules need into a third, or make the import `import type`, which the compiler
  erases and which the rule ignores.
- **An export with no written type.** `isolatedDeclarations` asks every export to carry a
  type a declaration emitter can write down without inferring it. Annotate the export. A
  React component that returns markup returns `ReactElement`.
- **The test count.** `.footprint.json` holds a floor under the tests the two runners collect,
  by their own listings rather than by a run; the mutation-cache guard separately compares
  Stryker's initial run to Vitest's JSON count from `vitest related` over the files
  `stryker.config.json` mutates. Put the tests back, or lower the ratchet in the same diff.

Take a ratchet's new value from the `footprint` comment on the pull request rather than from a
local run: the job measures the merge of your branch with `main` rather than the branch alone,
so the bundle's bytes and the sum of the unit and end-to-end counts are what that merge weighs,
and a floor derived locally read 25 too high the moment `main` had dropped a package's tests.
`.size-limit.json` holds four ratchets over what the build emits: the scripts, the
stylesheets, the woff2 faces the page preloads and the icons it names. The comment prints
each measured figure beside its own ratchet.

A pull request that changes what a person sees or does carries its headed pass as images or
video: drive the built tree in a real browser at a phone's size, screenshot each state the
change adds or alters, and attach them with `gh pr create --attach`, `gh pr edit --attach` or
`gh pr comment --attach`, one flag per file with alt text after a `#`, so a reviewer sees the
screen rather than reads about it. The flag needs GitHub CLI 2.99 or later.

[ADR 6](docs/adr/0006-gates-cite-a-standard-or-measure-a-regression.md) says where each of
those numbers comes from, and
[ADR 7](docs/adr/0007-prose-is-held-to-the-repository.md) says why prose is gated at all.

## Writing tests

A mutant that survives fails the build, and so does a line the unit suite never judges.
[ADR 12](docs/adr/0012-every-mutant-must-die.md) says why the gate is shaped that way. These
habits keep it cheap.

Do the work of a test inside the test. A fixture derived at module scope hides mutants, for
the reason that record gives.

Keep a hot test's work under Vitest's default timeout with room to spare. The dry run makes
a test slower by an amount that depends on files it never touches, so a dry-run timeout on a
test nobody edited means the test's work has to be divided rather than the timeout raised.

Substitute at `fetch`, never at the Source port. `fakeUpstream` in
`packages/core/src/testing/fake-upstream.ts` is that seam: it replays the captured corpus by
route, scripts faults as a status and a share of requests, orders arrivals from a seed, and
logs what was sent. [ADR 10](docs/adr/0010-the-corpus-is-the-contract.md) says why the seam
is there and not at the port.

## The reports

The footprint report compares `HEAD` with its merge base against `origin/main`. It needs a
built tree and a mutation report already on disk:

```sh
pnpm build
pnpm test:mutation
pnpm footprint
```

`--base` and `--head` compare something else, and `--out` writes the Markdown to a file.
`pnpm test:mutation` inherits nothing and writes nothing to inherit from;
`pnpm test:mutation:incremental` is what both jobs run, and is what writes and reuses
`reports/stryker-incremental.json`.

Both scripts run Vitest on one worker under Stryker (`VITEST_MAX_WORKERS=1`): with more, Stryker
activates a mutant in one worker while its tests run in another, and the run reports survivors
that a hand-planted mutant refutes. A scoped run by hand needs the same prefix:
`VITEST_MAX_WORKERS=1 pnpm exec stryker run --incremental --force --mutate <files>`.

The workflows save that incremental file only after Stryker's initial run says it ran at
least the unit-test floor implied by `.footprint.json`: the total test ratchet minus the
Playwright tests collected by the footprint command. A short or missing count means the
initial collection was partial, so the job fails and the partial seed is left out of the
cache.

Each report is saved under two names, the branch's and the tree's. A pull request merged up to
date has exactly the tree main gets, so the next branch restores the merged branch's report by
main's tree hash and judges only what it changed. A cache saved on a branch is invisible to main,
so a passing run also publishes its report as an artifact named by the tree; the baseline job on a
push downloads that artifact for main's tree, judges the nothing that changed, and saves the seed
under main, where every branch can restore it. Its nightly schedule judges main from nothing, which
is the one full run.

## Refreshing the corpus

`pnpm corpus:refresh --zip <postal code>` replaces every capture under
`packages/core/src/corpus`, rewrites the index and formats it. `--zip` has no default
because the area decides what the corpus contains. It makes about fifty requests half a
second apart, so it never runs in continuous integration or in a test, and it exits non-zero
if any redacted material, or the area itself, reaches a written file.

A refresh may exceed the span `SPAN_THE_CAPTURE_REACHED` in `captures.test.ts` records and
may not fall below it; lowering it is a reviewed line. The exact tallies `seat-map.test.ts`
asserts do have to be re-derived, and a refresh that moves one moves the numbers quoted in
[ADR 10](docs/adr/0010-the-corpus-is-the-contract.md) with it.

## The live checks

`pnpm test:live` reads the real Source and needs nothing configured. It never gates a pull
request; `.github/workflows/contract.yml` runs it nightly and opens an issue on what it
finds. See [ADR 11](docs/adr/0011-a-nightly-reading-judges-the-world.md).

`pnpm icons` renders the manifest's sizes, the Apple touch icon and a favicon from
`apps/web/public/icon.svg` through the browser Playwright already installs, so the mark has
one source.

## Deploying

`deploy/README.md` is the runbook, `deploy/setup.sh` walks it, and `deploy/verify.sh` reads
back what took effect without reading a secret. `.github/workflows/deploy.yml` deploys on
merge to `main` and on manual dispatch, running `wrangler` from the workspace so the version
that deploys is the version the lockfile pins and the dry run in `quality` already
exercised. With neither `CLOUDFLARE_API_TOKEN` nor `CLOUDFLARE_ACCOUNT_ID` set its first
step skips every step after it and says so in the run summary, so a fork gets a green build
rather than a confusing red one; with one of the two set it fails and names the other.

## Dependency updates

Dependabot opens them weekly from `.github/dependabot.yml`: one grouped pull request for the
actions and one for the minor and patch npm releases, with majors left to arrive on their
own.

`overrides` in `pnpm-workspace.yaml` is the other half of keeping dependencies honest. It
holds `react` at one version across the workspace, because a duplicate React surfaces as a
runtime hook error rather than as a build failure, and it moves with the Expo SDK rather
than with React's own releases. It also lifts two transitive dependencies past advisories
their own packages pin below: `qs` above
[GHSA-q8mj-m7cp-5q26](https://github.com/advisories/GHSA-q8mj-m7cp-5q26), which reaches the
workspace through Stryker, and `uuid` above
[GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq), which reaches it
through the Xcode project parser inside Expo's config plugins. `uuid` is held at 11.1.1
rather than at the newest patched release because that parser loads it with `require` and
uuid dropped its CommonJS entry point after 11. An entry is removable once the package that
pins it releases a version that does not. `pnpm why --depth=10 react` reports what is
installed rather than what was asked for.
