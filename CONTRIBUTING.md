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

`pnpm test:unit` is Vitest over everything that runs in Node. `pnpm test:native` is Jest over
the Expo app under the `jest-expo` preset, which is the only runner that renders React Native;
it runs every test twice, once as iOS and once as Android, so a per-platform floor is asserted
from the styles each platform resolves.

`pnpm build` runs `tsc --build` across the workspace and then Vite over `apps/web`. The
proxy serves what that build writes, so build first, then open the URL wrangler prints.
Nothing configures it: `apps/proxy/wrangler.json` names the upstream it forwards to and the
rate limit it holds each visitor to, and nobody signs in.

Expo prints a URL of its own; open that one in Expo Go. `/ios` and `/android` are ignored
because `expo prebuild` generates them. A phone that cannot reach this machine, which is any
phone when the server runs behind a NAT, opens the published update instead of this server;
`README.md` says how.

## Before you push

Pull requests run the `quality` job, which is this list in the order it runs it:

```sh
pnpm format:check
pnpm lint
pnpm complexity
pnpm duplication
actionlint
shellcheck deploy/*.sh apps/native/e2e/*.sh
pnpm spell
pnpm typecheck
pnpm dead-code
pnpm versions
pnpm --filter @seatscout/native run install-check
pnpm --filter @seatscout/native run doctor
pnpm --filter @seatscout/native run bundle
pnpm counts
pnpm claims
pnpm test:unit
pnpm test:native
pnpm build
pnpm --filter @seatscout/proxy exec wrangler deploy --dry-run
pnpm test:e2e
pnpm test:journey
pnpm journey --head reports/journey/samples.json \
  --head-gesture reports/journey/gesture.json --no-baseline
```

`pnpm test:e2e` serves the app's web build from `apps/native/dist` with
`serve`, compressed as a host would send it, so the bundle step comes first. Playwright runs `tests/e2e` over `apps/web` as
the `web` project and `tests/app` over the app's web build as the `app` project.

The list is the job, not a selection from it. Running a shorter one and finding it green is
how a contributor arrives red on a pull request, which is what this list is for. The last
line is the half of the journey gate a checkout can run alone; the job also builds the merge
base in a worktree, runs its journey, and holds this one to it.

Eight further jobs run beside it. `device` builds the app for Android with the Source
answered from the corpus (`SEATSCOUT_UPSTREAM=corpus`, which Metro reads to swap
`src/host/upstream.ts` for `e2e/upstream.ts`), walks `apps/native/e2e/journey.yaml` with
Maestro on an emulator, and then has Flashlight read start-up, frame rate, CPU and memory on this
branch and on its merge base, which `apk` builds beside it. The walk gates, and so does a figure
worse than the merge base's worst iteration, or a runner too unsteady to tell after a second, longer
reading; ADR 6 says how. `shards` reads the workspaces the mutation gate is divided
into out of `stryker.shards.json`, and `mutation` judges one of them per runner, in parallel.
`footprint` gathers what they and `device` wrote and reports what the change weighs. `secrets` scans the
pull request's commits with gitleaks. `dependencies`
scans the lockfile against the OSV database and fails on any advisory, then reads every
dependency's licence and fails on any SPDX identifier outside the allowlist that job
carries, a licence it could not determine included. `performance` measures each screen's
Testing Library scenario with Reassure on the merge base and on the head, and reads how
steady the runner is before it judges either.

Two hooks run some of that earlier, and `lefthook.yml` declares both. The pre-commit hook
runs five checks over staged files. The pre-push hook reads the refs the push carries and
hands one that sends commits to `push-checks`, which runs eleven checks; a push that only
deletes a branch sends none, so it runs none of them. `pnpm exec lefthook run push-checks`
runs the same eleven by hand.

Those eleven are scoped to the change wherever the tool scopes itself. The unit stage runs
`--changed origin/main`, which is the tests that reach what the branch changed since its merge
base with `main`. A shared file brings the whole suite back: a Vitest config, `package.json`,
a `tsconfig*.json`, `pnpm-lock.yaml` or a setup file. Those are `forceRerunTriggers` in
`vitest.config.ts`, and the list is written out there rather than left to the default, whose
glob for its own config file matches nothing. The type check reuses the build information
`tsc --build` leaves behind. The spell check and the dead-code check each reuse a cache of
their own. The rest read the whole tree, because none of them takes two seconds.

