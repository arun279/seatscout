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
any worktree registration whose directory has gone.

## Read these first

[CONTEXT.md](CONTEXT.md) is the domain vocabulary. Code, tests, types and commit messages
use those words and no synonyms, so a word that feels wrong is changed there before it is
changed anywhere else.

[docs/adr](docs/adr) records the decisions the code rests on, one to a file. Anything here
that looks arbitrary is explained in one of them.

## Running it

```sh
pnpm build
pnpm --filter @seatscout/native start
```

Expo prints a URL; open it in Expo Go. `/ios` and `/android` are ignored because
`expo prebuild` generates them. A phone that cannot reach this machine opens the
published update instead; `README.md` says how. `pnpm test:unit` is Vitest over everything
that runs in Node. `pnpm test:native` is Jest over the Expo app, once as iOS and once as
Android.

## Before you push

The `quality` job runs this list, in this order. Run all of it: a shorter list that passes
is how a pull request arrives red.

```sh
pnpm format:check
pnpm lint
pnpm complexity
pnpm duplication
actionlint
shellcheck apps/native/e2e/*.sh
pnpm spell
pnpm typecheck
pnpm dead-code
pnpm versions
pnpm --filter @seatscout/native run install-check
pnpm --filter @seatscout/native run doctor
pnpm --filter @seatscout/native run bundle
pnpm test:e2e
pnpm --filter @seatscout/native run weigh
pnpm counts
pnpm claims
pnpm test:unit
pnpm test:native
pnpm build
```

`pnpm test:e2e` serves the web build the bundle step wrote and scans every screen with axe,
so it runs between `bundle` and `weigh`, which overwrites that directory.

## What runs when

- **On commit.** The pre-commit hook runs five checks over staged files, as `lefthook.yml`
  declares.
- **On every push to a pull request, draft or not.** `changes`, `quality`, `secrets` (gitleaks)
  and `dependencies` (OSV advisories and licences).
- **Once it is ready for review, and on every push after.** `mutation`, over the source files
  the change touches; `measure`, the footprint; and, when the change touches the app, `android`
  (the journey walked on an emulator) and `performance` (Reassure against main as the change merges into it).
  `footprint` then posts one comment and refuses the change if any job failed.
- **On main, after a merge.** The fast jobs again over the merged result; Baseline, which reads
  the walk with Flashlight against the previous run; and, when the app changed, an EAS Update
  to the `preview` channel the phones follow.
- **Nightly.** `contract.yml` reads the real Source and opens an issue on what it finds.

A branch need not be up to date with `main`: every pull request run already tests it merged
onto `main`.

## When a gate refuses

Each gate has one way through, except the bundle gate, which the `bundle-grows` label can pass.
The record that says why is linked.

