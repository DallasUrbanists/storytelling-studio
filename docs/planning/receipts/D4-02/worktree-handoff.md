# D4-02 width solver handoff

The D4-02 (#61) worker implemented a pure dimensional checker with explicit
edits in the assigned `task-61` worktree. The local receipt identifier is
`D4-02-20261113-task-61`; the dispatch supplied no separate durable attempt ID
or fencing token, so this identifier does not assert controller activation.

The branch is `orchestrator/github-issue-61`, based on
`aaf967dda41fdc225e34ae9bf536f8f1faff5463`. Changes remain uncommitted.
The baseline contains the D4-01 schema merge `aaf967d` and the D1-04 evaluator
commit `5cde41d`; the worker inspected their implementations and exercised their
tests with the solver. The operator supplied the isolated worktree and
`core-roadway` scope. The worker made no Git metadata or controller changes.

## Files and scope

The worker changed only these issue-specific paths:

- `packages/story-core/src/roadway.ts`
- `tests/roadway/width-solver.test.mjs`
- `docs/planning/receipts/D4-02/worktree-handoff.md`

The test uses the existing Node test runner's `.mjs` convention rather than
the planned `.ts` path, so the existing `test:core` glob discovers it without a
manifest change. The solver exports directly from its module; the shared
package index, manifests, architecture documents, and implementation ledger
remain coordinator-owned.

## Constraint equations and precision

The `solveRoadwayWidths(section, edits = [])` function accepts a
schema-validated `RoadwayCrossSection`. Each edit identifies a band and supplies
a complete replacement `RoadwayDimension`; the project parser remains
responsible for structural and provenance validation before persistence.
The solver validates physical numbers and conversion consistency, including
edits that have not yet been persisted.

The solver calculates the following quantities in saved meters, where `P`
contains between-curb bands, `B` contains all bands, `L` contains locked bands,
and `U` contains editable bands:

```text
allocated_pavement = sum(width[i] for i in P)
pavement_residual = curbToCurb.meters - allocated_pavement
illustrated_envelope = sum(width[i] for i in B)
envelope_residual = envelope.width.meters - illustrated_envelope
locked_total(S) = sum(width[i] for i in S intersect L)
editable_total(S) = sum(width[i] for i in S intersect U)
locked_residual(S) = available(S) - locked_total(S)
```

The solver checks pavement and, when declared, total-envelope residuals.
Each sidewalk remains outside the pavement sum. An unknown optional envelope
produces `envelope: null`; every represented band and the curb width still
require a known positive dimension.

The solver uses compensated summation without rounding or resizing any band.
The numerical balance tolerance is inclusive at `0.01 m`; comparison adds a
binary roundoff allowance of `4 * Number.EPSILON * scale`, where `scale` is the
largest available, allocated, or locked total for that constraint. Arithmetic
overflow or an allowance reaching `0.0001 m` produces `numeric-range` rather
than a feasible result with unreliable precision.

The solver retains original values, units, and evidence. Conversion consistency
uses `1 ft = 0.3048 m` and the schema's relative tolerance of
`1e-9 * max(1, meters)`; this conversion check is separate from the balance
tolerance. Display rounding is a caller concern and never enters the equations.
Neither tolerance asserts measurement accuracy or an engineering standard.

## Result and error semantics

The solver returns detached bands, pavement/envelope totals, signed residuals,
the tolerance, diagnostics, and a `feasible` or `infeasible` status. A positive
residual means unassigned space; a negative residual means over-allocation.
Unavailable or invalid dimensions produce null totals and residuals rather
than an inferred width. Known locked and editable subtotals remain available
independently when the other group has an unknown width.

The solver uses the following diagnostic codes:

| Code | Meaning |
| --- | --- |
| `invalid-width` | Original or normalized width is nonfinite, nonpositive, or inconsistent with its unit. |
| `unknown-width` | A required band or curb dimension is unknown. |
| `unknown-band` | An edit references no existing band. |
| `duplicate-edit` | A batch edits the same band more than once. |
| `locked-width` | An edit changes a locked physical width, including replacing a known value with unknown or the reverse. |
| `locked-overallocation` | Locked bands alone exceed an available width beyond tolerance. |
| `overallocated` | The allocated sum exceeds the available width beyond tolerance. |
| `unassigned` | Spare width exceeds tolerance and needs explicit author edits. |
| `numeric-range` | The total exceeds supported numerical precision or overflows. |

Each diagnostic identifies its constraint, affected band IDs, message, and
residual when meaningful. The caller retains the segment and section identity.
Feasibility requires all required dimensions and both applicable balance
constraints to pass. Spare width is infeasible for a balanced scene; the
solver never selects an allocation or silently compresses bands.

The solver rejects an entire edit batch if any edit has an invalid numeric
dimension, an unknown or duplicate target, or a lock conflict. Rejected batches
return original bands, `editsApplied: false`, and balances for those original
bands, with the rejection diagnostics still making the result infeasible.
An accepted batch can remain infeasible because its explicit dimensions do not
balance; the result makes that draft visible without persisting it.

The solver compares locked physical meters exactly, independently of the
balance tolerance. Equivalent-unit edits are no-ops for locked bands and
retain the entire original dimension; nonempty accepted batches set
`editsApplied: true`, even for no-ops. Zero width cannot remove a persisted
band, and evaluated animation entry/exit widths remain outside this API.

## Verification

The worker used Windows, Node `24.22.1`, and npm `11.19.1`.
The following checks completed:

- `node --test --test-isolation=none tests/roadway/width-solver.test.mjs tests/roadway/schema.test.mjs tests/core/*.test.mjs tests/project-schema/*.test.mjs`
  passed 104 tests, including 28 solver cases and an 80-layout mixed-unit sweep.
- `node ../task-7/node_modules/typescript/bin/tsc --noEmit --strict --module NodeNext --moduleResolution NodeNext --target ES2022 --allowImportingTsExtensions --skipLibCheck --typeRoots ../task-7/node_modules/@types packages/story-core/src/roadway.ts`
  passed using the existing adjacent compiler without emitting files.
- `node ../task-7/node_modules/eslint/bin/eslint.js --config ../task-7/eslint.config.mjs packages/story-core/src/roadway.ts`
  passed using the adjacent existing lint tool and configuration.
- `node scripts/check-docs.mjs` and `git diff --check` passed.

The worker also checked all three new files directly for trailing whitespace,
LF line endings, and final newlines, because unstaged new files do not appear
in `git diff --check`. The implementation source/test fingerprints are:

```text
SHA-256 packages/story-core/src/roadway.ts
e7a33dd42b1870fbc5fb5d78441e49912db29d64a98b9d2ebafaf6b9ddfa9ca3
SHA-256 tests/roadway/width-solver.test.mjs
a1b1141f97148f4576cb9e693512178b3a3067a793e88e155cd89d1fd4ed19f5
```

The normal `npm run test:core` discovered all four suites but could not spawn
test subprocesses (`EPERM`). The single-process command exercised those same
suites successfully. This worktree has no installed dependencies; the worker
did not install any or run the full workspace `npm run check`. The coordinator
should run the normal integrated commands in an equipped environment.
The unrelated untracked `.orchestrator-temp-JgI8gf/` directory appeared in
worktree status during verification; the worker left it untouched.

## Remaining work and coordinator documentation

The coordinator should review this diff, incorporate the equations and error
semantics into the roadway architecture document, update shared status with
accepted evidence, and record the final commit. This receipt is a self-check,
not an independent review or integration approval.

The solver does not implement an optimizer, UI, roadway geometry, station
transitions, animation mappings, persistence, or engineering verification.
Actual roadway dimensions and rights remain separate evidence requirements.
D4-03 is the next verification issue after D4-02 acceptance and merge; D4-04
and D4-07 also depend on accepted solver behavior. This local handoff releases
no dependent work by itself.
