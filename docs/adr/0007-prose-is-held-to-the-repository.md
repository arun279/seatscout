# 7. Prose is held to the repository

Date: 2026-09-05

## Status

Accepted

## Context

Nothing reads a sentence. Spelling, formatting and review all pass a document whose facts
have gone, and the two ways they go are different.

A count goes stale. Four times a sentence in this repository has counted something the code
beside it had outgrown, and every one was found by a reader rather than by anything that
runs. `CONTEXT.md` said Reference penalises three things and later four while the sum
charged one more than either. `CONTRIBUTING.md` said the nightly contract test reports six
things while `Divergence` carried eight, because the ticket that added the sellability kind
stopped at the code.

A decision is falsified by a later commit and keeps its force, because nothing reads it
against the tree again. The record that said this repository does not name its upstream was
untrue from the commit that added the captured corpus, and stayed in force long enough to
put a public hostname into a repository secret and stop the nightly contract check running.

Neither failure needs a figure anyone has to choose, which is why
[ADR 6](0006-gates-cite-a-standard-or-measure-a-regression.md) does not reach these two
gates: that decision governs a gate that needs a number. The two facts a pair compares are
both in the repository. The exact checks beside these, the import ban and
`pnpm cache-storage`, sit outside ADR 6 for the same reason.

## Decision

Two gates hold prose to the tree, and each declares every pair outright: the sentence, and
the thing in the repository the sentence is about.

**`pnpm counts` holds a count stated in prose to the structure that carries the items.**
`tools/counts-in-prose/claims.ts` names the sentence and the declaration it counts. The gate
reads the number word out of the one and counts the interface fields, union alternatives,
succeeding union arms, object-literal weights, translation-table entries, hook commands or
configuration keys of the other, and fails when the two disagree.

`Format` is why the pairs reach the domain's closed sets: it was the one closed set with no
pair, and it is the one that went stale, at five names in `CONTEXT.md` against fifteen in
the union.

**`pnpm claims` holds a claim this repository's own documents make about it to the
repository itself**, over `docs/adr/`, `CONTEXT.md` and `README.md`.
`tools/claims-in-prose.pairs.mjs` names the sentence and the search that holds it. A claim is
one search, how many tracked files under these paths hold this fixed string, and the declared
number is what the record says.

Two rules keep that from being decoration. Every record is classified, with pairs or with a
stated reason it can carry none, so a new one fails until somebody decides which it is. And
a claim expecting no match names where the same pattern must still be found, because a
search that finds nothing because the name is misspelled or the directory was renamed looks
exactly like a search that finds nothing because the claim holds. That witness has to sit
outside the prose making the claim, which the first one written here did not: it pointed at
`docs/adr/`, where the sentence making the claim lives, so a pattern misspelled in both would
have passed as a claim that held. Where no independent witness exists, the honest pair is a
positive one over the thing that is there, and where there is neither there is no pair, which
is why `CONTEXT.md` and `README.md` carry none: what a command can hold in either is a count,
and a count belongs to the gate built for one.

Every search excludes the gate's own two modules, because a pattern written down in order to
be searched for is not an occurrence of the thing. The gate found that on its own first run,
having reported its own source as evidence that the toolchain still named `scc`.

Both fail just as loudly when the sentence has been reworded out from under them, when the
declaration has been renamed, and when a declaration is spelled in a way the gate cannot
read, because a pair that quietly stops matching is a pair that has stopped holding.

## Consequences

Rewording one of those sentences costs a line in the declaration too, which is the trade the
bundle ratchet already makes: the number moves in a diff a reviewer reads. Adding a record
costs a line as well, because an unclassified one fails the gate.

Two limits are worth having in front of you rather than discovering. A count written
tomorrow is unguarded until it is declared, and nothing forces the declaration. And each
pair compares the numeral and nothing else, so a sentence that states the right count over a
list one item short still passes; the gate stops a count going stale and does not stop an
enumeration going short.

The rule that makes the witness necessary generalises past this gate, and a reader will meet
it elsewhere. An answer of "not found" is only evidence when the query could have found the
thing. This repository's protected branch returns 404 from the legacy branch-protection
endpoint and has been protected by a ruleset since the day the workspace was set up, so a
check that asked the first endpoint would report the branch unprotected and be wrong. Ask an
endpoint that returns the whole set, require it to be non-empty, and treat any non-2xx as a
failure rather than as a zero.
