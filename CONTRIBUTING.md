# Contributing

## Prerequisites

- Node.js 24 or newer
- pnpm 11.24.0, pinned by `packageManager`
- [gitleaks](https://github.com/gitleaks/gitleaks), for the pre-commit secret scan

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

Two further jobs run alongside them. `secrets` scans the pull request's commits with
gitleaks. `dependencies` runs `pnpm audit` and scans the lockfile against the OSV
database; both fail on any advisory.

The pre-commit hook formats, lints, spell checks, and secret scans staged files. The
pre-push hook type checks the workspace, runs unit tests, and checks for dead code.

TypeScript uses strict checking, unchecked indexed access checks, and erasable syntax.
Biome uses its recommended rules plus the published
[`noExcessiveCognitiveComplexity`](https://biomejs.dev/linter/rules/no-excessive-cognitive-complexity/)
rule and its standard limit. Unknown words go in the `words` list in `cspell.json`.

## The nightly mutation gate

A test that cannot fail is worse than no test, because it reports safety it does not
provide, and nothing static tells one apart from a test that works. Mutation testing does:
it changes the code and asks whether the suite notices. `stryker.config.json` mutates every
source file under `packages/*/src` and `tools/*/src`, and `.github/workflows/nightly.yml`
fails on any mutant no test kills.

The view layers and the stateless proxy under `apps` are left out.
[ADR 3](docs/adr/0003-separate-view-layers-shared-core.md) puts everything correctness
critical in `packages`, and what is left in `apps` belongs to the end-to-end suite, which
a mutation run over the unit tests cannot stand in for.

The run is scheduled rather than attached to pull requests, and is deliberately not a
required check. It re-judges all of the code against all of the tests every time, so it
costs more than a pull request should carry and it never inherits a verdict from an
earlier run.

Run it locally with `pnpm test:mutation`. Two of its settings are less redundant than they
look. The vitest runner is named in `plugins` because Stryker resolves its own plugin
search against its package directory, which under pnpm holds no siblings to find. And
`inPlace` mutates the working tree for the length of the run rather than a copy of it,
because the copy is prepared by rewriting `tsconfig.json` through a TypeScript API that
TypeScript 7 no longer exposes. A run killed part way leaves the mutated files behind;
`git restore .` puts them back.

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

`overrides` in `pnpm-workspace.yaml` lifts a transitive dependency past an advisory its
own package pins below. It holds `qs` above
[GHSA-q8mj-m7cp-5q26](https://github.com/advisories/GHSA-q8mj-m7cp-5q26), which reaches
the workspace through Stryker. An entry is removable once the package that pins it
releases a version that does not.
