# 17. Retry and the circuit breaker follow published policy

Date: 2026-09-05

## Status

Accepted

## Context

One Source supplies almost everything, so how this application behaves when that Source
falters is most of how it behaves when anything goes wrong. A retry policy invented here
would be four numbers nobody could argue with and nobody could defend, and the shape of the
mistake is well known: retries that synchronise, a breaker that never opens, or one that
opens on the first blip.

The obvious answer is a library. The circuit breakers currently published for this ecosystem
count failures as a ratio over a sampling window, and their minimum throughput is a hundred
calls. A whole search here is forty eight.

## Decision

Both policies are taken from a published source, both are one replaceable policy in the
adapter, and every default cites a published figure or a measurement of the aggregator.

**Retry is the "Full Jitter" of the AWS Architecture Blog's
[Exponential Backoff And Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)**:
each delay is drawn uniformly from zero up to a window that doubles after every failed
attempt. Full rather than Equal Jitter, because that post's own simulation puts it ahead on
both client work and completion time, and a test asserts the delay can reach zero, which is
the difference between the two. The cap in the published formula is not implemented, because
at three attempts the window never reaches one.

**The breaker is the three states of Nygard's *Release It!***, held as a consecutive-failure
count and the moment a break ends: closed while readings answer, open for a fixed break once
enough consecutive readings have failed, and half open for exactly one trial when that break
expires, because the request that finds a break just expired would otherwise be all of them at
once. It is asked before every attempt rather than once per reading, so an open circuit stops
work already under way. A refusal counts as an answer, because the aggregator answered. A
ratio over a sampling window does not fit at this volume, which is why the published
libraries were not taken.

| default | value | what it rests on |
|---|---|---|
| attempts | 3 | at the 7% error rate measured under fan-out a third attempt leaves about one in 2,800 |
| first delay | 500 ms | one measured round trip, bracketed by a 335 ms mean at concurrency 24 and a 510 ms median over five sequential reads |
| failures before opening | 3 | a failed reading is already three attempts, so a trip is nine consecutive upstream failures, which at the measured rate is not the independent error rate under any reading |
| break | 5 s | the published default of Polly's circuit-breaker strategy, and longer than a whole measured search |

## Consequences

What the breaker counts is readings, so it bounds everything after the third failed one and
not the retries of readings already in flight. A fan-out whose readings all fail together
therefore spends its whole retry budget before the circuit can open; what the breaker saves is
the rest of a fan-out that fails progressively, and the next search.

A status the adapter has no reason for is worse than slow, and that follows from these two
policies rather than from anything else. A 403 is in no refusal table, so a refused read spends
three requests where a clean one spends one; three refused reads in a row then open the circuit
`theatersNear`, `showtimesFor` and `seatsFor` share, for five seconds at a time and re-armed by
every probe that meets another refusal, so while the Source goes on refusing the whole area
answers `unreachable` rather than only the reads it refused. That is why the sellability word in
[ADR 9](0009-no-upstream-word-crosses-the-boundary.md) is read at all, and why
[ADR 1](0001-single-aggregating-source.md) records a fan-out width this Source will not answer.

Backoff needs a timer and the import ban leaves Core none, so `wait` is injected beside `fetch`.
`now` and `random` are injected too rather than defaulted from the language, because a default
no test exercises is a mutant no test kills.