Neither hook is a substitute for the list above. `quality` installs into an empty runner, so
it reads every file with no cache to reuse and no scope, and it is what a merge waits for.
The hooks answer on the change; the job answers on the tree.

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
  declared; the sentences ADR 6 makes about a gate's globs and thresholds are in
  `tools/claims-in-prose.pairs.gates.mjs` beside it, and those the records of a search make are
  in `tools/claims-in-prose.pairs.search.mjs`. A new ADR fails `pnpm claims` until it is paired
  in one of the last three or recorded in `tools/claims-in-prose.unchecked.mjs` as carrying no
  claim a search can hold.
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
  brought it. `UNKNOWN` is the one identifier that may never be added, because the step after
  it plants an undetermined licence and fails the job if the list took it. Replace the
  dependency that carries one instead, through `overrides` in `pnpm-workspace.yaml` when it is
  a transitive one, and say in the pull request which dependency it was.
- **A render regression.** The `performance` job measures the same code twice before it
  measures anything else, and the widest random change that reading shows decides what
  follows. Under 5 per cent the runner is steady and a statistically significant change in a
  screen's render duration or render count fails the job; at or above it the job reports the
  comparison and says it did not gate. A reading the job cannot take fails it either way,
  because a gate that cannot read its subject is not a gate. The comment on the pull request
  names the scenarios that moved. Make the screen render what it rendered before, or say in
  the pull request what the change buys.
- **A reach for Cache Storage.** `pnpm lint` denies the `caches` global under `apps/` with
  Biome's `noRestrictedGlobals`, and the `caches` property everywhere with its
  `noJsRestrictedProperties`, so `self.caches` is refused beside a bare `caches`. There is one
  exemption and it is the writer, `apps/web/src/worker/cache.ts`; read a cached response
  through `cachedShell` and write one nowhere.
  [ADR 13](docs/adr/0013-only-the-catalogue-is-cached.md) says why a seat map may never be
  held.
- **An import the package never asked for.** Biome's `noUndeclaredDependencies` names the
  package and the manifest that does not declare it. Add it to that manifest, at the version
  the rest of the workspace already uses. The root's `package.json` does not answer for a
  package under `apps/`, `packages/` or `tools/`: an import the root satisfies resolves here
  and fails under Metro, which is the defect the rule exists for.
- **A version two manifests disagree about.** `pnpm versions` runs syncpack over every
  `package.json` and over the `overrides` in `pnpm-workspace.yaml`, and prints each instance
  of the dependency beside the version it names. Make them one version. The override and the
  manifests it exists for are instances of the same dependency, so raising one alone fails.
- **The Expo SDK's own two checks.** `pnpm --filter @seatscout/native run install-check` names
  every package whose version the installed SDK does not expect, and
  `pnpm --filter @seatscout/native run doctor` runs that check beside the rest of its own.
  Move the package to the version the SDK named. Expo documents an `expo.install.exclude`
  list that holds a package back from the first check; `apps/native/package.json` carries no
  such list, because a package in it is one the SDK is no longer asked about.
- **An import cycle.** Biome's `noImportCycles` names the import that closes the loop. Move
  what both modules need into a third, or make the import `import type`, which the compiler
  erases and which the rule ignores.
- **An export with no written type.** `isolatedDeclarations` asks every export to carry a
  type a declaration emitter can write down without inferring it. Annotate the export. A
  React component that returns markup returns `ReactElement`.
- **A colour written into a screen.** `pnpm lint` runs a Grit plugin,
  `tools/lint/no-colour-literals.grit`, over `apps/native/src` except the theme and the tests. It
  refuses a string that reads as a colour in any notation. Name the colour in
  `apps/native/src/theme.ts` and read it through the theme, because a token carries both
  appearances and a literal carries one.
- **A screen that fails the accessibility audit.** After every screen test, before the screen is
  torn down, `apps/native/test/setup.tsx` runs `test/audit.ts` over everything the test rendered.
  No test opts in and none opts out. It refuses, naming the control and the criterion: words under
  4.5 to 1 against the ground drawn behind them, or 3 to 1 at 24 or at 18.66 in bold, which are
  WCAG's 18 and 14 points in the units React Native lays out in (WCAG 2.2 1.4.3);
  a chosen button, radio, tab or checkbox under 3 to 1 against its ground and its unchosen
  neighbours (1.4.11); something that can be pressed or answers touch directly with no role or no
  name, unless it is hidden from screen readers because a control beside it does the same job,
  or it only widens where a finger lands around a named control inside it (4.1.2); a control short of the platform's own touch floor, 44 pt on iOS and 48 dp on Android,
  counting its `hitSlop`, or reached through such a row around it (2.5.8, pressable words inside
  a sentence excepted as that criterion excepts them); a text field with no label (3.3.2); words with
  `allowFontScaling` off (1.4.4); and a control that changes what is chosen, or the velvet commit,
  that plays no haptic feedback when the audit presses it (Apple's Human Interface Guidelines on
  playing haptics). Fix the screen: give a control the difference as `minHeight` and `minWidth`,
  and reach feedback through `src/design-system/feedback.ts`. `test/audit.test.tsx` plants a
  violation of each rule and watches the audit refuse it.
