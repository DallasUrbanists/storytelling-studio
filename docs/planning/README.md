# Four-day implementation plan

You can use this package to review an executable sequence for a local
geographic storytelling tool and a Maple Avenue pilot film. The schedule covers
Wednesday, November 11, through Saturday, November 14, 2026, in America/Chicago;
the dates are target checkpoints, not evidence that work is complete.

The starting repository contains planning documents only. The
[implementation status](../implementation-status.md) records what has actually
been inspected, and the [issue backlog](issue-backlog.md) contains
work items with dependencies and acceptance criteria.

- [Recommended route](#recommended-route)
- [Continuous execution](#continuous-execution)
- [Milestones and capacity](#milestones-and-capacity)
- [Plan decisions](#plan-decisions)
- [Approval boundary](#approval-boundary)
- [Maintain the plan](#maintain-the-plan)

## Recommended route

The implementation lead should read the following documents in sequence.

1. Read the [product specification](product-specification.md) and
   [system architecture](../architecture/system-architecture.md) to understand
   the local authoring, storage, and rendering boundaries.
2. Read [testing and gates](testing-and-gates.md) and
   [risks and critical path](risks-and-critical-path.md) before accepting the
   daily commitments.
3. Follow [Day 1](day-1-mvp.md), [Day 2](day-2-geographic-storytelling.md),
   [Day 3](day-3-research-production.md), and [Day 4](day-4-roadway-production.md)
   in dependency order.
4. Use the [Maple production plan](maple-production.md) for the pilot's narrative
   and evidence, and the [documentation plan](documentation-plan.md) for the
   maintained guides delivered with each feature.

The daily runbooks link to the full issue bodies. A coder can start an eligible
issue by reading its dependencies, expected files, ordered steps, acceptance
checks, documentation change, and stop condition without relying on chat history.

## Continuous execution

The backlog is designed for a persistent controller that dispatches eligible
Terra and Sol jobs into isolated Git worktrees, monitors their receipts, and
assigns the next job when a worker finishes. One merge coordinator integrates
PRs. Routine scheduling, GitHub polling, retries, and state recovery use
deterministic software rather than model calls.

Read the [controller contract](agent-controller.md),
[execution schedule](execution-schedule.md), and
[activation plan](orchestration-activation.md) before starting unattended work.
When an issue needs an owner decision, the controller posts a structured GitHub
question and continues independent work. A valid phone reply resumes the
affected work automatically when its dependencies and resource leases permit.

This package specifies the workflow; it does not implement or activate a
controller. Building a new controller requires explicit separate authorization
and must remain outside the application MVP. Verified controller readiness is
a prerequisite for claiming continuous unattended execution.

## Milestones and capacity

The proposed milestones build on the same saved project and shared evaluator.
Each milestone requires its predecessor's gates unless a specific issue is
explicitly independent.

| Date | Required checkpoint | Evidence |
| --- | --- | --- |
| November 11 | Local editor imports GeoJSON, edits camera/trace/labels, saves, and exports both dimensions | Deterministic bridge proof first; reopened project and two decoded videos |
| November 12 | Dallas → Oak Lawn → Maple sequence with flexible focus steps, verified transit, network walkshed, and portable exchange | Sources and visible layers survive save/export/import; no radius buffer presented as a walkshed |
| November 13 | One defensible research pipeline with partial overlap, provenance, review snapshots, and comparability gates | Reproducible population estimate or an explicit blocked result; history/income/imagery only when evidence permits |
| November 14 | Editable top-down existing/proposed roadway sequence and integrated pilot in both formats | Width/lock/segment tests, factual and rights clearance, and full playback review |

The 81 planned issues total 51.5 focused contributor-hours, including 3.5 hours
for conditional history/income/imagery branches; the first-film path totals
48 hours. A 25–40% integration/review allowance gives roughly 64–73 hours for
all planned work or 60–68 hours for the first-film path, before long source or
render waits; these estimates are not time already spent or a guarantee.
Controller evaluation, activation, and any separately authorized controller
development are additional; parallel automation does not remove serial
dependencies, human review, or source verification.
The [critical-path analysis](risks-and-critical-path.md#capacity-and-calendar)
explains the serial constraints and partial milestones.

The full four-day outcome needs roughly two experienced contributors with
overlapping availability, little interruption, and timely source clearance;
even two four-day, eight-hour schedules provide only 64 nominal hours. A single
contributor with four eight-hour days
should expect a narrower verified milestone; agents must report incomplete work
instead of declaring the full sprint complete. Parallel work must not begin
before its shared schema and integration contracts stabilize.

## Plan decisions

The plan adopts a Vue 3/Quasar editor, an isolated React/Remotion renderer,
MapLibre, a Node loopback service, SQLite metadata, local assets, and npm
workspaces. The portable format is a versioned `.gstory` archive containing the
editable project and permitted source assets; cloud accounts, paid APIs, and AI
are not core prerequisites.

The plan defers Electron packaging, DuckDB, generative AI, collaboration, and a
general routing engine. Day 2 prioritizes a verified imported 600-second network
walkshed, and Day 3 prioritizes one reproducible population method. The roadway
editor starts with dimension-aware top-down geometry and editable segment
layouts; perspective rendering is outside the sprint.

The owner should resolve any substantial departure from these decisions before
implementation. Exact dependency versions, measured roadway dimensions,
historical comparability, geographic source vintages, and per-asset rights are
verification gates, not facts supplied by this planning package.

## Approval boundary

The owner approved publication of the planning package and GitHub backlog.
The [implementation status](../implementation-status.md) records the
publication state, and the [backlog](issue-backlog.md) maps published identifiers.
Application implementation has not started and requires a later explicit
implementation kickoff or implementation session.

After that kickoff, ordinary branch, pull-request, passing-merge, and issue-closure
authority applies without repeated approval requests. Controller development and
activation require separate authorization, and the security, permissions,
licensing, and substantial-architecture boundaries in [AGENTS.md](../../AGENTS.md)
still apply.

## Maintain the plan

Each implementing contributor should supply the issue's actual evidence for
its PR. Under controller operation, the merge coordinator owns commits, pushes,
PR creation, and integration, and updates
[implementation status](../implementation-status.md) from that receipt in the
same PR before final checks, avoiding concurrent edits to the shared ledger.
The milestone owner should record slipped work, newly discovered dependencies,
and split identifiers at the 60-minute reassessment point.

Contributors should keep method details in the architecture and research guides,
test procedures in [testing and gates](testing-and-gates.md), and the durable
implementation queue in the issue bodies. The sprint runbooks should remain
short enough to show the next eligible action and the checkpoint's meaning.