- **Complexity.** Extract part of the function. ([ADR 6](docs/adr/0006-gates-cite-a-standard-or-measure-a-regression.md))
- **File length.** Split the file. ([ADR 6](docs/adr/0006-gates-cite-a-standard-or-measure-a-regression.md))
- **A comment.** Say it in the code, or raise the ratchet in `.footprint.json` in the same diff. ([ADR 6](docs/adr/0006-gates-cite-a-standard-or-measure-a-regression.md))
- **The test count.** Put the tests back, or lower the floor in `.footprint.json` in the same diff. ([ADR 6](docs/adr/0006-gates-cite-a-standard-or-measure-a-regression.md))
- **Duplicated code.** Take the duplication out; jscpd names both files. ([ADR 6](docs/adr/0006-gates-cite-a-standard-or-measure-a-regression.md))
- **A bundle bigger than on main, or a change to what `.size-limit.json` weighs.** Make the bundle smaller, or add the `bundle-grows` label where a reviewer sees it and run the failed jobs again. No label passes a job that could not weigh; the footprint comment says why. ([ADR 6](docs/adr/0006-gates-cite-a-standard-or-measure-a-regression.md))
- **A count or a claim in prose.** Correct the sentence or the tree, then its pair in `tools/counts-in-prose/claims.ts` or `tools/claims-in-prose.pairs*.mjs`; a new ADR needs a pair or an entry in `tools/claims-in-prose.unchecked.mjs`. ([ADR 7](docs/adr/0007-prose-is-held-to-the-repository.md))
- **An unknown word.** Add it to `words` in `cspell.json`; `flagWords` has no remedy. ([ADR 8](docs/adr/0008-guarantees-are-made-at-compile-time.md))
- **A collected response.** Read each body inside the callback that fetched it. ([ADR 2](docs/adr/0002-computation-on-the-client.md))
- **A colour written into a screen.** Name it in `apps/native/src/theme.ts` and read it through the theme. ([ADR 6](docs/adr/0006-gates-cite-a-standard-or-measure-a-regression.md))
- **An id written as a literal, or one two elements share.** Build the id from React's `useId`. ([ADR 6](docs/adr/0006-gates-cite-a-standard-or-measure-a-regression.md))
- **An import cycle.** Move what both modules need into a third, or make the import `import type`. ([ADR 6](docs/adr/0006-gates-cite-a-standard-or-measure-a-regression.md))
- **An export with no written type.** Annotate it; a component returns `ReactElement`. ([ADR 6](docs/adr/0006-gates-cite-a-standard-or-measure-a-regression.md))
- **An undeclared import.** Add the package to the nearest `package.json`, at the version the workspace already uses. ([ADR 6](docs/adr/0006-gates-cite-a-standard-or-measure-a-regression.md))
- **Two versions of one dependency.** Make them one, overrides included. ([ADR 6](docs/adr/0006-gates-cite-a-standard-or-measure-a-regression.md))
- **The Expo SDK's checks.** Move the package to the version the SDK names. ([ADR 6](docs/adr/0006-gates-cite-a-standard-or-measure-a-regression.md))
- **An advisory.** Update the package, or pin the fix under `overrides` in `pnpm-workspace.yaml`; with no fix, add it to `osv-scanner.toml` with the reason and an `ignoreUntil` about a month out. ([ADR 6](docs/adr/0006-gates-cite-a-standard-or-measure-a-regression.md))
- **A licence.** Add the SPDX identifier to the allowlist in `.github/workflows/ci.yml` in the same diff; `UNKNOWN` may never be added, so replace that dependency. ([ADR 6](docs/adr/0006-gates-cite-a-standard-or-measure-a-regression.md))
- **The accessibility audit or the axe scan.** Fix the screen; the failure names the control and the criterion it breaks. ([ADR 6](docs/adr/0006-gates-cite-a-standard-or-measure-a-regression.md))
- **A render regression.** Make the screen render as it did, or say in the pull request what the change buys. ([ADR 6](docs/adr/0006-gates-cite-a-standard-or-measure-a-regression.md))
- **A surviving mutant.** Add the assertion that kills it. ([ADR 12](docs/adr/0012-every-mutant-must-die.md))

Take a ratchet's new value from the `footprint` comment, not from a local run: the job
measures your branch merged with `main`.

A pull request that changes what a person sees carries its headed pass as images or video,
attached with `gh pr create --attach` (GitHub CLI 2.99 or later).

