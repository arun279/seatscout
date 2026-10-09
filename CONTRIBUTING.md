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
- **On every push to a pull request, draft or not.** The fast jobs: `changes`, `quality`,
  `secrets` (gitleaks) and `dependencies` (OSV advisories and licences). Then `footprint` posts
  one comment saying what every job did, and refuses the change if any job failed.
- **Once the pull request is ready for review, and on every push after.** `mutation`, over the
  source files the change touches, and `measure`, which weighs the change for the footprint
  comment. When the change touches the app, also `android`, which walks the journey on an
  emulator, and `performance`, which runs Reassure against main as the change merges into it.
- **On main, after a merge.** The fast jobs again, over the merged result. Baseline, which
  reads the walk with Flashlight and holds it to the previous run. When the app changed, the
  publish described under Publishing.
- **Nightly.** The live checks below.

A branch need not be up to date with `main`: every pull request run already tests it merged
onto `main`.

## When a gate refuses

Each gate below says what to change when it refuses.
[ADR 6](docs/adr/0006-gates-cite-a-standard-or-measure-a-regression.md) says why each is built
as it is. Where another record explains a gate, the item links it.

- **Formatting.** Run `pnpm format`.
- **Complexity.** Extract part of the function.
- **File length.** Split the file.
- **Duplicated code.** Take the duplication out. jscpd names both files.
- **A workflow or a shell script.** Fix what actionlint or shellcheck names.
- **An unknown word.** Add it to `words` in `cspell.json`. Some words are banned outright in
  `flagWords`, such as the comment that turns off type checking for a whole file. Write
  `@ts-expect-error` on the one line instead.
  ([ADR 8](docs/adr/0008-guarantees-are-made-at-compile-time.md))
- **A type error.** Fix the type. A type assertion and a line-wide suppression are refused too.
  ([ADR 8](docs/adr/0008-guarantees-are-made-at-compile-time.md))
- **Dead code.** Use or delete the file, export or dependency that knip names.
- **Two versions of one dependency.** Make them one, overrides included.
- **The Expo SDK's checks.** Move the package to the version the SDK names.
- **A collected response.** Read each body inside the callback that fetched it.
  ([ADR 2](docs/adr/0002-computation-on-the-client.md))
- **A colour written into a screen.** Name it in `apps/native/src/theme.ts` and read it through
  the theme.
- **An id written as a literal, or one two elements share.** Build the id from React's `useId`.
- **An import cycle.** Move what both modules need into a third, or make the import
  `import type`.
- **An export with no written type.** Annotate it. A component returns `ReactElement`.
- **An undeclared import.** Add the package to the nearest `package.json`, at the version the
  workspace already uses.
- **A retried or concurrent test in the app.** Remove `jest.retryTimes` or `.concurrent`.
  ([ADR 12](docs/adr/0012-every-mutant-must-die.md))
- **A call at a test file's top level.** Make the call inside each test, or keep the value as
  plain data. ([ADR 12](docs/adr/0012-every-mutant-must-die.md))
- **The accessibility audit or the axe scan.** Fix the screen. The failure names the control
  and the criterion. Give a control below the touch floor the difference as `minHeight` and
  `minWidth`, and play haptic feedback through `src/design-system/feedback.ts`.
- **A count or a claim in prose.** Correct the sentence or the tree, then its pair in
  `tools/counts-in-prose/claims.ts` or `tools/claims-in-prose.pairs*.mjs`. A new ADR needs a
  pair, or an entry in `tools/claims-in-prose.unchecked.mjs`.
  ([ADR 7](docs/adr/0007-prose-is-held-to-the-repository.md))
- **A secret.** Rewrite the branch so that no commit holds it, and revoke it, since it has
  been pushed. gitleaks reads every commit on the branch, not only the last.
- **An advisory.** Update the package, or pin the fix under `overrides` in
  `pnpm-workspace.yaml`. With no fix, add it to `osv-scanner.toml` with the reason and an
  `ignoreUntil` about a month out.
- **A licence.** Add the SPDX identifier to the allowlist in `.github/workflows/ci.yml` in the
  same diff. `UNKNOWN` may never be added, so replace that dependency.
- **A surviving mutant.** Add the assertion that kills it.
  ([ADR 12](docs/adr/0012-every-mutant-must-die.md))
- **A mutant Stryker could not judge.** The job names the mutant and its whole error. Most
  often a test file computed a value at load, so move that work into each test.
  ([ADR 12](docs/adr/0012-every-mutant-must-die.md))
