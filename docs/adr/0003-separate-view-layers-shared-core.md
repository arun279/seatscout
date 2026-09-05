# 3. Separate web and native view layers over a shared core

Date: 2026-08-22

## Status

Accepted

## Context

The first release is a mobile oriented progressive web app. Native applications are a
likely follow on, and should not require rewriting the product.

The usual answer is a universal codebase: write once with React Native primitives and
render to web, iOS, and Android from one view layer. This avoids writing screens twice.

Two findings ruled it out.

The library that renders React Native primitives to the web is publicly unmaintained in
any meaningful sense. Its author and principal maintainer has stated in its own repository
that there is no investment in it from either the web or the React Native teams at its
sponsoring company, and that he does not expect to put significant time into major
development.

Its intended successor is thinly staffed. Its lead maintainer left the sponsoring company,
the internal product that funded it wound down, and contributions sat unreviewed for
roughly six months before another engineer took over. Decisively for this application, a
maintainer stated that SVG support is unlikely to be added because of its rendering cost.

The seat map is an SVG of several hundred interactive nodes and is the central screen of
the product. The successor library cannot render it, and the incumbent is not being
invested in.

React Native and its tooling remain healthy for native targets. The weakness is specific
to the layer that renders native primitives onto the web, which is precisely the layer a
universal codebase would depend on for the first release.

Choosing a universal codebase would therefore mean building the first release on the
weakest available foundation, in order to save effort on applications that do not yet
exist.

## Decision

Split by layer rather than by platform.

```
packages/core     domain model, source adapters, seat normalisation, scoring,
                  filter engine. Plain TypeScript. No DOM, no React, no React Native.
packages/client   query orchestration, on device cache, streaming fan out.
                  Depends only on fetch.
apps/web          React and Vite. The progressive web app.
apps/proxy        the stateless proxy.
apps/native       React Native. Imports core and client unchanged.
```

`core` and `client` are shared without modification. Only the view layer is written per
platform.

## Consequences

Everything expensive and everything correctness critical is written once. The duplicated
surface is screens and components.

The web application uses the web's own primitives, so the seat map is a real SVG and
gestures use the browser's own input handling.

A native application uses native primitives, so its gestures and navigation are native
rather than approximations.

Screens are written twice. This is accepted deliberately: the seat map is the component
where a shared implementation would compromise most, because the web and native
approaches to rendering and gesture handling differ in ways that a common abstraction
would have to paper over.

`core` must stay free of platform imports for this to hold. That constraint is enforced
by dependency rules in the build, not by convention.

### How the ban is enforced

Everything under `packages/` must stay portable to any runtime, so it may not reach for the
DOM, React, React Native, or a runtime-specific API. `packages/client` runs unchanged in a
native runtime that has no Web Storage. Two gates hold that for both packages.

Each package's `tsconfig.json` sets `lib` to the language alone and `types` to nothing, so no
runtime's globals are declared to it. `document`, `window`, `caches`, `process` and everything
else supplied by a host rather than by the language are undeclared, and using one is a type
error. Neither package has a `fetch` either: what they need from a host arrives as an injected
dependency typed by core itself, which is the shape that keeps them portable.

A Biome override on `packages/**` then covers what the compiler cannot see.
`noRestrictedImports` rejects React, React Native, Expo, Node and Cloudflare, and a second
override restates that same list and adds sibling workspace packages for `packages/core`,
which reaches none. It restates rather than extends because Biome replaces a rule's options
rather than merging them, so a pattern added to one list has to be added to the other.
`noRestrictedGlobals` rejects the host globals by name, which matters because a single
`/// <reference lib="dom" />` re-declares the whole DOM to the compiler and the type error
disappears. It matches a bare identifier and nothing else, so `globalThis.document` walked
past a ban on `document`, and the list therefore carries every name that denotes the global
object as well: `globalThis`, Node's `global`, and the DOM's `frames`, `opener`, `parent` and
`top`, beside the `self` and `window` already on it. `Function` is there for the same reason,
because `Function("return document")` hands one back without naming it.

That closes the reach through a *named* global object completely, and not only its member
form. `const held = globalThis`, the destructured `const { document } = globalThis`,
`Reflect.get(globalThis, "document")` and a computed key held in a variable are all refused at
the name, because none of them can be written without first naming the object. The rule
resolves scopes, so a local or a parameter borrowing one of those names is untouched: the
`window` that `seat-group.ts` gives each party-sized slice of a run still compiles, and so
does the `top` in `seat-profile.fixtures.ts`.

**What it does not close is a receiver that is never named**, and a plugin refusing the member
instead was written and measured before being dropped. Two findings decided that. A member
pattern cannot see `Function("return document")()`, which has no member. And it fires on
honest code, because `document`, `location` and `process` are ordinary words:
`theater.location` and the pure type `Theater["location"]` were both refused by it, and a type
cannot reach a capability at all. A rule that refuses honest domain code is a rule that gets
weakened, so the ban stops at the name.

