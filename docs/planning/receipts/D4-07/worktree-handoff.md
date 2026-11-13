# D4-07 longitudinal segments handoff

The D4-07 (#66) worker implemented and verified segment layout references,
longitudinal transition constraints, and absolute-station evaluation locally.
The local receipt identifier is `D4-07-20261113-task-66`; the dispatch supplied
no separate durable attempt ID or fencing token. This receipt does not assert
controller activation or independent review.

The assigned branch is `orchestrator/github-issue-66`, based on
`2c7ac57239aa22bfceeb501b2d9dfd14cb853412`. The baseline contains D4-02's
merged solver, through merge commit `2c7ac57` and implementation commit
`344f483`. The worker inspected the solver, schema, and prerequisite receipts
and exercised their tests. Changes remain uncommitted. The worker made no Git
metadata, controller, credential, publication, or permission changes.

## Files and write scope

The operator supplied the isolated worktree and the `core-roadway` and
`schema-root` scopes. This attempt's concrete write paths are:

- `packages/story-core/src/roadway.ts`
- `packages/project-schema/src/project.ts`
- `packages/project-schema/src/validation.ts`
- `tests/roadway/segments.test.mjs`
- `docs/planning/receipts/D4-07/worktree-handoff.md`

The parser change is necessary to validate and persist the added schema fields.
The test follows the existing Node runner's `.mjs`
convention and is discovered by the existing `test:core` glob. No manifest or
dependency changes are needed. The module exports the evaluator and validator
directly, as D4-02 does for its solver. Shared architecture, status, and planning
documents remain coordinator-owned; the following semantics are the proposed
coordinator documentation update.

## Layout references and dimensional evidence

The optional `Roadway.layouts` collection contains `{ id, section }` records.
IDs are stable within a roadway, and `section` is a complete
`RoadwayCrossSection`. A segment's `existing` and `proposed` fields accept
either the original inline cross-section or `{ layoutId }`. A reference must
resolve within that roadway to a section with the corresponding role. Mixed
inline/reference fields, duplicate IDs, missing references, and unexpected
fields fail project parsing. Both inline and referenced layouts survive JSON
serialization and parsing without losing their evidence.

Each selected section retains its own curb width, envelope classification,
original units, band widths, locks, sources, and provenance. A layout can be
reused intentionally, but the evaluator has no corridor-wide width and does
not copy or resize a neighboring segment's bands. Existing/proposed roles
do not establish evidence quality. All tests are synthetic and establish no
actual roadway measurements or source approvals.

The `validateRoadwaySegments(road)` function checks every segment's existing
and proposed endpoint sections independently with `solveRoadwayWidths`.
Failures identify the segment, role, endpoint, and original solver diagnostics,
including band IDs and signed residuals. The solver's inclusive `0.01 m`
numerical tolerance and binary roundoff allowance apply independently to
each section; they are not measurement accuracy claims. Unknown optional
envelopes remain unknown, while unknown required widths prevent evaluation.

The project parser validates structure and provenance but continues to permit
dimensionally infeasible drafts. The core validator reports those constraints;
the station evaluator returns `invalid` if any segment or endpoint fails.
Callers must parse before evaluation or persistence: the core validator is not
a substitute for structural and source-reference validation.

## Exact station ownership and gaps

Stations are absolute meters increasing from the saved origin along the pinned
corridor revision. The extent remains authored, as in D4-01; this slice does
not derive physical stationing from geographic coordinates.

Each positive-length segment owns `[startMeters, endMeters)`. A segment ending
exactly at `stationExtentMeters` also owns that terminal point. At an adjacent
boundary, the segment starting there owns the station, with no station epsilon
or rounding. A layout or topology change at a segment break is allowed and
remains abrupt; renderers must show a boundary or label. Evaluation returns
`atSegmentStart` and the segment ID/name to support that future presentation.

Segment ranges must be finite, authored in increasing nonoverlapping order,
and within `[0, stationExtentMeters]`. Reversed, zero-length, overlapping,
unordered, negative, and out-of-extent ranges are invalid; evaluation neither
sorts nor repairs them. Structural range failures produce no inferred gaps.

Leading, interior, trailing, and entirely empty coverage is allowed. The
validator returns explicit gap ranges, and `evaluateRoadwayStation` returns
`unspecified` within them. Callers must label such coverage **Unspecified**.
An interior segment end with no adjacent successor is unspecified, and the
corridor's terminal station is unspecified when no segment reaches it. A gap
end belongs to a segment starting there; only a trailing gap includes the
corridor's terminal station. Negative, beyond-extent, and nonfinite station
queries return `outside`. No extrapolation or neighboring layout fills a gap.

## Longitudinal transition zones

A segment with `transition: { existingLayoutId, proposedLayoutId }` is a named
longitudinal transition zone. The segment name identifies the zone and its
positive-length station range defines the interpolation interval. Its ordinary
existing/proposed section is the start endpoint, and the corresponding
transition reference supplies the end endpoint for that role. Both endpoint
references are required and checked. This is station interpolation, distinct
from the future frame-based existing-to-proposed reallocation mapping.

For station `s` in a transition `[a, b]`, progress is `(s - a) / (b - a)` and
each ordered band width is `(1 - progress) * startWidth + progress * endWidth`.
The evaluator returns exact endpoint widths at progress zero and one. Its
result retains detached complete start/end sections as evidence, their layout
IDs, evaluated numeric meters, and each start/end band ID. Intermediate meters
do not become documented measurements or overwrite saved dimensions. Band
metadata and the primary band ID come from the start section; `endBandId`
identifies the corresponding end band.

The endpoints must have matching ordered band kinds, directions, and curb
placement. Curb widths and declared envelope widths must match exactly in
saved meters, and envelope classifications must agree. Both endpoints must
independently pass the width solver. An unknown optional envelope can remain
unknown at both ends. A band locked at either endpoint must retain exactly the
same physical width; equivalent original units do not alter that rule. Layout
and band IDs need not match when their explicit ordered correspondence is
compatible. Incompatible topology, envelopes, or locks produce diagnostics
instead of an inferred taper or width distribution.

A following segment owns a shared transition-end station under the ordinary
ownership rule; its layout may intentionally introduce an abrupt break. The
transition end section remains saved and validated even when the following
segment owns that exact query station. A transition reaching the corridor's
terminal station exposes its exact end state there.

## Verification

The worker used Windows and Node `24.22.1`. The following checks passed:

- `node --test --test-isolation=none tests/roadway/*.test.mjs tests/core/*.test.mjs tests/project-schema/*.test.mjs`:
  140 tests passed, including 36 new segment cases and all D4-02 solver tests.
- `node ../task-7/node_modules/typescript/bin/tsc --noEmit --strict --module NodeNext --moduleResolution NodeNext --target ES2022 --allowImportingTsExtensions --skipLibCheck --typeRoots ../task-7/node_modules/@types packages/story-core/src/roadway.ts packages/project-schema/src/project.ts packages/project-schema/src/validation.ts`:
  strict TypeScript checking passed using the adjacent existing compiler.
- `node ../task-7/node_modules/eslint/bin/eslint.js --config ../task-7/eslint.config.mjs packages/story-core/src/roadway.ts packages/project-schema/src/project.ts packages/project-schema/src/validation.ts`:
  lint passed using the adjacent existing tools and equivalent configuration.

The default Node test runner failed to spawn test subprocesses with `EPERM`;
the single-process invocation above passed the relevant suites. Lint with the
local configuration could not resolve `@eslint/js` because this worktree has
no installed dependencies; the adjacent configuration resolved them. The
worker installed no dependencies and did not run the full workspace
`npm run check`. `test:roadway` is not defined in this baseline and was not
claimed as available. `node scripts/check-docs.mjs` passed, checking local links
in 57 Markdown files, and `git diff --check` passed. Direct checks of all five
changed/new files also passed for trailing whitespace and final newlines.
An unrelated untracked `.orchestrator-temp-ILts0M/` directory appeared during
verification and was left untouched.

## Remaining work and next issue

This slice supplies no editor, rendering adapter, road-relative lateral
coordinates, map offsets, tapers, turning paths, driveways, signal layouts,
or intersection geometry. Named segments can describe intersection influence
areas, but their width tables cannot establish intersection geometry or
engineering validity. Automatic geographic revision migration, physical
extent verification, actual dimension review, and video/persistence/package
integration remain separate work.

The coordinator should incorporate the reviewed semantics into roadway-editor
and project-format, update shared implementation status with accepted evidence,
and record the final integration commit. D4-08 depends additionally on D4-06;
D4-09 depends additionally on D4-04. They become eligible only when all their
prerequisites are accepted and merged. This local receipt releases no dependent
work by itself. No human decision or unresolved implementation blocker remains.

