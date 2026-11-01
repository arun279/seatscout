# 21. A merge publishes a preview, not a release

Date: 2026-10-09

## Status

Accepted. It records the reasons that until now lived in `CONTRIBUTING.md`, unchanged.

## Context

Each slice of the app has to be seen on a phone as it lands, not only in a test. A release is
a different thing: a version the owner chooses to cut. Publishing on every merge must not become
the way a release happens by accident.

## Decision

**A merge to `main` publishes an EAS Update to the `preview` channel.**
`.github/workflows/preview.yml` runs when a merge changes `apps/native`, anything under
`packages/`, or what the install resolves. The `preview` channel is the one the phones follow.
`--environment` names which of EAS's own environments the publish reads variables from, and
`eas update` has required it since SDK 55.

**When no build can run that update, the workflow starts one.** An update reaches only a build
with its runtime version, so a merge that changes the native side would otherwise leave the phones
on the last update they can run, with nothing to say so. After publishing, the workflow asks EAS
for a `preview` build on each platform's runtime. If there is none, not counting builds that failed
or were cancelled, it starts one and opens an issue labelled `install` with the link. A build is
still a preview: the workflow never submits anything to a store.

**`eas-cli` runs through `npx` at a version the workflow pins, not from the workspace.** It is a
publisher, not a dependency of anything this repository builds. In the lockfile it would be
installed by every job that installs at all, and an advisory against a tool one job runs would
stand in the way of every merge. The version is a literal in the workflow, so a reviewer sees it
move.

**It publishes with the repository secret `EXPO_TOKEN`.** That is a robot user holding the
developer role on the account `apps/native/app.json` names as the owner. Without a token, or with
one the account refuses, the job fails and says which, because an app that has quietly stopped
reaching the phones is not a step to skip.

**The run's summary says, for each platform, that its runtime has a build or which build was
started.**

## Consequences

Every merge that touches the app reaches the phones within the job's run, and a failed publish
is a red run on `main` rather than a silence. Cutting a release stays a separate, deliberate
step that this workflow never takes.