- **The walk on the emulator.** The job log names the step that found nothing, and the
  `device` artifact holds what Maestro wrote of the walk. Fix the screen, or change
  `apps/native/e2e/journey.yaml` in the same diff if the journey changed on purpose.
- **A render regression.** Make the screen render as it did. The `performance` comment names
  the scenarios that moved.
- **A comment.** Say it in the code, or raise the comment ratchet in `.footprint.json` in the
  same diff.
- **The test count.** Put the tests back, or lower the floor in `.footprint.json` in the same
  diff. Take the new floor from the `footprint` comment, not from a local run: the job counts
  the tests in your branch merged with `main`.
- **A bundle bigger than on main, or a change to what `.size-limit.json` weighs.** Make the
  bundle smaller, or add the `bundle-grows` label where a reviewer sees it and run the failed
  jobs again. If the job could not weigh at all, the `footprint` comment says why, and the
  label does not help.
- **A worse Baseline reading on main.** If the change was meant to cost it, such as a new
  screen in the walk, run Baseline on main from the Actions tab with `accept` set to the
  reason.

No gate covers words outside `<Text>`, a `StyleSheet` entry nothing uses, or a platform
component in a file without a platform suffix. Read for those three by hand. ADR 6 says why
there is no gate.

## Showing a change

A pull request that changes what a person sees carries its headed pass as images or video.
Run the app on a phone or a simulator and screenshot each state the change adds or alters.
Refer to each file in the body by the path you attach it from, then attach them:

```sh
gh pr edit <number> --body-file body.md --attach 'ask.png#The Ask sheet with two films chosen'
```

Pass one `--attach` per file, with its alt text after the `#`. `gh pr create` and
`gh pr comment` take the same flag. It needs GitHub CLI 2.99 or later.

## Writing tests

Do the work of a test inside the test. A fixture built at module scope hides mutants.
([ADR 12](docs/adr/0012-every-mutant-must-die.md))

Keep each test's work well under Vitest's default five-second timeout. Under Stryker, a test
runs slower by an amount that depends on files it never touches. So if a test nobody edited
times out in a mutation run's first pass, before any mutant, split its work rather than raise
its timeout. Open one room per `it`: what a screen test costs is the search its terms set off.

Each rule is watched refusing a fixture under `tools/planted-red/planted`. Loosening a rule
fails `pnpm test:unit`, so move its fixture in the same diff.
([ADR 6](docs/adr/0006-gates-cite-a-standard-or-measure-a-regression.md))

Substitute at `fetch`, never at the Source port. `fakeUpstream` in
`packages/core/src/testing/fake-upstream.ts` replays the captured corpus by route and scripts
faults. ([ADR 10](docs/adr/0010-the-corpus-is-the-contract.md))

## Mutation by hand

`pnpm test:mutation` judges every shard over the whole tree. To judge your own change, name
the lines: `node tools/mutation.mjs --shard <id> --files <file>:<start>-<end>`.
`stryker.shards.json` names the shards, and [ADR 12](docs/adr/0012-every-mutant-must-die.md)
says how they are divided and run. Run Vitest on one worker under Stryker
(`VITEST_MAX_WORKERS=1`), or the run reports survivors that are not there.

A mutant's run in the app stops at its first failing test and skips the rest, so a killed
mutant's log shows one failure. ([ADR 12](docs/adr/0012-every-mutant-must-die.md))

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

A merge to `main` that changes the app, a package or what the install resolves publishes an
EAS Update to the `preview` channel the phones follow. It is not a release. The job needs the
repository secret `EXPO_TOKEN`, and fails if it is missing or refused. To move the publisher,
change the `eas-cli` version `.github/workflows/preview.yml` pins.
[ADR 21](docs/adr/0021-a-merge-publishes-a-preview-not-a-release.md) says why it works this
way.

## Dependency updates

Dependabot opens one grouped pull request a week for the actions, and one for minor and patch
npm releases. It leaves alone what the Expo SDK pins; `npx expo install --fix` moves those
together at an SDK upgrade, as `.github/dependabot.yml` says.

[ADR 6](docs/adr/0006-gates-cite-a-standard-or-measure-a-regression.md) gives the reason for
each entry under `overrides` in `pnpm-workspace.yaml`. Add the reason there with a new entry,
and remove an entry once the package that pins it releases a version that does not.
`pnpm why --depth=10 <package>` reports what is installed rather than what was asked for.
