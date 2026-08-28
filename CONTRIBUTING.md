# Contributing

## Prerequisites

- Node.js 24 or newer
- pnpm 11.24.0, pinned by `packageManager`
- [gitleaks](https://github.com/gitleaks/gitleaks), for the pre-commit secret scan
- [cloc](https://github.com/AlDanial/cloc), for the footprint report

Run `pnpm install` after cloning. The install registers the lefthook Git hooks.

## Quality gates

Pull requests run formatting, linting, spelling, type checking, dead-code analysis, unit
tests, the build, and the empty end-to-end harness. Run the same gates locally with:

```sh
pnpm format:check
pnpm lint
pnpm spell
pnpm typecheck
pnpm dead-code
pnpm test:unit
pnpm build
pnpm test:e2e
```

Three further jobs run alongside them. `footprint` measures the change and is described
below. `secrets` scans the pull request's commits with gitleaks. `dependencies` runs
`pnpm audit` and scans the lockfile against the OSV database; both fail on any advisory.

The pre-commit hook formats, lints, spell checks, and secret scans staged files. The
pre-push hook type checks the workspace, runs unit tests, and checks for dead code.

TypeScript uses strict checking, unchecked indexed access checks, and erasable syntax.
Biome uses its recommended rules plus the published
[`noExcessiveCognitiveComplexity`](https://biomejs.dev/linter/rules/no-excessive-cognitive-complexity/)
rule and its standard limit, which is the complexity gate. Unknown words go in the `words`
list in `cspell.json`.

## Footprint, comment load and bundle size

The `footprint` job posts one pull request comment, updated in place as commits land. It
reports lines added, removed and changed, split into product code, test code, build
tooling and comments; the comment-to-code ratio against the merge base; and the absolute
bundle size against the ratchet in `.size-limit.json`.

Two of those figures gate the merge. Comment load may not exceed the merge base, and no
bundle may exceed its ratchet. Raising a ratchet means editing `.size-limit.json`, which
is a reviewed line in the diff. No figure here is an absolute this project invented. See
[ADR 6](docs/adr/0006-gates-cite-a-standard-or-measure-a-regression.md) for why each is
shaped the way it is, and why the counter is cloc rather than scc or tokei.

Run the report locally against a built tree:

```sh
pnpm build
pnpm footprint
```

It compares `HEAD` with its merge base against `origin/main`. Pass `--base` and `--head`
to compare something else, and `--out` to write the Markdown to a file.

## The Core import ban

`packages/core` must stay portable to any runtime, so it may not reach for the DOM,
React, React Native, or a runtime-specific API. Two gates hold that.

Its `tsconfig.json` sets `lib` to the language alone and `types` to nothing, so no
runtime's globals are declared to it. `document`, `window`, `caches`, `process` and
everything else supplied by a host rather than by the language are undeclared, and using
one is a type error. Core therefore has no `fetch` either: what it needs from a host
arrives as an injected dependency typed by core itself, which is the shape that keeps it
portable.

A Biome override on `packages/core/**` then covers what the compiler cannot see.
`noRestrictedImports` rejects React, React Native, Expo, Node, Cloudflare and sibling
workspace packages. `noRestrictedGlobals` rejects the host globals by name, which matters
because a single `/// <reference lib="dom" />` re-declares the whole DOM to the compiler
and the type error disappears.

See [ADR 3](docs/adr/0003-separate-view-layers-shared-core.md) for why.

## Dependency updates

Renovate runs self-hosted from `.github/workflows/renovate.yml`, so no GitHub App has to
be installed on the repository. Its first run opens an onboarding pull request that adds
the shared configuration.

The workflow falls back to its own token, which cannot update files under
`.github/workflows` and whose pull requests do not start a CI run. Set a `RENOVATE_TOKEN`
repository secret to a personal access token with the `repo` and `workflow` scopes to
lift both limits.