- **The test count.** `.footprint.json` holds a floor under the tests the three runners collect,
  by their own listings rather than by a run, except Jest, which has no listing that counts tests
  without running them and so reports its run's own total; the mutation-cache guard separately
  compares each shard's Stryker initial run to the tests its own workspace holds, which is what
  `vitest list` collects under that directory, or the Jest suite's own total for the Expo app,
  and the `footprint` job holds the sum over the shards to what the two runners collect over the
  whole tree. Put the tests back, or lower the ratchet in the same diff.

Take a ratchet's new value from the `footprint` comment on the pull request rather than from a
local run: the job measures the merge of your branch with `main` rather than the branch alone,
so the bundle's bytes and the sum of the unit and end-to-end counts are what that merge weighs,
and a floor derived locally read 25 too high the moment `main` had dropped a package's tests.
`.size-limit.json` holds four ratchets over what the web app's build emits: the scripts, the
stylesheets, the woff2 faces the page preloads and the icons it names. Four more weigh what the
app's export emits: the Hermes bytecode for iOS and for Android, the web build's scripts, and
the faces and images every platform ships. The comment prints each measured figure beside its
own ratchet.

A pull request that changes what a person sees or does carries its headed pass as images or
video: drive the built tree in a real browser at a phone's size, screenshot each state the
change adds or alters, and attach them with `gh pr create --attach`, `gh pr edit --attach` or
`gh pr comment --attach`, one flag per file with alt text after a `#`, so a reviewer sees the
screen rather than reads about it. The flag needs GitHub CLI 2.99 or later.

