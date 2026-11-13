# Synthetic roadway constraint cases

Contributors can use these cases to check dimensional arithmetic independently
of the width solver. Every value is invented and carries `assumed` evidence.
These fixtures contain no Maple measurements, surveyed geography, design
recommendations, legal right-of-way claim, or engineering approval.

## Run the checks

From the repository root with the pinned Node toolchain, contributors can run
`npm run test:roadway`. The command includes schema, solver and independent
constraint tests; `npm run check` also invokes it. The runner uses one process
so the suite works on hosts that restrict child test processes. Node strips the
TypeScript types without requiring a build or additional test dependency.

## Independent arithmetic

The [fixture module](constraint-cases.ts) contains literal inputs and expected
totals. Its dimension helper assigns values without converting units. The
[constraint tests](../../roadway/constraints.test.ts) compare solver output with
those constants; expected values never call the solver or its summation helper.

| Case | Hand calculation | Expected pavement / envelope residual |
| --- | --- | --- |
| Four through lanes | 4 × 3.6 = 14.4 m; sidewalks add 2 × 2.4 = 4.8 m; envelope 19.2 m | 0 / 0 m |
| Proposed concept | 2 × 1.8 bicycle + 2 × 0.9 buffer + 2 × 3 through + 3 center turn = 14.4 m; sidewalks add 4.8 m | 0 / 0 m |
| Mixed units | 6 + 3 + 10 + 10 + 10 + 3 + 6 = 48 ft = 14.6304 m; sidewalks add 16 ft = 4.8768 m; envelope 64 ft = 19.5072 m | 0 / 0 m |
| Overfull | Same proposed bands in 14 m pavement and 18.8 m envelope | −0.4 / −0.4 m |
| Unassigned | Same proposed bands in 15.4 m pavement and 20.2 m envelope | +1 / +1 m |
| Outside discrepancy | Same proposed bands, 14.4 m pavement, 19 m envelope | 0 / −0.2 m |
| Impossible locks | Same proposed bands in 2.8 m pavement and 7.6 m envelope | −11.6 / −11.6 m |

The existing layout locks one 3.6 m lane and both sidewalks: pavement locked
3.6 m, envelope locked 8.4 m, editable 10.8 m in both constraints. The proposed
layout locks the 3 m center turn lane and both sidewalks: pavement locked 3 m,
envelope locked 7.8 m, editable 11.4 m. Impossible locks exceed each available
dimension by 0.2 m before any editable width is considered.

The mixed-unit layout locks the 10 ft center turn lane and left 8 ft sidewalk:
pavement locked 3.048 m and editable 11.5824 m; envelope locked 5.4864 m and
editable 14.0208 m. The exact conversion is 1 ft = 0.3048 m. Selected bands use
meters to ensure the case exercises both units together.

The suite checks accepted and rejected edit batches, preserves every locked
band, and restores full original state after bicycle, center-turn and sidewalk
lock/unlock/edit sequences. It checks repeated equivalent-unit edits, rejects
an inconsistent foot conversion, and checks inclusive ±0.01 m balance limits
against ±0.0101 m failures. Arithmetic assertions use a fixed 1e-12 m allowance
for binary roundoff; this is separate from the solver's 0.01 m balance tolerance.

## Required dimensional evidence

Passing these tests establishes arithmetic behavior for a schematic concept.
It does not establish an approved engineered design, accessible clear widths,
surveyed placement, or real existing conditions. The envelope is illustrated
space and sidewalks remain outside the pavement sum.

For actual dimensions, contributors should record the original value and unit,
normalized meters, documented or estimated classification, source, date,
location, method, uncertainty, and reviewer. Assumed proposal values need an
explicit rationale and concept label; unknown dimensions must remain unknown.
The [roadway contract](../../../docs/architecture/roadway-editor.md#dimension-evidence)
defines these requirements. Numerical balance supplies no measurement accuracy
or professional approval. Geometry, segment interpolation, animation, rendered
output and real dimension review require their later issue-specific evidence.
