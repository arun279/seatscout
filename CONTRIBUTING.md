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

The pre-commit hook formats, lints, spell checks and secret scans staged files. The
pre-push hook type checks the workspace, runs unit tests, and checks for dead code.

TypeScript uses strict checking, unchecked indexed access checks, and erasable syntax.
Biome uses its recommended rules plus the published
[`noExcessiveCognitiveComplexity`](https://biomejs.dev/linter/rules/no-excessive-cognitive-complexity/)
rule and its standard limit. Unknown words go in the `words` list in `cspell.json`.

## The Core import ban

`packages/core` must stay portable to any runtime, so it may not reach for the DOM,
React, React Native, or a runtime-specific API. Two gates hold that:

- Its `tsconfig.json` sets `lib` to the language alone and `types` to nothing, so
  `document`, `window`, `console` and Node globals do not exist to it.
- A Biome `noRestrictedImports` override on `packages/core/**` rejects imports of
  `node:*`, `cloudflare:*`, React, React Native and Expo.

See [ADR 3](docs/adr/0003-separate-view-layers-shared-core.md) for why.

## Dependency updates

Renovate runs self-hosted from `.github/workflows/renovate.yml`, so a fork inherits it
without installing anything. It falls back to the workflow's own token, which cannot
update `.github/workflows` and whose pull requests do not start a CI run. Set a
`RENOVATE_TOKEN` repository secret to a personal access token with the `repo` and
`workflow` scopes to lift both limits.

This line contains a deliberate mispelling.
