# Day 1: prove the local editor and both exports

On Wednesday, November 11, 2026, the implementation team targets a local Quasar
editor that imports GeoJSON, edits geographic focus, traces routes and polygon
boundaries, animates labels, saves locally, and exports portrait and landscape
videos. The Vue-to-Remotion deterministic bridge must pass before broad editor
work begins.

- [Starting conditions](#starting-conditions)
- [Controller execution](#controller-execution)
- [Inputs and working areas](#inputs-and-working-areas)
- [Execute the bounded issues](#execute-the-bounded-issues)
- [Run the acceptance procedure](#run-the-acceptance-procedure)
- [Stop and hand off](#stop-and-hand-off)

## Starting conditions

The planning-only repository has no application, package commands, or tests.
The user must first approve documentation/backlog publication, P01–P03 must
finish, and a later explicit implementation kickoff must occur before this
runbook starts. [AGENTS.md](../../AGENTS.md) and the
[model policy](../policies/model-routing-policy.md) govern the work.

The 20 [Day 1 issue bodies](issues-day-1.md) total 810 target minutes, or 13.5
focused contributor-hours before additional review, integration, or render
waits. This is a stretch calendar checkpoint, especially for one contributor;
the team must preserve Gate B even when that reduces the day's completed scope.

## Controller execution

After the later implementation kickoff and
[controller activation](orchestration-activation.md), the controller uses the
[81-row schedule](execution-schedule.md) to dispatch at most two isolated Terra
or Sol workers, including AI reviews. D1-06 and D1-07 can run together once their
shared prerequisites are accepted; D2-00 can stage external GIS inputs alongside
bootstrap, and independent source or roadway tasks do not wait for a day label.

The empty repository starts in explicit `supervised-bootstrap` mode: the single
coordinator supervises initial integrations through D1-20 without asking the
owner to approve every ordinary pull request. Unattended merging requires the
actual target's verified CI/protection/current-base guards; no worker merges or
receives GitHub mutation credentials.

The controller persists attempts and scoped GitHub questions; a security or
license question holds only its affected work and dependency closure. Other
eligible work continues, and a valid bound answer triggers automatic resumption
without spending AI tokens on polling or queue selection.

## Inputs and working areas

The implementer should use the [system architecture](../architecture/system-architecture.md),
[project format](../architecture/project-format.md),
[rendering contract](../architecture/rendering-contract.md), and
[design system](../design/design-system.md) as the bounded specification.
The first proof uses only a clearly synthetic 10-second project with local
cleared assets and fonts, 300 frames at 30 frames per second, and both variants.

The expected work areas are `apps/studio`, `apps/local-service`,
`apps/renderer`, the three shared packages, `scripts`, and `tests`; these paths
are future implementation targets. Node 24.22.1 and npm 11.19.1 were observed
locally, but D1-01 still must pin and verify the full compatible toolchain and
media-inspection binary before any success claim.

## Execute the bounded issues

The implementation lead should assign Terra for the fixed setup and routine
controls and Sol for frame math, readiness, rendering, persistence, and security
boundaries. Each issue's full body supplies exact dependencies, expected files,
steps, tests, documentation changes, and its specific stop condition.

| Order | Issues | Result needed before continuing |
| --- | --- | --- |
| Bootstrap | D1-01, D1-02 | Pinned npm workspace; verified local lifecycle and static-check commands |
| Shared contract | D1-03, D1-04, D1-05 | Versioned fixture, pure frame state, camera/trace/animated-label math, and explicit MapLibre readiness |
| Two hosts | D1-06 and D1-07 | Vue and Remotion mount the same shared evaluator and adapter |
| Prove exports | D1-08, D1-09 | Both decoded videos and ordered/repeated/shuffled parity evidence; Gate B passes |
| Authoring | D1-10 through D1-14 | Minimal shell, validated GeoJSON, camera, line/boundary tracing, and animated callout labels |
| Local persistence | D1-15 through D1-17 | Reviewed loopback boundary, immutable SQLite revisions, conflict-safe save/open |
| Export workflow | D1-18, D1-19 | Cancellable saved-revision jobs and working UI in both formats |
| Close checkpoint | D1-20 | Gates A–C evidence, actual guides, and required-check workflow |

D1-15/D1-16 can overlap the rendering lane once their listed schema inputs are
stable; they do not justify expanding editor features before Gate B. If a
separate source contributor is available, D2-00 and D2-04 can stage the external
GIS inputs and verify geography during Day 1, because acquiring the real
walkshed inputs must not be assumed to happen instantly on Day 2.

The implementing agent must reassess at 60 minutes on any issue, record what
passed, and split the remaining work before continuing. A failed render proof
must produce a minimal reproduction and a revised forecast, not a large editor
whose export path remains unproven.

## Run the acceptance procedure

Only after their introducing issues verify the scripts, the implementer should
follow the [session lifecycle and command contracts](testing-and-gates.md).
From the repository root, the available commands should be run in this order.

```sh
npm run check
npm run test:core
npm run test:render-contract
npm run render:fixture
npm run test:smoke
```

The gate owner should complete Gates A, B, and C in
[testing and gates](testing-and-gates.md), including the following real flow.

1. Import the valid synthetic GeoJSON, edit a focus transition, animate a line
   and polygon boundary, and add a timed callout with dot, leader line, and casing.
2. Adjust portrait and landscape label/framing overrides, save the project, stop
   the service, and reopen the saved revision.
3. Export 1080 × 1920 and 1920 × 1080 videos at 30 frames per second, decode
   them, and compare their receipts with the saved revision.
4. Exercise an invalid geometry, stale save, missing asset, canceled render, and
   interrupted save without losing the last complete project.

The expected evidence includes the saved revision and asset hashes, test results,
environment and readiness receipts, frame comparisons, two decoded videos, and
a short keyboard/visual walkthrough. The team must not substitute screenshot
appearance for persistence or output validation.

## Stop and hand off

The milestone is complete only when the editor flow and both exports pass the
required gates. If the bridge alone passes, the correct handoff is a verified
render proof; if export fails, the next day's feature work cannot declare a
successful minimum viable product.

The worker should save the project, follow the documented shutdown procedure,
and submit its issue-specific receipt with actual evidence, gate results,
blockers, and proposed documentation changes. The coordinator updates
[implementation status](../implementation-status.md) in the same reviewed pull
request; the receipt must name pending security/license decisions and preserve
the exact failing fixture when a gate does not pass.
