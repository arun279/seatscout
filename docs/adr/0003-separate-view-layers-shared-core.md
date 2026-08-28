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