**A third finding was recorded and its generalisation is wrong**: that Biome's GritQL has no
pattern for an optional chain. It has one. What was actually measured is narrower and is true:
a metavariable in the property position after `?.` does not compile, so a pattern naming the
property with a metavariable fails the plugin to load rather than silently matching nothing. A
ban on the twenty two names would therefore have needed one literal alternative per name
instead of one pattern, which is a cost rather than a ceiling. The two findings above decide
the question without it, but the correction is not free elsewhere: it is why the response-body
rule could be repaired rather than only noted.

The compiler is what makes bare names unreachable, and it is the real gate. This half is a
second layer over the one route the compiler cannot see, a `lib` reference that re-declares the
DOM, and it is deliberately not airtight. Reaching a host global through a function built by
`(() => {}).constructor("return document")`, or through a name introduced by
`declare const document: { title: string }`, is refused by neither half and is known open.
Neither is reachable by accident, and both are plain in review.

Tests are compiled by a project of their own in each package. `tsconfig.json` excludes the test
and fixture suffixes and `tsconfig.test.json` takes them, with the language's default libraries
and no emit, because the test runner's declaration files reference `setTimeout`, `AbortSignal`
and other host globals that neither package has and that cannot be checked under its `lib`.
Both projects are referenced from the root, so test code is type checked rather than skipped,
and the Biome override still covers all of `packages/`: a `document` in a test is a lint error
where it is no longer a type error. The live tests are why the split matters here rather than
only in principle: one of them reaches the real Source through the host's own `fetch`, which
satisfies the port structurally and is nameable in the test project alone.

### Where a platform adapter lives

Per-platform adapters belong to the per-platform unit, which is what this decision already
says about view layers. `apps/web/src/store.ts` is the Web Storage adapter for that reason:
Core may not reach for `localStorage`, and `packages/client` may not either. The web
application's entry publishes it alongside the two start functions, and that entry is what the
bundler is given and what the deployment therefore holds.

`tsc` type checks `apps/web` twice rather than once, because a service worker and a page cannot
share a library: one project covers the page under the DOM, and another covers the worker and
its cache under `WebWorker`. Neither emits; Vite does that. Their build info sits beside the
project rather than in `dist`, which the bundler empties on every run.

`packages/client` compiles against Core's own sources rather than through a project reference,
and Core publishes two entry points to make that legible: the package itself and its testing
entry, which is the fake upstream the client's tests substitute at. A project reference would be
the conventional wiring and cannot be used here, because `tsc --build --noEmit`, which is what
`pnpm typecheck` runs, refuses a referenced project that disables emit. What a package's entry
exports is held to what another package imports, which is the rule that keeps Core's entry from
listing everything under `src`.

### What the native application's own configuration is for

`apps/native` is an Expo application that renders its own name and carries no product
behaviour, so nothing in the workspace depends on it. Four lines of its configuration are
worth a reason, because each of them looks removable and is not.

**`lib` is `["ES2024"]`** because React Native is not a DOM host and declares its own `fetch`,
`URL`, `Blob` and `FormData`. Leaving the compiler's default in place puts `lib.dom.d.ts`
beside those declarations and produces 69 collisions between the two, across duplicate
identifiers, mismatched property and variable declarations, and differing modifiers.

**`skipLibCheck` is on** because `expo-asset` ships a declaration file importing a type from
`@react-native/assets-registry`, which publishes no types before 0.87 and cannot be raised to
it: 0.87 deprecated the package and its `registry.js` now re-exports `AssetRegistry` from
`react-native`, which the pinned version does not have, so raising it type checks and then
fails at run time. Neither option covers for the compiler version, since with the DOM library
removed React Native's own declarations check clean.

**`updates.enabled` is `false` in `app.json`** because over-the-air updates are deferred and
`expo-updates` is not installed. Expo's updates system is on by default, so leaving the key out
would state that the application updates itself through a library it does not have, which is
the disagreement knip's Expo plugin reports.

**There is no `metro.config.js`, and its absence is the decision.** Expo has configured Metro
for monorepos since SDK 52 and has resolved autolinked modules against the workspace since SDK
55, so a file here would be one more thing to keep in step with the SDK. Core and the client
reach this application with no project reference, no resolver entry and nothing relaxed in the
ban above. It depends on neither package today, and knip removes a dependency nothing imports.

Its versions are not chosen here either. Expo publishes the React and React Native version each
SDK pins and this application matches its SDK exactly, which is what the `react` entry in
`pnpm-workspace.yaml` moves with rather than with React's own releases. `CONTRIBUTING.md` says
what that entry is for.
