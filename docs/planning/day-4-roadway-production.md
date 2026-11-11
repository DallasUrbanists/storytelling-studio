# Day 4: animate the roadway proposal and finish the pilot

On Saturday, November 14, 2026, the implementation team targets an editable,
dimension-aware top-down roadway sequence and a complete Maple pilot in both
required video formats. The roadway sequence must visibly reallocate a mapped
four-lane layout into two through lanes plus a center-turn lane with the planned
bicycle space, buffers, sidewalks, locks, and varying segment layouts.

- [Starting conditions](#starting-conditions)
- [Controller execution](#controller-execution)
- [Inputs and dimensional evidence](#inputs-and-dimensional-evidence)
- [Execute the bounded issues](#execute-the-bounded-issues)
- [Run the acceptance procedure](#run-the-acceptance-procedure)
- [Stop and hand off](#stop-and-hand-off)

## Starting conditions

The independent synthetic roadway schema and solver can begin after the listed
Day 1 schema/core issues. The real integrated film requires verified geographic
layers and walkshed, an approved first population result, portable exchange,
and the saved-revision render bridge; conditional history, imagery, and optional
income must remain separate from those required inputs.

The 22 [Day 4 issue bodies](issues-day-4.md) total 855 target minutes, or 14.25
focused contributor-hours before extra review and full-render waits. The lead
should begin independent roadway slices earlier if authorized capacity permits
and reserve time for full playback, corrections, and package reopening.

## Controller execution

The activated controller can start independent roadway schema and solver issues
from their listed Day 1 inputs, following [the execution schedule](execution-schedule.md).
The same `core-roadway` or `map-svg` writers must hold exclusive leases, while
separate core modules, controls, source preparation, and reviewed documentation
receipts can proceed independently in isolated worktrees.

Production authors must hold the `pilot-project` lease and propose a saved
revision from a private copy; only the coordinator promotes the accepted
canonical film. Final factual/rights questions bind the exact revision and
source hashes, and the required exports wait for that answer while unrelated
eligible work continues.

The single coordinator integrates one final checked head at a time and closes
only accepted issues. Routine scheduling, retry timers, GitHub polling, and
automatic resumption consume no model tokens; substantive review or repair
uses a recorded Terra or Sol slot.

## Inputs and dimensional evidence

The implementer should follow [roadway editor](../architecture/roadway-editor.md)
and [the Maple production plan](maple-production.md). Synthetic dimensions test
the tool; actual Maple dimensions require documented measurements or clearly
labeled estimates with source, date, method, uncertainty, and reviewer.

The top-down editor must retain a fixed declared envelope, nonnegative widths,
width locks, stable band IDs, and per-segment layouts. The initial animation
uses a declared four-to-three mapping with appearing/disappearing band slots,
absolute-frame width interpolation, cumulative boundaries, and marking/label
transitions; it is not an unbounded automatic design or engineering solver.

The film must label the proposal as a concept and distinguish documented,
estimated, and proposed dimensions. The team must not infer surveyed roadway
widths, accessible design compliance, or official approval from a generic preset
or an aerial image.

## Execute the bounded issues

The lead should use Terra for the schema, known-contract controls, and production
assembly; Sol owns dimensional constraints, varied geometry, mapped animation,
renderer parity, and evidence interpretation.

| Lane/order | Issues | Result |
| --- | --- | --- |
| Early independent core | D4-01 through D4-03 | Typed roadway schema, width solver, lock/infeasibility tests |
| Editable top-down view | D4-04 through D4-06 | Scaled bands, four/three-lane concept presets, dimensions and locks |
| Variable roadway | D4-07 through D4-09 | Longitudinal segments, distinct layouts, and dimensionally traceable geometry |
| Actual lane reallocation | D4-10, D4-11 | Explicit mapped transition with width conservation and editable timing |
| Evidence and saved state | D4-12 through D4-14 | Dimension provenance, real segment review, persistence and package coverage |
| Renderer and pilot roadway | D4-15, D4-16 | Shared deterministic output and the reviewed Maple concept sequence |
| Full-story assembly | D4-17, D4-18 | Geographic/research/roadway narrative, captions, credits, and variant framing |
| Final acceptance | D4-19 through D4-22 | Human factual/rights review, both decoded videos, full playback, editable package, and accurate delivery record |

The lead must preserve the explicit mapped reallocation requirement. A wipe,
dissolve, or static before/after comparison is a useful partial fallback if the
animation fails, but cannot be described as a completed lane-reallocation
feature or the full requested roadway deliverable.

## Run the acceptance procedure

After the relevant issues implement and verify their commands, the gate owner
should run the available checks from the repository root.

```sh
npm run check
npm run test:roadway
npm run test:research
npm run test:package
npm run test:render-contract
npm run test:smoke
```

The gate owner should then complete the final production walkthrough.

1. Build existing and proposed layouts with bicycle space, buffers, sidewalks,
   and the center-turn lane, then inspect the total envelope and width locks.
2. Apply at least two varying segment layouts and verify their ranges, evidence,
   conservation, and boundary behavior.
3. Inspect all synthetic transition frames for finite nonnegative widths,
   conserved curb width, correct endpoints, stable band order, and timed labels.
4. Save and reopen the real integrated film revision, then obtain the designated
   human review of its included facts, dimensions, and asset rights.
5. Render and decode 1080 × 1920 and 1920 × 1080 outputs at 30 frames per second
   from that exact revision, and watch both complete videos.
6. Export the cleared `.gstory` project, import it into a clean data root, and
   confirm focus, layers, research snapshots, roadway dimensions, and timings
   remain editable.

Gate F requires actual video metadata, revision/asset/source hashes, dimensional
and frame tests, the human review record, full-playback findings, and the
reopened package receipt. The gate does not require unsupported conditional
history, unavailable conditional imagery, or optional income in the first film;
their inclusion or omission must be documented accurately.

## Stop and hand off

The final milestone remains incomplete if required geography, the network
walkshed, population approval, dimension-aware mapped reallocation, either video
format, full playback, or portable editing fails. A polished partial cut should
be retained and named precisely, with the unfinished requirement still open.

The worker should stop its own services and submit accepted artifact locations,
hashes, actual tests, source/review records, limitations, and remaining issues in
its receipt. The coordinator updates [implementation status](../implementation-status.md)
and the final handoff in the same reviewed change, links both videos and the
editable project, and closes only merged, verified work; local delivery does
not imply publication to a public video service.
