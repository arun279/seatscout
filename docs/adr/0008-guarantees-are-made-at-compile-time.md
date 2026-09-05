# 8. A guarantee is made at compile time where one can be

Date: 2026-09-05

## Status

Accepted

## Context

Most of what this application must not do is something a contributor could write in ordinary
code without noticing: constructing a ticketing URL, ordering Seats by a printed label,
reading a seat count the upstream disagrees with itself about, writing a Seat to the device
store, naming an upstream response shape above the adapter that parses it.

A comment asking for none of that is worth nothing. A lint rule is worth more and can be
suppressed. A type that cannot hold the wrong value is worth most, and it costs nothing at
run time.

## Decision

Where a rule can be made a compile error, it is, and the techniques are these.

**A brand.** An identity is declared as the type of the field of the payload that carries it,
so parsing a response is the only way to obtain one. `ShowtimeId`, `TheaterId`, `MovieId` and
`TicketingUrl` are minted that way and no other. A `string` is not one of them.

**A declaration that is also a deny list.** `packages/core/src/corpus/types.ts` states what
may be read from a capture, `UpstreamSeat` and `UpstreamShowtime` state what may be read from
an answer, and a field left out of one of them cannot be read anywhere. Where a table has to
stay in step with such a declaration it is keyed by `keyof` that declaration, so a field
added to the one and not the other does not compile.

**A function generic over what it is handed.** `normalised` takes anything carrying `x`, `y`
and `width`, so a Seat's printed label is not nameable inside it and ordering by one is a
compile error rather than a convention.

What protects the technique is the checks that can see the ways past a type, because nothing
else can. `noUnsafeTypeAssertion` refuses a type assertion in both spellings, `as`
and the angle-bracket form, while `as const` is not an assertion in that sense and stays
allowed. The rule is Biome's own rather than a plugin because Biome has one, which is the
order to try them in; a plugin was written first and deleted on finding it. It sits in
`nursery`, and if a version bump ever renames it, Biome refuses an unknown rule key and exits
non-zero, so the gate cannot quietly stop gating. The `flagWords` list in `cspell.json`
refuses the file-wide TypeScript suppression directive, which switches a whole file's
checking off and is wider than anything `noUnsafeTypeAssertion` refuses; `noTsIgnore` refuses
the line-wide one, and `@ts-expect-error` is what to write instead, since it fails once the
error it names is gone. Spelling is checked over every tracked file, so that ban reaches
build tooling as well as sources.

The compiler is configured to make all of it bite: strict checking, unchecked indexed access
checks, and erasable syntax.

## Consequences

What is left is a reviewed line in a diff. A type predicate that claims a brand it did not
parse, a suppression, a widening of a brand, or a `declare` that conjures a value of the type
would each work, and each is visible. A predicate cannot be refused outright, because it is
how a brand is minted in the first place: the catalogue parser's `carries` narrows a response
to a declaration whose field is already a `TicketingUrl`, and a rule against that would be a
rule against parsing.

The property is that no ordinary code path reaches the thing, not that a determined author
cannot. That is also true of the import ban's known-open routes in
[ADR 3](0003-separate-view-layers-shared-core.md) and of the reach check in
[ADR 13](0013-only-the-catalogue-is-cached.md), which reads source text precisely because
what it refuses cannot be made a type error.

The workspace holds no type assertion at all, which is what
[ADR 4](0004-booking-ends-at-a-deep-link.md) rests on: a constructed ticketing URL is a
`string`, a `string` is not a `TicketingUrl`, and an assertion is what would have got past
that.