No gate covers raw text outside `<Text>`, an unused `StyleSheet` entry, or a platform component
without a platform filename: the only rules for them are in
[eslint-plugin-react-native](https://github.com/Intellicode/eslint-plugin-react-native), whose
maintainer says activity is low.
Read for those three by hand.

## Writing tests

Do the work of a test inside the test. A fixture derived at module scope hides mutants.

Keep a hot test well under Vitest's default timeout. A dry-run timeout on a test nobody
edited means its work has to be divided, not the timeout raised. Open one room per `it`.

Each rule is watched refusing a fixture: `tools/planted-red` runs Biome, oxlint, the compiler,
jscpd and size-limit over the files under `tools/planted-red/planted`. Loosening a rule fails the
unit suite, so the fixture moves in the same diff as the rule. The fourteen test files in
`tools/planted-red/src` answer in under half a minute on two workers, inside `pnpm test:unit`.

Substitute at `fetch`, never at the Source port. `fakeUpstream` in
`packages/core/src/testing/fake-upstream.ts` replays the captured corpus by route and scripts
faults. ([ADR 10](docs/adr/0010-the-corpus-is-the-contract.md))

## Mutation by hand

`pnpm test:mutation` judges every shard over the whole tree. To judge your own change, name
the lines: `node tools/mutation.mjs --shard <id> --files <file>:<start>-<end>`.
`stryker.shards.json` names the shards, and [ADR 12](docs/adr/0012-every-mutant-must-die.md)
says how they are divided and run. Run Vitest on one worker under Stryker
(`VITEST_MAX_WORKERS=1`), or the run reports survivors that are not there.

## The footprint report

`pnpm footprint` compares `HEAD` with its merge base against `origin/main`, and weighs the
app's export against main's export in the tree `--main-tree` names. CI exports both. By hand,
export main the same way in a second worktree, then run `pnpm build`,
`pnpm --filter @seatscout/native run weigh` and `pnpm footprint --main-tree <main's worktree>`.
`--base`, `--head` and `--out` change what it compares and where it writes.

## Refreshing the corpus

`pnpm corpus:refresh --zip <postal code>` replaces every capture under
`packages/core/src/corpus`. It makes about fifty requests half a second apart, so it never
runs in CI or a test. A refresh may widen `SPAN_THE_CAPTURE_REACHED` in `captures.test.ts`
and may not narrow it; the tallies in `seat-map.test.ts` and in
[ADR 10](docs/adr/0010-the-corpus-is-the-contract.md) move with it.

## The live checks

`pnpm test:live` reads the real Source and needs nothing configured. It never gates a pull
request; `.github/workflows/contract.yml` runs it nightly and opens an issue on what it
finds. See [ADR 11](docs/adr/0011-a-nightly-reading-judges-the-world.md).

## Publishing

`.github/workflows/preview.yml` is the one thing a merge can start, and it is not a release.
A merge to `main` that changes `apps/native`, anything under `packages/`, or what the install
resolves, publishes an EAS Update to the `preview` channel, which is the channel the phones
follow. That is deliberately not the release trigger: the point of it is to see each slice on a
phone as it lands, and a release is a version the owner chose to cut. `--environment` names
which of EAS's own environments the publish reads variables from, and `eas update` has required
it since SDK 55. It publishes with `npx` at the `eas-cli` version the workflow pins, rather than
from the workspace, because `eas-cli` is a publisher and not a
dependency of anything this repository builds: in the lockfile it would be installed by every
job that installs at all, and an advisory against a tool one job runs would stand in the way of
every merge. The version is a literal a reviewer sees move. It publishes with the repository
secret `EXPO_TOKEN`, a robot user holding the developer role on the account
`apps/native/app.json` names as the owner. Without its credentials this job fails and names
which half is missing, because an app that has quietly stopped reaching the phones is not a
thing to skip. The run's summary carries the QR code
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
maintained fork Jest itself moved to; and `@types/jsdom` is held at 30.0.0, because the version 20
types `jest-expo` brings with the Jest jsdom environment do not type-check, which
`pnpm typecheck` shows the moment the entry is removed. `pnpm versions` holds that file and every
`package.json` to one version of each dependency, so the React pin and the app that names
`react` cannot drift apart. `uuid` is held at 11.1.1
rather than at the newest patched release because that parser loads it with `require` and
uuid dropped its CommonJS entry point after 11. An entry is removable once the package that
pins it releases a version that does not. `pnpm why --depth=10 react` reports what is
installed rather than what was asked for.