One class of mistake in `apps/native` has no gate here, and it is written down rather than left
to be found. Raw text outside a `<Text>` element, a `StyleSheet` entry nothing uses, and a
platform component without a platform-specific filename are React Native mistakes that neither
Biome nor oxlint carries a rule for. The only published rules for them are in
[eslint-plugin-react-native](https://github.com/Intellicode/eslint-plugin-react-native), whose
maintainer states on the project page that activity is low and that new features are not being
assessed, so taking it would buy a second linter, its parser and a plugin nobody is maintaining.
It is a real hole. Read for those three by hand until something maintained covers them.

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
Open one room per `it`: what a screen test costs is the search its terms set off, and
`SMALLEST_LISTING` in `apps/web/src/terms.fixtures.ts` names the terms whose search reads the
fewest captures.

A rule is only a gate while it still refuses something, so each one is watched refusing a
fixture. `tools/planted-red` copies the fixtures under `tools/planted-red/planted` into a
git-ignored directory and runs Biome, oxlint, the compiler and jscpd over them under the
configuration this workspace ships, reading each tool's own diagnostic rather than its exit
status. Loosening a rule in `biome.json`, `.oxlintrc.json`, `.jscpd.json` or
`tsconfig.base.json` therefore fails the unit suite instead of passing quietly, and the
fixture moves in the same diff as the rule, where a reviewer sees both. The size-limit
fixtures are the exception: they carry ratchets of their own rather than the shipped ones, so
what they watch is that size-limit still refuses a file over a ratchet and still reports a
glob that reached nothing. The nine files answer in about seven seconds on two workers,
inside `pnpm test:unit`.

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

The mutation gate is one run per workspace. `stryker.shards.json` names them, and
`stryker.config.mjs` takes the one `MUTATION_SHARD` names out of that list and mutates that
workspace, and `vitest.stryker.config.ts` limits Vitest to that workspace's own tests, so a
mutant is killed by the tests that own it or by nothing. Each shard writes its own report under `reports/mutation`, each
breaks below 100, and the footprint comment prints every one of them. Vitest runs all of them
but `apps/native`, which Vitest cannot render and Stryker's Jest runner takes instead.
[ADR 12](docs/adr/0012-every-mutant-must-die.md) says why the division is by workspace, why
that shard sets `coverageAnalysis` to `off`, and what its ignore-plugin skips.

`pnpm test:mutation` judges every shard in turn, inheriting nothing and writing nothing to
inherit from, and names every shard it refused. Both scripts first refuse a list that leaves a
source file under `{apps,packages,tools}/*/src` to no shard. `pnpm test:mutation:shard <id>`
judges one incrementally, which is what each runner in CI runs. `--base` and `--head` make `pnpm footprint` compare something else, and
`--out` writes its Markdown to a file.

Both scripts run Vitest on one worker under Stryker (`VITEST_MAX_WORKERS=1`): with more, Stryker
activates a mutant in one worker while its tests run in another, and the run reports survivors
that a hand-planted mutant refutes. A scoped run by hand needs the same prefix and the shard the
files sit in: `VITEST_MAX_WORKERS=1 MUTATION_SHARD=<id> pnpm exec stryker run --incremental
--force --mutate <files>`.

Each shard's report is saved under two names, the branch's and the tree's, both carrying the
shard. A pull request merged up to date has exactly the tree main gets, so the next branch
restores the merged branch's report by main's tree hash and judges only what it changed. A cache
saved on a branch is invisible to main, so a passing shard also publishes its report as an
artifact named by the shard and the tree; the baseline job on a push downloads that artifact for
main's tree, judges the nothing that changed, and saves the seed under main, where every branch
can restore it. Its nightly schedule judges main from nothing, which is the one full run. A
pull request's shard that restores no seed at all is refused rather than left to do the same;
dispatching the Baseline on main reseeds it.

A Baseline that fails saves no seed, so it opens an issue labelled `baseline-red`, and any
green Baseline closes it. See [ADR 12](docs/adr/0012-every-mutant-must-die.md).

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
back what took effect without reading a secret. `.github/workflows/deploy.yml` releases when a
merge to `main` changes the `version` in the root `package.json`: it deploys, tags the commit
`v<version>` and publishes a GitHub release with generated notes. No other merge deploys and
there is no manual trigger; to release, bump the version in a pull request. It runs `wrangler` from the workspace so the version
that deploys is the version the lockfile pins and the dry run in `quality` already
exercised. With neither `CLOUDFLARE_API_TOKEN` nor `CLOUDFLARE_ACCOUNT_ID` set its first
step skips every step after it and says so in the run summary, so a fork gets a green build
rather than a confusing red one; with one of the two set it fails and names the other.

`.github/workflows/preview.yml` is the other thing a merge can start, and it is not a release.
A merge to `main` that changes `apps/native`, anything under `packages/`, or what the install
resolves, publishes an EAS Update to the `preview` channel, which is the channel the phones
follow. That is deliberately not the release trigger: the point of it is to see each slice on a
phone as it lands, and a release is a version the owner chose to cut. `--environment` names
which of EAS's own environments the publish reads variables from, and `eas update` has required
it since SDK 55. It publishes with `npx` at the `eas-cli` version the workflow pins, rather than
from the workspace the way `wrangler` deploys, because `eas-cli` is a publisher and not a
dependency of anything this repository builds: in the lockfile it would be installed by every
job that installs at all, and an advisory against a tool one job runs would stand in the way of
every merge. The version is a literal a reviewer sees move. It publishes with the repository
secret `EXPO_TOKEN`, a robot user holding the developer role on the account
`apps/native/app.json` names as the owner. Where
the deploy skips itself and stays green without its credentials, this job fails and names which
half is missing, because a deployment a fork never wanted is a fair thing to skip and an app
that has quietly stopped reaching the phones is not. The run's summary carries the QR code
address and the update address; `README.md` carries the same two, since neither moves between
updates, and `pnpm claims` holds the SDK they name to the one `apps/native` is on.

## Dependency updates

Dependabot opens them weekly from `.github/dependabot.yml`: one grouped pull request for the
actions and one for the minor and patch npm releases, with majors left to arrive on their
own.

`overrides` in `pnpm-workspace.yaml` is the other half of keeping dependencies honest. It
holds `react` at one version across the workspace, because a duplicate React surfaces as a
runtime hook error rather than as a build failure, and it moves with the Expo SDK rather
than with React's own releases. It also lifts three transitive dependencies past advisories
their own packages pin below: `qs` above
[GHSA-q8mj-m7cp-5q26](https://github.com/advisories/GHSA-q8mj-m7cp-5q26), which reaches the
workspace through Stryker; `uuid` above
[GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq), which reaches it
through the Xcode project parser inside Expo's config plugins; and `decode-uri-component`
above [GHSA-vcc3-ghjq-m6fr](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr), which reaches
it through the query parser inside Expo Router. Two more entries are there for reasons of
their own: `exit` is aliased to `exit-x`, because the package Jest's own runner pulls in
states its licence in npm's pre-SPDX form and so reads as undetermined, and `exit-x` is the
maintained fork Jest itself moved to; and `@types/jsdom` is held at the version matching the
`jsdom` this workspace installs, because the older types that arrive with the Jest jsdom
environment do not type-check. `pnpm versions` holds that file and every
`package.json` to one version of each dependency, so the React pin and the two apps that name
`react` cannot drift apart. `uuid` is held at 11.1.1
rather than at the newest patched release because that parser loads it with `require` and
uuid dropped its CommonJS entry point after 11. An entry is removable once the package that
pins it releases a version that does not. `pnpm why --depth=10 react` reports what is
installed rather than what was asked for.
