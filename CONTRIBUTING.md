# Contributing

## Prerequisites

- Node.js 24 or newer
- pnpm 11.24.0, pinned by `packageManager`

Run `pnpm install` after cloning. The install registers the lefthook Git hooks.

## Quality gates

Pull requests run formatting, linting, type checking, unit tests, the build, and the
empty end-to-end harness. Run the same gates locally with:

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm build
pnpm test:e2e
```

The pre-commit hook formats and lints staged files. The pre-push hook type checks the
workspace and runs unit tests.

TypeScript uses strict checking, unchecked indexed access checks, and erasable syntax.
Biome uses its recommended rules plus the published
[`noExcessiveCognitiveComplexity`](https://biomejs.dev/linter/rules/no-excessive-cognitive-complexity/)
rule and its standard limit.
